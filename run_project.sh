#!/usr/bin/env bash
# Varuna Netra - local launcher (macOS / Linux). Needs: Python 3.11+, Node 18+, yarn, MongoDB.
set -e
cd "$(dirname "$0")"
[ -f backend/.env ]  || cp backend/.env.example backend/.env
[ -f frontend/.env ] || cp frontend/.env.example frontend/.env

if ! (echo > /dev/tcp/127.0.0.1/27017) 2>/dev/null; then
  if command -v mongod >/dev/null; then
    mkdir -p mongodb_data
    mongod --dbpath ./mongodb_data --bind_ip 127.0.0.1 --port 27017 --fork --logpath mongodb_data/mongod.log
  else
    echo "MongoDB is not running. Start it, or set an Atlas MONGO_URL in backend/.env"
  fi
fi

(
  cd backend
  [ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -r requirements.txt; }
  exec .venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000
) &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT

cd frontend
[ -d node_modules ] || yarn install
yarn start
