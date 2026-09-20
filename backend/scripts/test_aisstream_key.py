"""Check an AISStream key from your own machine, independent of the app.

    pip install websockets
    python test_aisstream_key.py YOUR_KEY                  # North Sea box
    python test_aisstream_key.py YOUR_KEY 22 47 30.5 60    # S W N E

Stop every other copy of the app first (other Render services, local runs, previews) — AISStream allows ONE
connection per key. Prints the HTTP status if the handshake is refused, the first frames, or how the socket is closed.
"""
import asyncio
import json
import sys

import websockets


async def main() -> None:
    key = sys.argv[1]
    s, w, n, e = (float(x) for x in sys.argv[2:6]) if len(sys.argv) >= 6 else (49.0, -6.0, 62.0, 10.0)
    try:
        async with websockets.connect("wss://stream.aisstream.io/v0/stream", open_timeout=20) as ws:
            await ws.send(json.dumps({"APIKey": key, "BoundingBoxes": [[[s, w], [n, e]]], "FilterMessageTypes": ["PositionReport"]}))
            print("connected + subscription sent; waiting up to 30 s for frames…")
            for i in range(5):
                frame = await asyncio.wait_for(ws.recv(), timeout=30)
                print(f"frame {i + 1}:", str(frame)[:240])
    except asyncio.TimeoutError:
        print("no frame within 30 s (socket stayed open: key accepted, region quiet)")
    except websockets.ConnectionClosed as exc:
        rcvd = exc.rcvd
        print("SERVER CLOSED THE SOCKET after subscription:", getattr(rcvd, "code", None), getattr(rcvd, "reason", ""))
    except Exception as exc:  # noqa: BLE001
        resp = getattr(exc, "response", None)
        print("HANDSHAKE FAILED:", type(exc).__name__, exc, "| HTTP status:", getattr(resp, "status_code", None))


asyncio.run(main())
