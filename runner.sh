#!/bin/sh
set -e

while true; do
  echo "[$(date)] boe-normalizer runner start"
  npm start || echo "[$(date)] boe-normalizer runner failed"
  echo "[$(date)] sleeping 300s"
  sleep 300
done

