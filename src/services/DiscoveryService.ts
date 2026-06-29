import * as Network from 'expo-network';

export interface DiscoveredServer {
  ip: string;
  port: number;
  host: string;
  playerCount: number;
  started: boolean;
}

const TIMEOUT_MS = 400;

async function probe(ip: string, port: number): Promise<DiscoveredServer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`http://${ip}:${port}/discover`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as { host: string; playerCount: number; started: boolean };
    return { ip, port, host: data.host, playerCount: data.playerCount, started: data.started };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Scans all 254 hosts on the local /24 subnet in parallel.
 * Calls `onFound` as each server responds, then resolves with the full list.
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

  const checks = Array.from({ length: 254 }, (_, i) => {
    if (signal?.aborted) return Promise.resolve();
    const ip = `${base}.${i + 1}`;
    return probe(ip, port).then(server => {
      if (server && !signal?.aborted) {
        found.push(server);
        onFound(server);
      }
    });
  });

  await Promise.all(checks);
  return found;
}
