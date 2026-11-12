# tools

Test scripts that were used while getting the hardware working. The logger doesn't need any of them.

## Scripts

test.py goes through all 8 channels of the TCA9548A and lists the I2C addresses on each one. It was in /home/uhrkpay on the pi.

PayloadTestCode.py was the first sensor test. It reads the 3 BME280s through the mux every 2 seconds and prints the values. It was in /home/uhrkpay/env but had been deleted from the pi by November, this copy is from the June export.

serialtest.py sends "Hello Pi" on /dev/serial0 at 115200 and prints what comes back. It is for testing with TX and RX connected together. It was in /home/uhrkpay.

i2c-gps-native.py reads NMEA from a gps on I2C at 0x42 and prints sentences with a valid checksum. It was in /home/uhrkpay. The final setup reads the gps over serial instead.

## Running them

They need the venv python so the libraries are available:

```
~/env/bin/python3 tools/test.py
```
