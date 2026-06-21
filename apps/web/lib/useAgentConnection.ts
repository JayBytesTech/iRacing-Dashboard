'use client';

import { useEffect, useRef, useState } from 'react';
import type { SnapshotPayload } from './contracts';

export type { SnapshotPayload } from './contracts';
export type AgentStatus = 'connecting' | 'live' | 'stale' | 'disconnected';

const STALE_MS = 1000;
const DISCONNECT_MS = 3000;

export interface CapabilitiesPayload {
  telemetryTickRate?: number;
  variables?: Record<string, { available?: boolean }>;
  sessionInfoSections?: string[];
}

export interface MessageLogEntry {
  seq: number;
  type: string;
  at: number;
}

export interface UseAgentOptions {
  /** Keep a rolling log of every inbound message. Opt-in so the live page avoids the extra renders. */
  trackMessages?: boolean;
}

/**
 * Subscribes to the agent WebSocket and exposes the latest snapshot plus a derived connection
 * status. Auto-reconnects, and downgrades to 'stale'/'disconnected' purely from data age so a
 * frozen socket can't masquerade as live (see ConnectionBanner rules in the dashboard spec).
 *
 * The debug page opts into capabilities/hello/message-log capture; the live page ignores them.
 */
export function useAgentConnection(agentUrl: string, opts?: UseAgentOptions) {
  const trackMessages = opts?.trackMessages ?? false;
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [status, setStatus] = useState<AgentStatus>('connecting');
  const [capabilities, setCapabilities] = useState<CapabilitiesPayload | null>(null);
  const [hello, setHello] = useState<Record<string, unknown> | null>(null);
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([]);
  const [dataAgeMs, setDataAgeMs] = useState<number | null>(null);
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
          else if (msg.type === 'capabilities') setCapabilities(msg.payload);
          else if (msg.type === 'hello') setHello(msg.payload);
          if (trackMessages) {
            setMessageLog((prev) =>
              [{ seq: msg.sequence ?? -1, type: msg.type ?? '?', at: Date.now() }, ...prev].slice(0, 40),
            );
          }
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
      if (!lastMsgAt.current) return;
      const age = Date.now() - lastMsgAt.current;
      setDataAgeMs(age);
      setStatus(age > DISCONNECT_MS ? 'disconnected' : age > STALE_MS ? 'stale' : 'live');
    }, 250);

    return () => {
      closed = true;
      clearInterval(ageTimer);
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [agentUrl, trackMessages]);

  return { snapshot, status, capabilities, hello, messageLog, dataAgeMs };
}
