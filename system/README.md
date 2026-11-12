# system

These are the files from the pi that are outside the home folder. They are in the same paths they were on the pi.

## Files

boot/firmware/config.txt is the pi's firmware config with I2C, SPI and UART enabled. It can be copied onto a new card.

boot/firmware/cmdline.txt is the kernel command line. It should not be copied onto a new card because it has the old card's PARTUUID.

boot/firmware/user-data, network-config and meta-data are the cloud-init files made by the imager (user, password hash, wifi, hostname). The laptop wifi password was replaced with <LAPTOP_WIFI_PASSWORD>.

etc/NetworkManager/system-connections/ has the wifi, hotspot and ethernet profiles. They go into the same folder on the pi, owned by root with chmod 600. The laptop wifi password was replaced in these as well.

etc/apt/sources.list.d/docker.list is docker's apt repo. etc/modules loads i2c-dev on boot.

crontab-uhrkpay is the crontab for uhrkpay. To install it do:

```
crontab crontab-uhrkpay
```

packages/apt-manual.txt is the list of packages installed by hand and packages/dpkg-selections.txt is every package that was installed.

docker/ has the docker inspect output for both containers, both images and the mynet network. It shows exactly how the containers were run.

The full setup steps are in ../docs/setup.md.
