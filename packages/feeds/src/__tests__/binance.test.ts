import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BinanceFeedAdapter } from '../clients/binance.js';
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

describe('BinanceFeedAdapter Tests', () => {
  let adapter: BinanceFeedAdapter;

  beforeEach(() => {
    adapter = new BinanceFeedAdapter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should connect and subscribe to trade streams', async () => {
    const connectPromise = adapter.connect({ symbols: ['BTC-USDT'] });

    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    await adapter.subscribe(['BTC-USDT']);

    const mockWS = (WebSocket as any).lastInstance;
    expect(mockWS).toBeDefined();
    expect(mockWS.send).toHaveBeenCalled();

    const sentData = JSON.parse(mockWS.send.mock.calls[0][0]);
    expect(sentData.method).toBe('SUBSCRIBE');
    expect(sentData.params).toContain('btcusdt@trade');
  });

  it('should process trade message, mapping symbol correctly, and calling event handler', async () => {
    const events: any[] = [];
    adapter.onEvent(ev => events.push(ev));

    const connectPromise = adapter.connect({ symbols: ['BTC-USDT'] });
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    const mockWS = (WebSocket as any).lastInstance;

    // Subscribe to symbol first to setup mapping
    await adapter.subscribe(['BTC-USDT']);

    // Simulate Binance trade message
    const rawTrade = {
      e: 'trade',
      E: 1234567890123,
      s: 'BTCUSDT',
      t: 9999,
      p: '54000.50',
      q: '0.12',
      T: Date.now(),
    };

    const messageHandler = mockWS.listeners['message']?.[0];
    expect(messageHandler).toBeDefined();
    messageHandler(Buffer.from(JSON.stringify(rawTrade)));

    expect(events).toHaveLength(1);
    expect(events[0].last).toBe('54000.50');
    expect(events[0].symbol).toBe('BTC-USDT'); // Should map back from BTCUSDT to BTC-USDT
    expect(events[0].volume).toBe('0.12');
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

    // First heartbeat tick: ping sent, isAlive set to false
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockWS.ping).toHaveBeenCalledTimes(1);
    expect(mockWS.terminate).not.toHaveBeenCalled();

    // Simulate pong received — resets isAlive
    const pongHandler = mockWS.listeners['pong']?.[0];
    expect(pongHandler).toBeDefined();
    pongHandler();

    // Second heartbeat tick: isAlive was true, so ping again (not terminate)
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
    // Advance past heartbeat interval — no ping should be sent after disconnect
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockWS.ping).not.toHaveBeenCalled();
  });
});
