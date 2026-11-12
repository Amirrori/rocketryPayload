#!/usr/bin/env python3
import argparse
import os
import signal
import sys
import threading
import time
from pathlib import Path

import board
import busio
import serial
import adafruit_tca9548a
from adafruit_bme280 import basic as adafruit_bme280


FIELD_KEYS = [
    "B1",
    "B2",
    "B3",
    "B4",
    "T1",
    "T2",
    "T3",
    "H1",
    "H2",
    "H3",
    "M",
    "A",
    "X",
    "Y",
    "Z",
    "GPS_SATS_USE",
    "GPS_SATS_VIEW",
]

running = True


def stop(_signum, _frame):
    global running
    running = False


def parse_channels(raw):
    channels = []

    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        channels.append(int(item, 0))

    return channels


def format_number(value, places=2):
    if value is None:
        return "ERR"

    return f"{value:.{places}f}"


def average(values):
    usable = [value for value in values if value is not None]
    if not usable:
        return None

    return sum(usable) / len(usable)


def parse_nmea_degrees(value, hemisphere):
    if not value or not hemisphere:
        return None

    try:
        raw = float(value)
    except ValueError:
        return None

    degrees = int(raw // 100)
    minutes = raw - (degrees * 100)
    decimal = degrees + minutes / 60.0

    if hemisphere in ("S", "W"):
        decimal *= -1

    return decimal


def valid_nmea_checksum(sentence):
    if not sentence.startswith("$") or "*" not in sentence:
        return False

    body, checksum = sentence[1:].split("*", 1)
    calculated = 0

    for char in body:
        calculated ^= ord(char)

    try:
        expected = int(checksum[:2], 16)
    except ValueError:
        return False

    return calculated == expected


class GpsReader:
    def __init__(self, port, baud):
        self.port = port
        self.baud = baud
        self.latest = {
            "lat": None,
            "lon": None,
            "altitude_m": None,
            "satellites_in_use": None,
            "satellites_in_view": None,
            "fix_status": "NO DATA",
            "updated_at": None,
        }
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self.run, daemon=True)

    def start(self):
        self.thread.start()

    def snapshot(self):
        with self.lock:
            return dict(self.latest)

    def update(self, **values):
        values["updated_at"] = time.time()
        with self.lock:
            self.latest.update({key: value for key, value in values.items() if value is not None})
            self.latest["updated_at"] = values["updated_at"]

    @staticmethod
    def fix_label(fix_quality):
        labels = {
            "0": "NO FIX",
            "1": "GPS FIX",
            "2": "DGPS FIX",
            "4": "RTK FIXED",
            "5": "RTK FLOAT",
            "6": "DEAD RECKONING",
        }
        return labels.get(fix_quality, f"FIX {fix_quality}" if fix_quality else "UNKNOWN")

    def handle_sentence(self, sentence):
        if not valid_nmea_checksum(sentence):
            return

        parts = sentence.split("*", 1)[0].split(",")
        message = parts[0][-3:]

        if message == "GGA" and len(parts) >= 10:
            fix_quality = parts[6]
            lat = parse_nmea_degrees(parts[2], parts[3])
            lon = parse_nmea_degrees(parts[4], parts[5])
            satellites_in_use = int(parts[7]) if parts[7].isdigit() else None

            if fix_quality == "0":
                self.update(satellites_in_use=satellites_in_use, fix_status="NO FIX")
                return

            try:
                altitude_m = float(parts[9]) if parts[9] else None
            except ValueError:
                altitude_m = None

            self.update(
                lat=lat,
                lon=lon,
                altitude_m=altitude_m,
                satellites_in_use=satellites_in_use,
                fix_status=self.fix_label(fix_quality),
            )

        elif message == "RMC" and len(parts) >= 7:
            if parts[2] != "A":
                self.update(fix_status="NO FIX")
                return

            lat = parse_nmea_degrees(parts[3], parts[4])
            lon = parse_nmea_degrees(parts[5], parts[6])
            self.update(lat=lat, lon=lon, fix_status="GPS FIX")

        elif message == "GSV" and len(parts) >= 4:
            try:
                satellites_in_view = int(parts[3]) if parts[3] else None
            except ValueError:
                satellites_in_view = None

            self.update(satellites_in_view=satellites_in_view)

    def run(self):
        while running:
            try:
                with serial.Serial(self.port, self.baud, timeout=1) as gps:
                    print(f"GPS reader listening on {self.port} at {self.baud} baud", flush=True)

                    while running:
                        raw = gps.readline()
                        if not raw:
                            continue

                        sentence = raw.decode("ascii", errors="ignore").strip()
                        if sentence.startswith("$"):
                            self.handle_sentence(sentence)
            except Exception as exc:
                print(f"GPS reader unavailable on {self.port}: {exc}", flush=True)
                time.sleep(2)


