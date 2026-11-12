#!/usr/bin/env python3

import time
import smbus
import signal
import sys

BUS = None
address = 0x42
gpsReadInterval = 0.03


def connectBus():
    global BUS
    try:
        BUS = smbus.SMBus(1)
    except Exception as e:
        print(f"Failed to connect to I2C bus: {e}")
        BUS = None


def parseResponse(gpsLine):
    try:
        # Check #1: only one '$'
        if gpsLine.count(36) != 1:
            return

        # Check #2: max NMEA length
        if len(gpsLine) < 84:
            CharError = 0

            # Check #3: valid ASCII chars only
            for c in gpsLine:
                if (c < 32 or c > 122) and c != 13:
                    CharError += 1

            if CharError != 0:
                return

            # Convert byte array to string
            gpsChars = ''.join(chr(c) for c in gpsLine)

            # Check #4: skip txbuf errors
            if 'txbuf' in gpsChars:
                return

            # Check #5: split safely on checksum
            if '*' not in gpsChars:
                return

            gpsStr, chkSum = gpsChars.split('*', 1)

            # Calculate checksum
            chkVal = 0
            for ch in gpsStr[1:]:  # skip '$'
                chkVal ^= ord(ch)

            # Compare checksum safely
            try:
                if chkVal == int(chkSum, 16):
                    print(gpsChars)
            except ValueError:
                return

    except Exception as e:
        print(f"parseResponse error: {e}")


def handle_ctrl_c(signal_num, frame):
    sys.exit(130)


signal.signal(signal.SIGINT, handle_ctrl_c)


def readGPS():
    global BUS

    if BUS is None:
        connectBus()
        if BUS is None:
            return

    response = []

    try:
        while True:
            c = BUS.read_byte(address)

            if c == 255:
                return
            elif c == 10:  # newline
                break
            else:
                response.append(c)

        parseResponse(response)

    except IOError:
        # Reconnect on I2C failure
        connectBus()

    except Exception as e:
        print(f"readGPS error: {e}")


connectBus()

while True:
    readGPS()
    time.sleep(gpsReadInterval)
