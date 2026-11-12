import smbus2
import time

bus = smbus2.SMBus(1)  # 1 for Raspberry Pi revision 2 or newer
TCA_ADDRESS = 0x70    # Default address of TCA9548A

print("Scanning all 8 channels of TCA9548A...")

for channel in range(8):
    # Set the multiplexer channel
    bus.write_byte(TCA_ADDRESS, 1 << channel)
    time.sleep(0.01) # Small delay for the switch

    devices = []
    # Scan standard I2C addresses (0x03 to 0x77)
    for address in range(0x03, 0x78):
        try:
            # Attempt to read a byte to see if a device ACKs
            bus.read_byte(address)
            devices.append(hex(address))
        except IOError:
            pass # No device found at this address

    print(f"Channel {channel}: {devices}")