def open_sensors(channels, tca_address, bme_address):
    i2c = busio.I2C(board.SCL, board.SDA)
    tca = adafruit_tca9548a.TCA9548A(i2c, address=tca_address)
    sensors = []

    for channel in channels:
        try:
            sensor = adafruit_bme280.Adafruit_BME280_I2C(
                tca[channel],
                address=bme_address,
            )
            sensor.sea_level_pressure = 1013.25
            sensors.append((channel, sensor, None))
            print(f"channel {channel}: BME280 ready at 0x{bme_address:02x}", flush=True)
        except Exception as exc:
            sensors.append((channel, None, str(exc)))
            print(f"channel {channel}: BME280 unavailable: {exc}", flush=True)

    return sensors


def read_sensor(sensor):
    if sensor is None:
        return None, None, None

    try:
        pressure_pa = sensor.pressure * 100.0
        temperature_c = sensor.temperature
        humidity_percent = sensor.humidity
        return pressure_pa, temperature_c, humidity_percent
    except Exception as exc:
        print(f"sensor read failed: {exc}", flush=True)
        return None, None, None


def format_optional_number(value, places=6):
    if value is None:
        return ""

    return f"{value:.{places}f}"


def build_row(device_id, sensors, sequence, gps):
    pressures = []
    temperatures = []
    humidities = []

    for _channel, sensor, _error in sensors[:3]:
        pressure, temperature, humidity = read_sensor(sensor)
        pressures.append(pressure)
        temperatures.append(temperature)
        humidities.append(humidity)

    while len(pressures) < 3:
        pressures.append(None)
    while len(temperatures) < 3:
        temperatures.append(None)
    while len(humidities) < 3:
        humidities.append(None)

    gps_snapshot = gps.snapshot() if gps else {}
    values = [
        format_number(pressures[0]),
        format_number(pressures[1]),
        format_number(pressures[2]),
        format_number(average(pressures)),
        format_number(temperatures[0]),
        format_number(temperatures[1]),
        format_number(temperatures[2]),
        format_number(humidities[0]),
        format_number(humidities[1]),
        format_number(humidities[2]),
        str(sequence),
        format_optional_number(gps_snapshot.get("altitude_m"), 2),
        format_optional_number(gps_snapshot.get("lat"), 6),
        format_optional_number(gps_snapshot.get("lon"), 6),
        gps_snapshot.get("fix_status") or "NO DATA",
        str(gps_snapshot.get("satellites_in_use")) if gps_snapshot.get("satellites_in_use") is not None else "",
        str(gps_snapshot.get("satellites_in_view")) if gps_snapshot.get("satellites_in_view") is not None else "",
    ]

    timestamp = time.strftime("%H:%M:%S")
    return ",".join([device_id, timestamp, *FIELD_KEYS, *values])


def append_row(output_path, row):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("a", encoding="utf-8") as handle:
        handle.write(row + "\n")
        handle.flush()
        os.fsync(handle.fileno())


def main():
    parser = argparse.ArgumentParser(description="Log payload BME280 telemetry rows.")
    parser.add_argument(
        "--file",
        default="/home/uhrkpay/docker/webserver/data/lora.txt",
        help="CSV telemetry file consumed by the payload webserver.",
    )
    parser.add_argument("--device-id", default="PAYLOAD")
    parser.add_argument("--channels", default="0,1,2")
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--tca-address", type=lambda value: int(value, 0), default=0x70)
    parser.add_argument("--bme-address", type=lambda value: int(value, 0), default=0x76)
    parser.add_argument("--gps-port", default="/dev/serial0")
    parser.add_argument("--gps-baud", type=int, default=9600)
    parser.add_argument("--disable-gps", action="store_true")
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    output_path = Path(args.file)
    channels = parse_channels(args.channels)
    sensors = open_sensors(channels, args.tca_address, args.bme_address)
    gps = None if args.disable_gps else GpsReader(args.gps_port, args.gps_baud)
    if gps:
        gps.start()
    sequence = 0

    while running:
        sequence += 1
        row = build_row(args.device_id, sensors, sequence, gps)
        append_row(output_path, row)
        print(row, flush=True)

        if args.once:
            break

        time.sleep(args.interval)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
