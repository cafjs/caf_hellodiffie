#!/bin/bash

# $1 is a bluetooth address like 5C:F3:70:6D:9F:0C

CHANNEL_RFCOMM=${CHANNEL_RFCOMM:-'25'}

/usr/bin/sdptool add --channel="${CHANNEL_RFCOMM}" SP
/usr/bin/rfcomm   -E -S connect /dev/rfcomm0 $1 "${CHANNEL_RFCOMM}"
