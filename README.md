# Why?

It was a way to display core and miscellaneous information reliably.

The payload is a Raspberry Pi 3 B+ (hostname uhrkpay). It reads 3 BME280 sensors and a GPS, writes a line of data every second and shows it on a website. The pi makes its own wifi hotspot so you can just connect to it with your phone or laptop and look at the data, no other network needed.
## Code base

The website part is containerised in docker containers.

- Docker 1: Web back-end running NodeJS. It reads the text file the logger writes and serves the HTML for the website.
    
- Docker 2: Nginx, is a web server, reverse proxy, content cache, proxy server and many more. We will be using it's functionality for web server and reverse proxy. It will serve whatever Docker 1 will be sending through and serving said content to the user.
    

The logger isn't in docker. It's a python script that runs straight on the pi (it needs the I2C and serial pins) and cron starts it when the pi boots.

Justification for using docker is that it's easier to deploy on systems (less commands more config files that you can just pop into the system) and it's all containerised (elevated security). Moreover, it makes it also easier to manage.

There are two reasons we are using NodeJS. One is that it can do more than just plain html(useful for getting and serving content). Second is that it's considerably more robust for our stack than something like NextJS or React, as we do not require the features they provide us(Used mainly for professional web development).

But also mostly because I already knew how to use nodejs to read files.

The website part is reproducible on any system that uses any modern version of Linux, the logger needs the pi because of the sensors.

### Visual diagram of how everything works:

## Where everything is

The folders in here are laid out like they were on the pi:

```
payload/    the logger, was in /home/uhrkpay/env
docker/     both containers, was in /home/uhrkpay/docker
system/     stuff from outside the home folder (boot config, wifi + hotspot, crontab, package lists, docker inspect)
data/       all the data that was on the pi
tools/      test scripts we used to get the sensors and gps working
archive/    old stuff (first version of the website, old backups the pi had, bash history)
docs/       more detailed docs, and the old readmes in docs/old/
```

The laptop wifi password got taken out of the files and replaced with <LAPTOP_WIFI_PASSWORD>, everything else is as it was.

## Summarised walk-through:

### Setup

Full step by step is in docs/setup.md.

Flash the Pi with Pi OS Lite 64 bit with the Raspberry Pi Imager, set the hostname to uhrkpay and user uhrkpay. The username on the pi should be kept because the paths in the logger and the crontab use /home/uhrkpay, but if you do change it change the path on those as well.

Turn on I2C, SPI and the serial port, and turn the serial console off (the gps needs the serial port):

```
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_spi 0
sudo raspi-config nonint do_serial_hw 0
sudo raspi-config nonint do_serial_cons 1
```

