#!/bin/bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./deploy-production.sh https://yourdomain.com"
  exit 1
fi

./deploy.sh --env production --url "$1"
