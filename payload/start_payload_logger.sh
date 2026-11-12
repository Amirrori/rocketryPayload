#!/bin/sh
set -eu

DATA_DIR="/home/uhrkpay/docker/webserver/data"
LOG_FILE="$DATA_DIR/payload_logger.log"
PYTHON="/home/uhrkpay/env/bin/python3"
LOGGER="/home/uhrkpay/env/payload_logger.py"
OUT_FILE="$DATA_DIR/lora.txt"

mkdir -p "$DATA_DIR"

if pgrep -f "$LOGGER" >/dev/null 2>&1; then
    exit 0
fi

while [ ! -e /dev/i2c-1 ]; do
    sleep 2
done

cd /home/uhrkpay/env
exec "$PYTHON" "$LOGGER" --file "$OUT_FILE" --interval 1 >> "$LOG_FILE" 2>&1
