#!/usr/bin/env bash
# Starts a throwaway server, checks devps lists it, stops it, and checks the port is free.
set -euo pipefail
devps="${DEVPS:-$(dirname "$0")/../devps}"
port="${PORT:-48731}"

python3 -m http.server "$port" >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for _ in $(seq 50); do lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null && break; sleep 0.1; done

"$devps" ls | grep -q ":$port" || { echo "devps ls did not list :$port"; "$devps" ls; exit 1; }
"$devps" _preview "$server" | grep -q ":$port" || { echo "preview did not resolve job $server"; exit 1; }
"$devps" kill "$port" -y
sleep 0.5
if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null; then echo "port $port still in use after kill"; exit 1; fi
"$devps" kill 1 2>&1 | grep -q "no dev server matches 1"
echo "smoke test passed"
