#!/bin/bash

CHANNEL_RFCOMM=${CHANNEL_RFCOMM:-'25'}

if [ ! -f /dev/rfcomm0 ]; then
    mknod -m 666 /dev/rfcomm0 c 216 0
fi

if pgrep "rfcomm" > /dev/null
then
    echo "rfcomm already running"
else
    echo "starting rfcomm"
   /usr/bin/sdptool add --channel="${CHANNEL_RFCOMM}" SP
   /usr/bin/rfcomm -E -S watch /dev/rfcomm0 "${CHANNEL_RFCOMM}"  /sbin/agetty rfcomm0 115200 linux
fi
