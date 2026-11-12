import serial
import time

ser = serial.Serial('/dev/serial0', 115200, timeout=1)

ser.write(b'Hello Pi')

time.sleep(1)
if ser.inWaiting() > 0:
    data = ser.read(ser.inWaiting())
    print(f"Received: {data.decode('utf-8')}")
else:
    print("No data received. Check your wiring or pin configuration.")

ser.close()


