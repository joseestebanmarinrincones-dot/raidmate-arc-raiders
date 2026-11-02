#!/usr/bin/env python3
"""Tiny local server for RaidMate.

It serves the static app and proxies two optional live endpoints:

  /api/events?region=europe
  /api/market?item=frigate-inductor

The app works without this server (GitHub Pages / static files). The server is
only needed for live event timers and on-demand marketplace medians.
"""

from __future__ import annotations

import argparse
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = 8765
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
VALID_REGIONS = {"europe", "north-america", "brazil", "east-asia", "oceania"}
ITEM_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,120}$")
MARKET_RE = re.compile(
    r"MetaForge Marketplace Value \(24h Median\).{0,900}?([\d,]+)\s*Seeds",
    re.IGNORECASE | re.DOTALL,
)
UPDATED_RE = re.compile(r"Updated on ([A-Z][a-z]{2} \d{1,2}, 20\d{2})")

events_cache: dict[str, tuple[float, dict]] = {}
market_cache: dict[str, tuple[float, dict]] = {}
upstream_lock = threading.Lock()
last_upstream_request = 0.0


def upstream_get(url: str, timeout: int = 30) -> bytes:
    global last_upstream_request
    with upstream_lock:
        wait = 0.6 - (time.monotonic() - last_upstream_request)
        if wait > 0:
            time.sleep(wait)
        last_upstream_request = time.monotonic()
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


class Handler(SimpleHTTPRequestHandler):
    server_version = "RaidMateLocal/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:  # quieter logs
        if args and str(args[0]).startswith("GET /api/"):
            return
        super().log_message(fmt, *args)

    def end_headers(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        if path.startswith("/api/"):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
        elif path.endswith((".html", ".js", ".css", ".json", ".webmanifest")):
            self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json({"ok": True, "app": "raidmate", "live": True})
            return
        if parsed.path == "/api/events":
            self.handle_events(parsed)
            return
        if parsed.path == "/api/market":
            self.handle_market(parsed)
            return
        if parsed.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def handle_events(self, parsed: urllib.parse.ParseResult) -> None:
        params = urllib.parse.parse_qs(parsed.query)
        region = (params.get("region") or ["europe"])[0]
        if region not in VALID_REGIONS:
            self.send_json({"error": "unknown region"}, 400)
            return
        now = time.monotonic()
        cached = events_cache.get(region)
        if cached and now - cached[0] < 60:
            self.send_json(cached[1])
            return
        url = (
            "https://metaforge.app/api/arc-raiders/events-schedule?"
            f"region={urllib.parse.quote(region)}&includeAll=true"
        )
        try:
            upstream = json.loads(upstream_get(url).decode("utf-8"))
            events = []
            for event in upstream.get("data", []):
                start = event.get("startTime")
                end = event.get("endTime")
                if start and end and end > start:
                    events.append(
                        [
                            event.get("name"),
                            event.get("map"),
                            int(start),
                            int(end),
                        ]
                    )
            events.sort(key=lambda item: item[2])
            payload = {
                "region": upstream.get("region", region),
                "fetchedAt": int(time.time() * 1000),
                "events": events,
                "live": True,
                "attribution": "MetaForge (metaforge.app/arc-raiders)",
            }
            events_cache[region] = (now, payload)
            self.send_json(payload)
        except Exception as exc:
            self.send_json({"error": str(exc), "region": region, "events": []}, 502)

    def handle_market(self, parsed: urllib.parse.ParseResult) -> None:
        params = urllib.parse.parse_qs(parsed.query)
        item_id = (params.get("item") or [""])[0].strip().lower()
        if not ITEM_RE.match(item_id):
            self.send_json({"error": "invalid item id"}, 400)
            return
        now = time.monotonic()
        cached = market_cache.get(item_id)
        if cached and now - cached[0] < 10 * 60:
            self.send_json(cached[1])
            return
        url = f"https://metaforge.app/arc-raiders/database/item/{urllib.parse.quote(item_id)}"
        try:
            html = upstream_get(url, timeout=35).decode("utf-8", "ignore")
            match = MARKET_RE.search(html)
            seeds = int(match.group(1).replace(",", "")) if match else None
            updated_match = UPDATED_RE.search(html)
            payload = {
                "item": item_id,
                "seeds": seeds,
                "updatedLabel": updated_match.group(1) if updated_match else None,
                "live": True,
                "fetchedAt": int(time.time() * 1000),
            }
            market_cache[item_id] = (now, payload)
            self.send_json(payload)
        except urllib.error.HTTPError as exc:
            self.send_json({"error": f"upstream HTTP {exc.code}", "item": item_id}, 502)
        except Exception as exc:
            self.send_json({"error": str(exc), "item": item_id}, 502)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run RaidMate locally")
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--open", action="store_true", help="Open the browser after starting")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser")
    args = parser.parse_args()
    port = args.port
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{port}/"
    print()
    print("  RAIDMATE — servidor local")
    print(f"  Abre: {url}")
    print("  Endpoints live: /api/events · /api/market")
    print("  Ctrl+C para detener.")
    print()
    if args.open and not args.no_open:
        threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
