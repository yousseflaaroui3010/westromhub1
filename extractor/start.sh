#!/bin/sh
# Railway private networking is IPv6 (newer environments also IPv4). Bind
# dual-stack when the kernel has IPv6, plain IPv4 otherwise.
if python -c "import socket; s=socket.socket(socket.AF_INET6); s.bind(('::', 0))" 2>/dev/null; then
  HOST="::"
else
  HOST="0.0.0.0"
fi
exec uvicorn wgc_extract.server:app --host "$HOST" --port "${PORT:-8080}" --workers 1 --no-access-log
