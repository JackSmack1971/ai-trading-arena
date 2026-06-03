import { useEffect, useMemo, useState } from 'react';
import { TelemetryWsEnvelopeSchema, type ArenaTelemetry, type WsStatus } from '../types.js';

export function useSimulatorWs(runId: string, apiBase: string) {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const [telemetry, setTelemetry] = useState<ArenaTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    let closed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const wsBase = apiBase.replace(/^http/, 'ws');

    const connect = () => {
      setStatus(attempts === 0 ? 'connecting' : 'reconnecting');
      socket = new WebSocket(`${wsBase}/v1/telemetry/stream?runId=${encodeURIComponent(runId)}`);
      socket.addEventListener('open', () => { attempts = 0; setStatus('open'); });
      socket.addEventListener('message', (event) => {
        const parsed = TelemetryWsEnvelopeSchema.safeParse(JSON.parse(String(event.data)));
        if (parsed.success) setTelemetry(parsed.data.data);
        else { setStatus('degraded'); setError('Invalid telemetry frame.'); }
      });
      socket.addEventListener('close', () => {
        if (closed) { setStatus('closed'); return; }
        attempts += 1;
        if (attempts > 5) { setStatus('closed'); return; }
        reconnectTimer = setTimeout(connect, Math.min(250 * 2 ** attempts, 4_000));
      });
      socket.addEventListener('error', () => { setStatus('degraded'); setError('WebSocket connection error.'); });
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [apiBase, runId]);

  return useMemo(() => ({ status, telemetry, error }), [status, telemetry, error]);
}
