#!/usr/bin/env python3
import argparse
import os
import signal
import sys
import time
from pathlib import Path

import board
import busio
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


def build_row(device_id, sensors, sequence):
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
        "",
        "",
        "",
        "",
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
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    output_path = Path(args.file)
    channels = parse_channels(args.channels)
    sensors = open_sensors(channels, args.tca_address, args.bme_address)
    sequence = 0

    while running:
        sequence += 1
        row = build_row(args.device_id, sensors, sequence)
        append_row(output_path, row)
        print(row, flush=True)

        if args.once:
            break

        time.sleep(args.interval)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
