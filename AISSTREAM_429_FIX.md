# AISStream HTTP 429 / concurrent connection fix

## What was changed

- The live worker now treats `concurrent connections per user exceeded` and related HTTP 429 messages as an account-level connection conflict.
- It stops the reconnect storm and pauses automatic reconnects for 5 minutes instead of repeatedly opening sockets.
- API-key rotation is not used for this error because AISStream's limit is account/user-level, so another key in the same account may not solve the conflict.
- The admin **Test connection** action no longer opens a second WebSocket while the live worker is running. It reports the existing worker connection instead.
- The UI now labels this state as `CONNECTION LIMIT — ANOTHER CLIENT IS CONNECTED`.

## Deployment requirement

AISStream permits only one active connection for the relevant user/account. Make sure only one Render service/environment is running `AIS_INGEST_ENABLED=true` with the same AISStream account/key.

For preview/staging services, set:

```text
AIS_INGEST_ENABLED=false
```

Keep it enabled only on the production service that should own the live feed.

After changing the environment, deploy once. Do not repeatedly redeploy to clear a 429; that can create overlapping connections during the deployment handoff.
