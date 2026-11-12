# The pi

This is how the pi was set up on 12/11/2026 when the backup was taken.

## OS

The pi runs Raspberry Pi OS Lite 64-bit (Debian 13 trixie, image from 2026-04-21) with kernel 6.18. There is no desktop and it boots to the console.

The hostname is uhrkpay, timezone Europe/London and locale en_GB. It was set up by the Raspberry Pi Imager through cloud-init and those files are in system/boot/firmware/. cloud-init is still enabled.

Swap is zram (about 900 MB in RAM) so nothing is swapped onto the SD card.

## Users

uhrkpay is the only normal user and has full sudo. It is in the groups needed for the hardware and docker (i2c, spi, gpio, dialout for serial, docker) plus the default pi ones.

Root has no password set so logging in as root isn't possible. SSH accepts passwords and no ssh keys are set up.

## Services

The logger (payload_logger.py) is started by cron on every reboot, the crontab is in system/crontab-uhrkpay.

Docker runs the two containers. Both have --restart unless-stopped so they start again on their own after a reboot.

NetworkManager handles the wifi, the hotspot and ethernet. avahi makes the pi reachable as uhrkpay.local.

Apart from those the rest is ssh, cron, bluetooth, time sync and the other default system services. Nothing was added except the logger and docker.

Open ports:

```
22     ssh
3000   node-server
8080   nginx
53/67  dns and dhcp for the hotspot (only when the hotspot is on)
5353   mdns (avahi)
```

## Network

Networking is done with NetworkManager and the profiles are in system/etc/NetworkManager/system-connections/. All the wifi profiles use wlan0 so only one can be active. The one with the highest priority is used if its network is in range.

Laptop (priority 200) connects to the wifi called Laptop.

uhrkpay (priority 0) connects to a wifi called uhrkpay. This is a separate access point and not the pi's own hotspot.

Hotspot (priority -50) is the pi's own wifi, also called uhrkpay, using WPA2. The pi is 10.42.0.1 and gives out 10.42.0.10 to 10.42.0.254. If the pi has internet from somewhere else (a cable for example) it is shared to the hotspot.

Wired connection 1 (priority -999) is DHCP on eth0 for when a cable is plugged in.

If the laptop wifi is in range the pi connects to it, if not it starts its own hotspot.

To turn the hotspot on or off manually do:

```
sudo nmcli connection up Hotspot
sudo nmcli connection down Hotspot
```

## Docker

Docker is installed from docker's apt repo (system/etc/apt/sources.list.d/docker.list). The containers are on a network called mynet (172.18.0.0/16), nginx is 172.18.0.2 and node-server is 172.18.0.3.

node-server uses the node-server image (node:20-alpine, Node 20.20.2) on port 3000. /home/uhrkpay/docker/webserver/data is mounted at /usr/src/app/data. It runs as 1000:1000 which is the node user inside the container and uhrkpay on the pi.

webserver-nginx uses webserver-nginx-image (nginx 1.31.2) with 8080 mapped to 80. In ps on the pi the nginx workers show up as the avahi user. This is because nginx's user id inside the container (101) is the same id avahi has on the pi.

Neither container is privileged or has access to any devices. The full docker inspect output is in system/docker/.

The images on the pi were built on 30/06/2026. Newer versions of server.js, src/ and the nginx config were copied into the running containers after that. The files in docker/ are the newer versions, so building from this repo gives the same as what was running.

## Logs, watchdog and other

journalctl only keeps logs in RAM (Raspberry Pi OS default) so it only shows the current boot. payload_logger.log is a normal file in the data folder so it stays after a reboot.

The hardware watchdog is enabled (also a default). If the pi freezes for a minute it reboots itself.

Bluetooth is installed but powered off and nothing is paired.

Raspberry Pi Connect (rpi-connect-lite) comes with the image. It was never signed in and isn't enabled.

## Clock

The pi 3 has no RTC (clock battery). It saves the time to the SD card every 5 minutes and starts from that time on boot. The time is corrected once it can reach a time server (2.debian.pool.ntp.org) over the internet.

On the hotspot without internet the time can be off by hours or months and the wrong time ends up in the data and the logs. If the time matters the pi should be connected to the internet before the run, or the time can be set manually:

```
sudo date -s "2026-11-12 21:00"
```

## Known problems

payload_logger.log and lora.txt keep growing and nothing clears them. Both were about 2.4 MB when the backup was taken.
