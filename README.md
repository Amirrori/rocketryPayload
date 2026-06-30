# Rocketry Payload SD Card Export

Pulled from Raspberry Pi hostname `uhrkpay` on 2026-06-30.

## Contents

- `payload/` - Python payload sensor test code from `/home/uhrkpay/env`.
- `docker/` - Docker/web dashboard files from `/home/uhrkpay/docker`.
- `boot-config/` - selected Raspberry Pi boot/cloud-init configuration files.
- `requirements.freeze.txt` - Python package freeze from the payload virtual environment.
- `SD_CARD_MANIFEST.txt` - inventory and system context captured from the SD card.

## Safety Notes

The exported `boot-config/network-config` and `boot-config/user-data` files have been redacted before publishing. The raw Wi-Fi password and password hash should not be committed to a public repository.
