"""Start uvicorn on ONE dual-stack socket.

Railway's private network is IPv6 and its health checks may come over IPv4.
asyncio sets IPV6_V6ONLY on sockets it creates for '::', so binding '::'
through uvicorn listens on IPv6 only (health checks then fail). We create
the socket ourselves with V6ONLY=0 and hand it to uvicorn. Hosts without
IPv6 fall back to plain IPv4.
"""

import os
import socket

import uvicorn


def _socket(port: int) -> socket.socket:
    try:
        s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("::", port))
    except OSError:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", port))
    s.listen(128)
    s.set_inheritable(True)
    return s


def main() -> None:
    port = int(os.environ.get("PORT", "8080"))
    sock = _socket(port)
    config = uvicorn.Config("wgc_extract.server:app", workers=1, access_log=False, log_level="info")
    uvicorn.Server(config).run(sockets=[sock])


if __name__ == "__main__":
    main()
