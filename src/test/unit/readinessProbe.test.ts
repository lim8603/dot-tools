import { strict as assert } from 'node:assert';
import { getEventListeners } from 'node:events';
import * as net from 'node:net';
import { probePort, waitForReadiness } from '../../core/readinessProbe';

/** Listen on `host` (port 0 = any free port); resolves the server and its port. */
function listen(host: string): Promise<{ server: net.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => socket.destroy());
    server.once('error', reject);
    server.listen(0, host, () => resolve({ server, port: (server.address() as net.AddressInfo).port }));
  });
}

describe('readinessProbe (real sockets)', () => {
  it('treats a service listening on ::1 only as ready', async function () {
    let listening: { server: net.Server; port: number };
    try {
      listening = await listen('::1');
    } catch {
      this.skip(); // host without IPv6 loopback
      return;
    }
    try {
      const result = await waitForReadiness({ kind: 'port', port: listening.port, timeoutMs: 3000 });
      assert.equal(result.ready, true);
    } finally {
      listening.server.close();
    }
  });

  it('detaches its abort listener when an attempt settles', async () => {
    const { server, port } = await listen('127.0.0.1');
    try {
      const controller = new AbortController();
      for (let i = 0; i < 5; i++) {
        assert.equal(await probePort('127.0.0.1', port, controller.signal), true);
      }
      assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
    } finally {
      server.close();
    }
  });
});
