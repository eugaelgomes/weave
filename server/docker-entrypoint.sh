#!/bin/sh
set -e
# CMD is wrapped with `doppler run --` in the Dockerfile; avoid double-wrapping here.
exec "$@"
