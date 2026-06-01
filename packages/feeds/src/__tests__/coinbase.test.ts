import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CoinbaseFeedAdapter } from '../clients/coinbase.js';
import { WebSocket } from 'ws';

// Mock ws module
vi.mock('ws', () => {
  const mockSend = vi.fn();
  const mockClose = vi.fn();
  const mockPing = vi.fn();
  const mockTerminate = vi.fn();

  class MockWebSocket {
    static OPEN = 1;
    static CLOSED = 3;
    static lastInstance: any = null;
    listeners: Record<string, Function[]> = {};

    constructor(url: string) {
      MockWebSocket.lastInstance = this;
      setTimeout(() => {
        if (this.listeners['open']) {
          this.listeners['open'].forEach(cb => cb());
        }
      }, 0);
    }

    on(event: string, callback: Function) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    }

    send = mockSend;
    close = mockClose;
    ping = mockPing;
    terminate = mockTerminate;
    readyState = 1; // OPEN
  }

  return { WebSocket: MockWebSocket };
});

describe('CoinbaseFeedAdapter Tests', () => {
  let adapter: CoinbaseFeedAdapter;

  beforeEach(() => {
    adapter = new CoinbaseFeedAdapter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should connect and subscribe to ticker channel', async () => {
    const connectPromise = adapter.connect({ symbols: ['BTC-USD'] });

    // Advance timers so open event fires
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    // Verify subscription call
    await adapter.subscribe(['BTC-USD']);

    const mockWS = (WebSocket as any).lastInstance;
    expect(mockWS).toBeDefined();
    expect(mockWS.send).toHaveBeenCalled();

    const sentData = JSON.parse(mockWS.send.mock.calls[0][0]);
    expect(sentData.type).toBe('subscribe');
    expect(sentData.product_ids).toContain('BTC-USD');
    expect(sentData.channels).toContain('ticker');
  });

  it('should process tick message and call event handler', async () => {
    const events: any[] = [];
    adapter.onEvent(ev => events.push(ev));

    const connectPromise = adapter.connect({ symbols: ['BTC-USD'] });
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    const mockWS = (WebSocket as any).lastInstance;

    // Simulate tick message
    const rawTick = {
      type: 'ticker',
      sequence: 101,
      product_id: 'BTC-USD',
      price: '55000.00',
      time: new Date().toISOString(),
    };

    const messageHandler = mockWS.listeners['message']?.[0];
    expect(messageHandler).toBeDefined();
    messageHandler(Buffer.from(JSON.stringify(rawTick)));

    expect(events).toHaveLength(1);
    expect(events[0].last).toBe('55000.00');
    expect(events[0].symbol).toBe('BTC-USD');
  });

  it('sends ping after 30s heartbeat interval', async () => {
    const connectPromise = adapter.connect({ symbols: [] });
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    const mockWS = (WebSocket as any).lastInstance;
    expect(mockWS.ping).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockWS.ping).toHaveBeenCalledTimes(1);
  });

  it('pong handler resets isAlive so subsequent ping is sent instead of terminate', async () => {
    const connectPromise = adapter.connect({ symbols: [] });
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    const mockWS = (WebSocket as any).lastInstance;

    // First heartbeat tick
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockWS.ping).toHaveBeenCalledTimes(1);
    expect(mockWS.terminate).not.toHaveBeenCalled();

    // Pong received
    const pongHandler = mockWS.listeners['pong']?.[0];
    expect(pongHandler).toBeDefined();
    pongHandler();

    // Second tick: alive again, sends ping
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockWS.ping).toHaveBeenCalledTimes(2);
    expect(mockWS.terminate).not.toHaveBeenCalled();
  });

  it('missed pong causes terminate and schedules reconnect', async () => {
    const connectPromise = adapter.connect({ symbols: [] });
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    const mockWS = (WebSocket as any).lastInstance;

    // First tick: ping sent, isAlive = false (no pong received)
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockWS.ping).toHaveBeenCalledTimes(1);

    // Second tick: isAlive still false → terminate
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockWS.terminate).toHaveBeenCalledTimes(1);
  });

  it('disconnect stops heartbeat', async () => {
    const connectPromise = adapter.connect({ symbols: [] });
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    await adapter.disconnect();

    const mockWS = (WebSocket as any).lastInstance;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockWS.ping).not.toHaveBeenCalled();
  });
});
