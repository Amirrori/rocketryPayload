import time
import board
import busio
import adafruit_tca9548a
from adafruit_bme280 import basic as adafruit_bme280

i2c = busio.I2C(board.SCL, board.SDA)

tca = adafruit_tca9548a.TCA9548A(i2c,0x70)

bme0 = adafruit_bme280.Adafruit_BME280_I2C(tca[0],0x76)
bme1 = adafruit_bme280.Adafruit_BME280_I2C(tca[1],0x76)
bme2 = adafruit_bme280.Adafruit_BME280_I2C(tca[2],0x76)

while True:
    print("Sensor 0:")
    print(f"Temp: {bme0.temperature:.2f} C")
    print(f"Humidity: {bme0.humidity:.2f}%")
    print(f"Pressure: {bme0.pressure:.2f} hPa")

    print("Sensor 1:")
    print(f"Temp: {bme1.temperature:.2f} C")
    print(f"Humidity: {bme1.humidity:.2f}%")
    print(f"Pressure: {bme1.pressure:.2f} hPa")

    print("Sensor 2:")
    print(f"Temp: {bme2.temperature:.2f} C")
    print(f"Humidity: {bme2.humidity:.2f}%")
    print(f"Pressure: {bme2.pressure:.2f} hPa")

    time.sleep(2)