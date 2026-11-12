# How it works

```
3x BME280 -- I2C -- TCA9548A (0x70) --+
GPS -- serial /dev/serial0 9600 ------+-- payload_logger.py -- writes lora.txt
                                                                    |
browser -- nginx :8080 -- node-server :3000 -- reads lora.txt ------+
```

The logger and the website don't talk to each other directly. The logger only adds lines to lora.txt and the node server only reads it. lora.txt is in /home/uhrkpay/docker/webserver/data on the pi and that folder is mounted into the node container at /usr/src/app/data.

## Logger

The logger is payload/payload_logger.py and it gets started by start_payload_logger.sh.

Cron runs the start script on every reboot. The script creates the data folder if it doesn't exist, exits if the logger is already running, waits until /dev/i2c-1 shows up and then starts the logger with --file set to lora.txt and --interval 1. Everything the logger prints goes into payload_logger.log in the same folder.

On startup the logger opens I2C bus 1 and the TCA9548A at 0x70, then sets up a BME280 at 0x76 on mux channels 0, 1 and 2 (sea level pressure is set to 1013.25 hPa). After that it starts a separate thread for the gps which reads /dev/serial0 at 9600 baud.

Every second it reads all 3 sensors, takes the latest gps values and adds a line to lora.txt. The same line is printed to the log as well.

The gps thread checks the NMEA checksum and only uses 3 types of sentences. GGA is used for position, altitude, satellites in use and fix type. RMC is used for position and whether there is a fix. GSV is used for the number of satellites in view.

If the gps isn't connected it retries every 2 seconds and the gps columns are left empty. If a sensor read fails the value is written as ERR.

### Options

The start script only sets --file and --interval, the rest use the defaults:

```
--file          where to write, default /home/uhrkpay/docker/webserver/data/lora.txt
--device-id     first column, default PAYLOAD
--channels      mux channels, default 0,1,2
--interval      seconds between lines, default 1
--tca-address   default 0x70
--bme-address   default 0x76
--gps-port      default /dev/serial0
--gps-baud      default 9600
--disable-gps   don't use the gps
--once          write one line and exit
```

## lora.txt

The strings are in the format of:  
"ID, TIME, SENSOR_IDS, SENSOR_DATAS"

E.G:

```
PAYLOAD,22:19:58,B1,B2,B3,B4,T1,T2,T3,H1,H2,H3,M,A,X,Y,Z,GPS_SATS_USE,GPS_SATS_VIEW,102431.60,102440.35,102516.05,102462.67,20.32,20.16,18.91,58.13,55.73,63.27,1970,,,,NO FIX,0,10
```

B1, B2 and B3 are pressure from each sensor in Pa and B4 is the average of the three. T1 to T3 are temperature in C and H1 to H3 are humidity in %.

M is the sample number and it starts from 1 every time the logger is started. A is the gps altitude in m. X is latitude and Y is longitude, both with 6 decimal places. Z is the gps fix status (NO DATA, NO FIX, GPS FIX, DGPS FIX etc). GPS_SATS_USE and GPS_SATS_VIEW are the number of satellites being used and the number in view.

The time is the pi's local time and there is no date. Older lines in the data don't have the two satellite fields, this doesn't matter because the node server reads the field names from each line.

## Node server

The node server is docker/webserver/server.js and runs Express 5 on port 3000.

It reads lora.txt when it starts and again whenever the file changes (it checks every second). It keeps the last 500 lines, turns them into objects and writes them newest first into data/data.json. If a line has at least 3 field names it recognises after the time those are used, otherwise it uses the default list. The website itself is served from src/.

Endpoints:

```
GET  /                         the website
GET  /api/telemetry            latest line, history and counts, used by the website
GET  /api/health               counts and when the file was last read
GET  /data/data.json           the json file
GET  /download/dashboard.html  downloads a copy of the page with the table in it
POST /i2c/off                  (unused AND unfinished) doesn't work in docker
```

These can be set as environment variables but none of them are set on the pi: PORT, FILE_ACCESS_INTERVAL, MAX_HISTORY_ROWS, PAYLOAD_RAW_FILE or LORA_FILE, PAYLOAD_JSON_FILE.

## Website

The website is in docker/webserver/src and is plain HTML, CSS and JS with no framework.

app.js requests /api/telemetry every second and fills in the bar at the top (last update, rows logged, latest node, sample time), the Most Recent boxes and the Past Data table. The status at the top shows Live, No Data or Offline. There is a light/dark mode button and the choice is saved in the browser.

tmp.css isn't loaded by the page and is left over from before.

## Nginx

The nginx container is built from docker/Dockerfile with docker/nginx/default.conf.

It listens on 80 inside the container (8080 on the pi) and forwards everything to http://node-server:3000. Both containers are on the docker network mynet which is how nginx finds node-server by name.

The nginx image also copies webserver/ into its html folder. This isn't used since every request is forwarded to node.