Install the packages and docker (docker from [https://docs.docker.com/engine/install/debian/](https://docs.docker.com/engine/install/debian/)):

```
sudo apt install i2c-tools python3-venv python3-pip python3-smbus2 python3-serial python3-bme280 python3-spidev python3-libgpiod python3-gpiozero python3-rpi-lgpio libgpiod-dev build-essential git
sudo usermod -aG docker uhrkpay
```

Set up the logger:

```
python3 -m venv --system-site-packages ~/env
cp payload/payload_logger.py payload/start_payload_logger.sh ~/env/
chmod +x ~/env/payload_logger.py ~/env/start_payload_logger.sh
~/env/bin/pip install -r payload/requirements.txt
crontab system/crontab-uhrkpay
```

Then do the docker part below, copy the wifi profiles from system/etc/NetworkManager/system-connections/ into /etc/NetworkManager/system-connections/ (owned by root, chmod 600) and reboot.

### Docker deployment

Copy the docker folder over and make the data folder first, otherwise docker makes it as root and nothing can write to it:

```
cp -r docker ~/docker
mkdir -p ~/docker/webserver/data
touch ~/docker/webserver/data/lora.txt
```

Create Docker Network:

```
docker network create mynet
```

Tree of Docker directory:

```
docker/
  Dockerfile
  nginx/
    default.conf
  webserver/
    Dockerfile
    package.json
    package-lock.json
    server.js
    src/
      index.html
      app.js
      public/
        uhrk_logo.webp
      reset.css
      style.css
      tmp.css
```

package-lock.json is the one from the image that was running on the pi so npm installs the same versions again.

### To build and run node server

```
# in the same directory as node-server dockerfile so: ~/docker/webserver
docker build -t node-server .

docker run -d --name node-server --network mynet -p 3000:3000 --user 1000:1000 -v /home/uhrkpay/docker/webserver/data:/usr/src/app/data --restart unless-stopped node-server
```

Note: the -v part is what lets the node server see lora.txt, and --user 1000:1000 makes it run as the same user as uhrkpay so the files it writes are ours.

### To build and run nginx

```
# in the same directory as nginx server dockerfile: ~/docker/
docker build --no-cache -t webserver-nginx-image .
docker run -d --name webserver-nginx --network mynet -p 8080:80 --restart unless-stopped webserver-nginx-image
```

After that the website is at [http://10.42.0.1:8080](http://10.42.0.1:8080) when you're on the pi's hotspot (or :3000 to go straight to node).

### statistics and diagnosis:

To check if containers are or are not running do:

```
docker ps
docker ps -a
docker stats
```

To fully destroy a docker container(usually when files are stuck):

```
docker rm -f <container-name> 2>/dev/null
```

To see if the logger is writing:

```
tail -f ~/docker/webserver/data/payload_logger.log
```

## How does it get the data?

The logger (payload/payload_logger.py) reads from 3x BME280s through a TCA9548A I2C multiplexer (mux at 0x70, the sensors at 0x76 on channels 0, 1 and 2) and the gps over serial on /dev/serial0 at 9600 baud.

Every 1000ms (1 Second) a line gets added to lora.txt(mind that lora was never setup)

NodeJS watches lora.txt, puts the last 500 lines into data.json and the website asks it for new data every second.

#### string format

The strings are in the format of:  
"ID, TIME, SENSOR_IDS, SENSOR_DATAS"

E.G:

```
PAYLOAD,22:19:58,B1,B2,B3,B4,T1,T2,T3,H1,H2,H3,M,A,X,Y,Z,GPS_SATS_USE,GPS_SATS_VIEW,102431.60,102440.35,102516.05,102462.67,20.32,20.16,18.91,58.13,55.73,63.27,1970,,,,NO FIX,0,10
```

B1 B2 B3 are pressure in Pa from each sensor and B4 is the average. T is temperature in C and H is humidity in %. M is the sample number, A is gps altitude, X and Y are latitude and longitude, Z is the gps fix status and the last two are how many satellites it's using and how many it can see.

More detail on all of this is in docs/how-it-works.md and the wiring/addresses are in docs/hardware.md.

## NodeJS

The server runs on port 3000 with Express.

It serves the website from the src folder and has these endpoints:

```
/api/telemetry          latest data + history, the website uses this
/api/health             just a quick check that it's running
/data/data.json         the json file
/download/dashboard.html   download a copy of the page with the data in it
/i2c/off                (unused AND unfinished)
```

## HTML, CSS and JS

index.html is the page, app.js asks /api/telemetry every second and fills in the boxes and the table, style.css is the styling and reset.css removes the inconsistent styling between web browsers. There is a light/dark mode button at the top. tmp.css isn't used.

## Known problems

The pi doesn't have a clock battery so when it has no internet the times in the data can be wrong.

/i2c/off doesn't work in docker because the container can't see the I2C bus.

The hotspot password is the same as the uhrkpay password and ssh takes passwords, so anyone on the hotspot can log in.

More about the pi itself (wifi, hotspot, services) is in docs/pi-system.md.

### Resources used:

[https://nginx.org/](https://nginx.org/)

[https://docs.docker.com/engine/install/debian/#installation-methods](https://docs.docker.com/engine/install/debian/#installation-methods)

[https://hub.docker.com/_/nginx](https://hub.docker.com/_/nginx)

[https://www.geeksforgeeks.org/devops/running-commands-inside-docker-container/](https://www.geeksforgeeks.org/devops/running-commands-inside-docker-container/)

[https://nodejs.org/en](https://nodejs.org/en)

[https://www.digitalocean.com/community/tutorials/how-to-secure-a-containerized-node-js-application-with-nginx-let-s-encrypt-and-docker-compose](https://www.digitalocean.com/community/tutorials/how-to-secure-a-containerized-node-js-application-with-nginx-let-s-encrypt-and-docker-compose)

[https://docs.docker.com/engine/network/](https://docs.docker.com/engine/network/)

[https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

[https://www.geeksforgeeks.org/node-js/how-to-read-and-write-json-file-using-node-js/](https://www.geeksforgeeks.org/node-js/how-to-read-and-write-json-file-using-node-js/)

[https://docs.docker.com/get-started/docker-concepts/running-containers/sharing-local-files/](https://docs.docker.com/get-started/docker-concepts/running-containers/sharing-local-files/)