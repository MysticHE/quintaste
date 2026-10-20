"""Egress guard for the Hermes browser: a loopback-only forward proxy that refuses non-public targets.

Chromium is forced through it by managed policy (ProxySettings with ``<-loopback>``), so a page or a
bot cannot reach localhost, Docker networks, Tailscale/CGNAT, link-local metadata or any other
non-global address, and DNS answers are vetted here before connecting (no rebinding between check
and connect). Only ports 80 and 443 are allowed. Denials are logged without query strings.
"""
import asyncio
import datetime as dt
import ipaddress
import json
import os
import pathlib
import socket
import urllib.parse

LISTEN = ('127.0.0.1', 3128)
PORTS = {80, 443}
LOG = pathlib.Path(os.environ.get('QT_BROWSER_GUARD_LOG', '/opt/data/qt-team/state/browser-guard.jsonl'))
TIMEOUT = 20


def public(address):
    ip = ipaddress.ip_address(address.split('%', 1)[0])
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


async def vet(host, port):
    """Resolve once and return one public address to connect to, or raise PermissionError."""
    if port not in PORTS:
        raise PermissionError('port')
    host = host.strip('[]').rstrip('.').lower()
    if not host or host == 'localhost' or host.endswith(('.localhost', '.internal', '.local')):
        raise PermissionError('host')
    try:
        addresses = [ipaddress.ip_address(host).compressed]
    except ValueError:
        loop = asyncio.get_running_loop()
        infos = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        addresses = list(dict.fromkeys(info[4][0] for info in infos))
    if not addresses or not all(public(a) for a in addresses):
        raise PermissionError('non-public address')
    return addresses[0]


def note(event, host, reason=''):
    try:
        LOG.parent.mkdir(parents=True, exist_ok=True)
        if LOG.exists() and LOG.stat().st_size > 2 * 1024 * 1024:
            LOG.replace(LOG.with_suffix('.previous.jsonl'))
        with LOG.open('a', encoding='utf-8') as handle:
            handle.write(json.dumps({'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'event': event,
                                     'host': host[:200], 'reason': reason}) + '\n')
    except OSError:
        pass


async def pipe(reader, writer):
    try:
        while data := await reader.read(65536):
            writer.write(data)
            await writer.drain()
    except (ConnectionError, asyncio.CancelledError):
        pass
    finally:
        writer.close()


async def handle(client_reader, client_writer):
    host = ''
    try:
        head = await asyncio.wait_for(client_reader.readuntil(b'\r\n\r\n'), TIMEOUT)
        request_line, *header_lines = head.decode('latin-1').split('\r\n')
        method, target, version = request_line.split(' ', 2)
        if method == 'CONNECT':
            host, _, port = target.rpartition(':')
            port = int(port)
        else:
            parts = urllib.parse.urlsplit(target)
            if parts.scheme != 'http' or not parts.hostname:
                raise PermissionError('scheme')
            host, port = parts.hostname, parts.port or 80
        address = await vet(host, port)
        upstream_reader, upstream_writer = await asyncio.wait_for(asyncio.open_connection(address, port), TIMEOUT)
        if method == 'CONNECT':
            client_writer.write(b'HTTP/1.1 200 Connection Established\r\n\r\n')
            await client_writer.drain()
        else:
            path = urllib.parse.urlsplit(target)._replace(scheme='', netloc='').geturl() or '/'
            kept = [h for h in header_lines if h and not h.lower().startswith(('proxy-', 'connection:'))]
            upstream_writer.write(('\r\n'.join([f'{method} {path} {version}', *kept, 'Connection: close', '', ''])).encode('latin-1'))
            await upstream_writer.drain()
        await asyncio.gather(pipe(client_reader, upstream_writer), pipe(upstream_reader, client_writer))
    except PermissionError as exc:
        note('denied', host, str(exc))
        client_writer.write(b'HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
        await client_writer.drain()
        client_writer.close()
    except (OSError, ValueError, asyncio.TimeoutError, asyncio.IncompleteReadError, asyncio.LimitOverrunError):
        if not client_writer.is_closing():
            client_writer.write(b'HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
            client_writer.close()


def stop_orphans():
    """`docker exec` does not always kill the in-container process when systemd restarts the unit."""
    import signal
    for proc in pathlib.Path('/proc').glob('[0-9]*'):
        try:
            if int(proc.name) != os.getpid() and b'browser_guard.py' in (proc / 'cmdline').read_bytes():
                os.kill(int(proc.name), signal.SIGTERM)
        except (OSError, ValueError):
            pass


async def main():
    try:
        server = await asyncio.start_server(handle, *LISTEN, limit=65536)
    except OSError:
        stop_orphans()
        await asyncio.sleep(2)
        server = await asyncio.start_server(handle, *LISTEN, limit=65536)
    note('started', f'{LISTEN[0]}:{LISTEN[1]}')
    async with server:
        await server.serve_forever()


if __name__ == '__main__':
    asyncio.run(main())
