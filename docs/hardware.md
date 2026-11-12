# What's on the payload pi?

Everything runs off a Raspberry Pi 3 B+(rev 1.4, 1GB of RAM and a 32GB SD card).

For sensors there's 3x BME280s, each one gives pressure, temperature and humidity. Problem with them is they all have the same address (0x76) so they can't just go on the I2C bus together, that's what the TCA9548A multiplexer is for and each sensor gets its own channel on it.

GPS is on serial instead of I2C, it sends NMEA strings at 9600 baud.

## I2C

The mux is on the pi's main I2C bus (bus 1, /dev/i2c-1). SDA is GPIO2 (pin 3) and SCL is GPIO3 (pin 5).

To check what is connected do:

```
i2cdetect -y 1
python3 tools/test.py
```

i2cdetect should show 0x70. tools/test.py goes through all 8 mux channels and lists the addresses found on each one, 0x76 should show up on channels 0, 1 and 2.

## GPS

The gps is connected to the serial pins, GPIO14 TXD (pin 8) and GPIO15 RXD (pin 10).

On a pi 3 the bluetooth uses the main UART so /dev/serial0 points to the mini UART /dev/ttyS0. The serial console has to be disabled otherwise it uses the port and the gps can't (setup.md covers this).

To check if the gps is sending data do:

```
sudo cat /dev/serial0
```

Lines starting with $GP or $GN should come up. Indoors it usually sees some satellites but doesn't get a fix.

Before the gps ended up on serial we tried reading one over I2C at address 0x42 with tools/i2c-gps-native.py, but the logger only reads it over serial.

## LoRa

The plan was originally to send the data down over LoRa, so the library for the radio (adafruit-circuitpython-rfm9x) got installed into the venv. That never got set up and nothing on the pi sends or receives LoRa, but the data file kept the name lora.txt.

The node server also has i2c-bus installed for the /i2c/off endpoint. Since that endpoint doesn't work inside docker it isn't doing anything right now.
