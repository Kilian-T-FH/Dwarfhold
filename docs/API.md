# Expedition API

`POST /api/expeditions` accepts JSON containing string `dwarfId` and `destination`. A successful response contains an expedition id, `completed` status, a partial resource reward, and a narrative message. A success may also contain `hostile: { name }` when a hostile force follows the traveller home (only `howling-gulch`); the client then resolves a raid. Invalid input returns 400, an unknown destination returns 404, and `blocked-pass` or `?fail=true` returns 503.

The deterministic result arrives after a configurable delay and there is no polling or server-side persisted task. Restarting the server resets expedition numbering. During Vite development, `/api` is proxied to port 4200.

| Destination | Rewards | Extra |
|---|---|---|
| `crystal-cave` | 8 stone, 1 tool | – |
| `old-mine` | 12 stone, 2 wood | first success recruits the goblin (client rule) |
| `howling-gulch` | 6 wood, 6 food | `hostile: { name: "gnoll war-band" }` → raid |
| `blocked-pass` | – | always 503 |

The client aborts a request after 10 seconds and treats it as a failed expedition.
