# data

This is everything that was in /home/uhrkpay/docker/webserver/data on the pi on 12/11/2026. Nothing was changed.

## Files

lora.txt has every line the logger wrote, 14920 lines in total. The line format is explained in ../docs/how-it-works.md.

data.json is the last 500 lines as json, newest first. It is made by the node server.

payload_logger.log is everything the logger printed, so the same lines plus startup messages and errors. Part of the file is blank space and null bytes.

backups/ has an older copy of lora.txt and a vim swap file from when it was edited on 30/06/2026.

## Note

The time on each line is the pi's time without a date. The pi has no RTC so times from runs without internet can be wrong. About 3100 of the lines have gps coordinates.

To use this data on a new pi copy it into ~/docker/webserver/data/ before starting the logger. This is in the Docker containers part of ../docs/setup.md.
