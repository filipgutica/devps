#!/usr/bin/env bash
# Starts a throwaway runner and child server, lists their job, stops it, and checks both ports.
set -euo pipefail
devps="${DEVPS:-$(dirname "$0")/../dist/cli.js}"
port="${PORT:-48731}"
for check_port in "$port" "$((port + 1))"; do
  if lsof -nP -iTCP:"$check_port" -sTCP:LISTEN >/dev/null; then
    echo "smoke test port $check_port is already in use"
    exit 1
  fi
done
fixture_output="$(mktemp)"
child=""

node "$(dirname "$0")/fixtures/server.mjs" "$port" >"$fixture_output" 2>&1 &
server=$!
trap 'kill "$server" ${child:+"$child"} 2>/dev/null || true; rm -f "$fixture_output"' EXIT
for _ in $(seq 50); do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null && lsof -nP -iTCP:"$((port + 1))" -sTCP:LISTEN >/dev/null; then break; fi
  sleep 0.1
done
read -r child <"$fixture_output"
[[ "$child" =~ ^[0-9]+$ ]] || { echo "server fixture did not start its child"; exit 1; }

diagnose() {
  echo "--- lsof listeners"; lsof -nP -iTCP -sTCP:LISTEN || true
  echo "--- server process"; ps -o pid=,ppid=,tty=,comm= -p "$server" || true
  echo "--- devps --all"; "$devps" ls --all || true
}
"$devps" ls | grep -q ":$port" || { echo "devps ls did not list :$port"; diagnose; exit 1; }
"$devps" _preview "$server" | grep -q ":$port :$((port + 1))" || { echo "preview did not group runner and child under job $server"; exit 1; }
"$devps" kill "$port" -y
sleep 0.5
for check_port in "$port" "$((port + 1))"; do
  if lsof -nP -iTCP:"$check_port" -sTCP:LISTEN >/dev/null; then echo "port $check_port still in use after kill"; exit 1; fi
done
"$devps" kill 1 2>&1 | grep -q "no dev server matches 1"
echo "smoke test passed"
