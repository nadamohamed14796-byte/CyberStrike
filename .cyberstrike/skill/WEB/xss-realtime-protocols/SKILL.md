# XSS in Real-Time and API Delivery Channels

Use for authorized testing where browser-executed content crosses GraphQL, WebSocket, SSE, postMessage, or API rendering boundaries.

## Coverage
- postMessage origin-validation failures.
- WebSocket and GraphQL-over-WebSocket trust boundaries.
- Server-Sent Events (SSE) rendering.
- GraphQL mutations/results/errors reaching HTML sinks.
- JSON/API response → client renderer chains.
- Payload fragmentation and multi-parameter reassembly.
- Cross-service context mismatches.

## Workflow
1. Map the protocol/channel and identify the trust boundary.
2. Identify the producer, transport encoding, client parser, and final sink.
3. For postMessage, verify exact origin checks and message schema validation.
4. For WebSockets, inspect Origin handling, authentication assumptions, and client rendering.
5. For SSE, inspect event framing, newline handling, and rendering of event data.
6. For GraphQL, trace mutation fields, errors, rich-text fields, and API results into the UI.
7. Test fragmentation only where the application actually reassembles attacker-controlled pieces.
8. Prove the resulting browser execution and security impact.

## False-positive controls
- CORS permissiveness alone is not XSS.
- A WebSocket connection alone is not CSWSH.
- GraphQL introspection alone is not XSS.
- User-controlled API data is not XSS until it reaches an executable browser sink.
- A wildcard postMessage target is not automatically exploitable; validate the receiver's origin check and sink.

## Evidence
Capture the protocol exchange, relevant headers/origin, data flow, client-side sink, and minimal reproducible execution.