import * as Network from 'expo-network';

export interface DiscoveredServer {
  ip: string;
  port: number;
  host: string;
  playerCount: number;
  started: boolean;
}

const TIMEOUT_MS = 800;
const CONCURRENCY = 30;

async function probe(
  ip: string,
  port: number,
  outerSignal?: AbortSignal,
): Promise<DiscoveredServer | null> {
  if (outerSignal?.aborted) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Abort the probe if the outer scan is cancelled
  const onOuter = () => controller.abort();
  outerSignal?.addEventListener('abort', onOuter);

  try {
    const res = await fetch(`http://${ip}:${port}/discover`, { signal: controller.signal });
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', onOuter);
    if (!res.ok) return null;
    const data = await res.json() as { host: string; playerCount: number; started: boolean };
    return { ip, port, host: data.host, playerCount: data.playerCount, started: data.started };
  } catch {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', onOuter);
    return null;
  }
}

/**
 * Scans all 254 hosts on the local /24 subnet using a concurrency-limited
 * pool. Firing all 254 at once saturates the mobile network stack — most
 * requests queue and hit the timeout before they're even sent. CONCURRENCY
 * keeps at most N probes in-flight at a time so every host actually gets
 * a connection attempt.
 *
 * Calls `onFound` as each server responds.
 */
export async function scanForServers(
  port: number,
  onFound: (server: DiscoveredServer) => void,
  signal?: AbortSignal,
): Promise<DiscoveredServer[]> {
  let myIp: string;
  try {
    myIp = await Network.getIpAddressAsync();
  } catch {
    return [];
  }

  const parts = myIp.split('.');
  if (parts.length !== 4) return [];
  const base = parts.slice(0, 3).join('.');

  const found: DiscoveredServer[] = [];
  const ips = Array.from({ length: 254 }, (_, i) => `${base}.${i + 1}`);
  let index = 0;

  async function worker() {
    while (index < ips.length) {
      if (signal?.aborted) return;
      const ip = ips[index++];
      const server = await probe(ip, port, signal);
      if (server && !signal?.aborted) {
        found.push(server);
        onFound(server);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);
  return found;
}
