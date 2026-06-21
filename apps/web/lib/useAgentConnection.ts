'use client';

import { useEffect, useRef, useState } from 'react';
import type { SnapshotPayload } from './contracts';

export type { SnapshotPayload } from './contracts';
export type AgentStatus = 'connecting' | 'live' | 'stale' | 'disconnected';

const STALE_MS = 1000;
const DISCONNECT_MS = 3000;

/**
 * Subscribes to the agent WebSocket and exposes the latest snapshot plus a derived connection
 * status. Auto-reconnects, and downgrades to 'stale'/'disconnected' purely from data age so a
 * frozen socket can't masquerade as live (see ConnectionBanner rules in the dashboard spec).
 */
export function useAgentConnection(agentUrl: string) {
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [status, setStatus] = useState<AgentStatus>('connecting');
  const lastMsgAt = useRef<number>(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let closed = false;

    const connect = () => {
      setStatus('connecting');
      ws = new WebSocket(agentUrl);
      ws.onmessage = (e) => {
        lastMsgAt.current = Date.now();
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'liveSnapshot') setSnapshot(msg.payload);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus('disconnected');
        reconnectTimer = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws?.close();
    };
    connect();

    const ageTimer = setInterval(() => {
      const age = Date.now() - lastMsgAt.current;
      if (!lastMsgAt.current) return;
      setStatus(age > DISCONNECT_MS ? 'disconnected' : age > STALE_MS ? 'stale' : 'live');
    }, 250);

    return () => {
      closed = true;
      clearInterval(ageTimer);
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [agentUrl]);

  return { snapshot, status };
}
