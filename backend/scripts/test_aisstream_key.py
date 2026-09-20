"""Check an AISStream key from your own machine, independent of the app.

    pip install websockets
    python test_aisstream_key.py YOUR_KEY            # North Sea box
    python test_aisstream_key.py YOUR_KEY 22 47 30.5 60   # S W N E

Stop every other copy of the app first (other Render services, local runs, previews) — AISStream allows ONE
connection per key. Prints the first frames and how the server closes the socket.
"""
import asyncio
import json
import sys

import websockets


async def main() -> None:
    key = sys.argv[1]
    s, w, n, e = (float(x) for x in sys.argv[2:6]) if len(sys.argv) >= 6 else (49.0, -6.0, 62.0, 10.0)
    async with websockets.connect("wss://stream.aisstream.io/v0/stream") as ws:
        await ws.send(json.dumps({"APIKey": key, "BoundingBoxes": [[[s, w], [n, e]]], "FilterMessageTypes": ["PositionReport"]}))
        print("subscription sent; waiting up to 30 s for frames…")
        try:
            for i in range(5):
                frame = await asyncio.wait_for(ws.recv(), timeout=30)
                print(f"frame {i + 1}:", str(frame)[:240])
        except asyncio.TimeoutError:
            print("no frame within 30 s (socket stayed open: key accepted, region quiet)")
        except websockets.ConnectionClosed as exc:
            rcvd = exc.rcvd
            print("SERVER CLOSED THE SOCKET:", getattr(rcvd, "code", None), getattr(rcvd, "reason", ""))


asyncio.run(main())
