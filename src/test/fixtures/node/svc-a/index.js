// Test fixture (MS-018 / ADR-018 readiness gate). A slow-booting HTTP service: it waits
// ~4s before it starts listening, so a run-group readiness gate (port 7801, or HTTP 200 at
// http://localhost:7801/) has to poll and wait. This lets F5 confirm that a dependent
// member (svc-b) starts only after svc-a is actually accepting connections — not merely
// when its process spawned. Long-lived (never exits) so it also exercises group teardown.
const http = require('node:http');

const PORT = 7801;
const BOOT_DELAY_MS = 4000;

console.log(`[svc-a] booting… will listen on port ${PORT} in ${BOOT_DELAY_MS}ms`);

setTimeout(() => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('svc-a ready\n');
  });
  server.listen(PORT, () => console.log(`[svc-a] listening on http://localhost:${PORT} — READY`));
}, BOOT_DELAY_MS);
