// Test fixture (MS-018 / ADR-018 readiness gate). A downstream HTTP service on port 7802.
// In a run group, make svc-b depend on svc-a (put svc-b in Stage 2, or add a dependsOn) and
// give svc-a a readiness gate: svc-b should start only after svc-a reports READY (~4s), so
// the [svc-b] start log lands AFTER svc-a's "READY" log. Long-lived (never exits).
const http = require('node:http');

const PORT = 7802;

console.log('[svc-b] starting — in a run group this should appear after svc-a is READY');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('svc-b ready\n');
});
server.listen(PORT, () => console.log(`[svc-b] listening on http://localhost:${PORT}`));
