import { useState, useMemo, useCallback } from 'react';
import Constants from 'expo-constants';
import { LABEL_POS } from '../components/map/RiskBoardMap';
// Bundled overrides — Metro hot-reloads this file after the server saves it.
import savedOverrides from '../constants/labelPositionsOverrides.json';

type Pos = { x: number; y: number };

/**
 * Resolves the companion-server base URL.
 * On native dev builds the Expo bundler host == the machine running the server.
 * On web the server is always on the same origin host.
 */
function serverBase(): string {
  const debuggerHost =
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8080`;
  }
  return 'http://localhost:8080';
}

async function postToServer(path: string, body: unknown): Promise<void> {
  await fetch(`${serverBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export interface LabelPositions {
  /** Defaults merged with saved overrides and any unsaved local changes. */
  positions: Record<string, Pos>;
  /** Only the changes not yet written to disk. */
  localOverrides: Record<string, Pos>;
  update: (svgId: string, x: number, y: number) => void;
  /** Writes all changes to labelPositionsOverrides.json via the server. */
  save: () => Promise<void>;
  /** Clears all overrides (restores original positions). */
  restore: () => Promise<void>;
}

/**
 * Manages label-position overrides for the map editor.
 *
 * Source priority (highest wins):
 *   localOverrides (unsaved edits)
 *   > savedOverrides (labelPositionsOverrides.json, bundled by Metro)
 *   > LABEL_POS defaults (source of truth in RiskBoardMap.tsx)
 *
 * Saving POSTs to the companion server which writes labelPositionsOverrides.json.
 * Metro detects the file change and hot-reloads, propagating the update to all
 * connected devices (phone, browser, etc.) without a full restart.
 */
export function useLabelPositions(): LabelPositions {
  const [localOverrides, setLocalOverrides] = useState<Record<string, Pos>>({});

  const positions = useMemo(
    () => ({
      ...LABEL_POS,
      ...(savedOverrides as Record<string, Pos>),
      ...localOverrides,
    }),
    [localOverrides],
  );

  const update = useCallback((svgId: string, x: number, y: number) => {
    setLocalOverrides(prev => ({ ...prev, [svgId]: { x, y } }));
  }, []);

  const save = useCallback(async () => {
    const merged: Record<string, Pos> = {
      ...(savedOverrides as Record<string, Pos>),
      ...localOverrides,
    };
    await postToServer('/save-labels', merged);
    setLocalOverrides({});
  }, [localOverrides]);

  const restore = useCallback(async () => {
    await postToServer('/save-labels', {});
    setLocalOverrides({});
  }, []);

  return { positions, localOverrides, update, save, restore };
}
