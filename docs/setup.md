# Setup

This is how to set the pi up again from nothing. Everything below is ran on the pi as uhrkpay from inside the repo folder.

Keep the username as uhrkpay. The logger, the start script and the crontab have /home/uhrkpay hard coded in them, so if the username is different those paths need changing too.

## Flashing the SD card

The pi had Raspberry Pi OS Lite 64-bit on it (Debian 13 trixie, image from 2026-04-21). Flash it with the Raspberry Pi Imager and use these settings:

```
hostname: uhrkpay
user: uhrkpay
wifi: Laptop (optional)
timezone: Europe/London, keyboard gb
ssh: on, password login
```

The other way of doing it is copying user-data, network-config and meta-data from system/boot/firmware/ onto the boot partition after flashing. These are the files the imager made for the original card so the user and password come out the same. network-config needs the laptop wifi password put back in where it says <LAPTOP_WIFI_PASSWORD>.

Note: cmdline.txt should not be copied to a new card. It has the PARTUUID of the old card in it and the pi will not boot with it.

## Enabling I2C, SPI and serial

To enable them do:

```
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_spi 0
sudo raspi-config nonint do_serial_hw 0
sudo raspi-config nonint do_serial_cons 1
```

do_serial_cons 1 disables the serial console. If the console is left on it takes over the serial port and the gps won't be able to use it.

config.txt in system/boot/firmware/ already has all of this turned on (dtparam=i2c_arm=on, dtparam=spi=on, enable_uart=1) so it can also be copied straight over instead. Reboot after.

## Packages

```
sudo apt update
sudo apt full-upgrade
sudo apt install i2c-tools python3-venv python3-pip python3-smbus2 python3-serial python3-bme280 python3-spidev python3-libgpiod python3-gpiozero python3-rpi-lgpio libgpiod-dev build-essential git
```

The full list of what was installed is in system/packages/. apt-manual.txt is what got installed by hand and dpkg-selections.txt is every package.

## Docker

Docker was installed from docker's own apt repo:
[https://docs.docker.com/engine/install/debian/](https://docs.docker.com/engine/install/debian/)

Originally it was done with their install script from [https://get.docker.com](https://get.docker.com), it adds the same repo (system/etc/apt/sources.list.d/docker.list).

To use docker without sudo do:

```
sudo usermod -aG docker uhrkpay
```

Log out and back in for the group to work.

## Logger

```
python3 -m venv --system-site-packages ~/env
cp payload/payload_logger.py payload/start_payload_logger.sh ~/env/
chmod +x ~/env/payload_logger.py ~/env/start_payload_logger.sh
~/env/bin/pip install -r payload/requirements.txt
```

--system-site-packages is needed because the venv also uses python packages that were installed with apt.

requirements.txt is everything that was installed into the venv. requirements.freeze.txt is an older full list from June and is only there for reference.

To test the logger with the sensors connected do:

```
~/env/bin/python3 ~/env/payload_logger.py --once --file /tmp/test.txt
cat /tmp/test.txt
```

--once makes it write a single line and exit.

## Docker containers

The data folder has to exist before the containers are started. Docker creates it as root otherwise and the logger can't write there.

```
cp -r docker ~/docker
mkdir -p ~/docker/webserver/data
touch ~/docker/webserver/data/lora.txt
```

To restore the old data as well do:

```
cp -r data/. ~/docker/webserver/data/
```

Create Docker Network:

```
docker network create mynet
```

### To build and run node server

```
# in the same directory as node-server dockerfile: ~/docker/webserver
docker build -t node-server .

docker run -d --name node-server --network mynet -p 3000:3000 --user 1000:1000 -v /home/uhrkpay/docker/webserver/data:/usr/src/app/data --restart unless-stopped node-server
```

Note: --user 1000:1000 is the node user inside the container which has the same id as uhrkpay, so anything written to the data folder is owned by uhrkpay. The docker run commands in archive/bash_history.txt were earlier attempts and not what the containers ended up using.

### To build and run nginx

```
# in the same directory as nginx server dockerfile: ~/docker/
docker build --no-cache -t webserver-nginx-image .

docker run -d --name webserver-nginx --network mynet -p 8080:80 --restart unless-stopped webserver-nginx-image
```

package-lock.json was copied out of the image that was running on the pi, npm installs the same versions from it.

If a docker save of the original images is available the build steps can be skipped. Load them with:

```
docker load -i docker-images.tar.gz
```

and then use the same docker run commands as above. The full docker inspect output of the original containers is in system/docker/.

## Starting the logger on boot

```
crontab system/crontab-uhrkpay
```

The crontab only has one line which runs start_payload_logger.sh on every reboot. The script waits until /dev/i2c-1 shows up, makes sure the logger isn't running already and starts it. Output goes to ~/docker/webserver/data/payload_logger.log.

## Wifi and hotspot

```
sudo cp system/etc/NetworkManager/system-connections/*.nmconnection /etc/NetworkManager/system-connections/
sudo chown root:root /etc/NetworkManager/system-connections/*.nmconnection
sudo chmod 600 /etc/NetworkManager/system-connections/*.nmconnection
sudo nano /etc/NetworkManager/system-connections/Laptop.nmconnection
sudo nmcli connection reload
```

Laptop.nmconnection needs the laptop wifi password where it says <LAPTOP_WIFI_PASSWORD>. If the imager made its own profile for the laptop wifi there will be a duplicate. nmcli connection show lists them and sudo nmcli connection delete <name> removes the extra one.

pi-system.md explains what each profile does.

## Checking it works

Reboot first:

```
sudo reboot
```

To check if containers are or are not running do:

```
docker ps
```

To see if the logger is writing (new line every second):

```
tail -f ~/docker/webserver/data/payload_logger.log
```

To check the crontab got added:

```
crontab -l
```

The website is at [http://10.42.0.1:8080](http://10.42.0.1:8080) from the uhrkpay hotspot.

Note: if payload_logger.log stops at "channel 0: BME280 unavailable" the logger has hung because a sensor wasn't connected when it started.
