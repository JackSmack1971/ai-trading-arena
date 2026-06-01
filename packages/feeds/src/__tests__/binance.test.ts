import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BinanceFeedAdapter } from '../clients/binance.js';
import { WebSocket } from 'ws';

// Mock ws module
vi.mock('ws', () => {
  const mockSend = vi.fn();
  const mockClose = vi.fn();
  const mockPing = vi.fn();
  const mockTerminate = vi.fn();
  
  type MockListener = (...args: unknown[]) => void;

  class MockWebSocket {
    static OPEN = 1;
    static CLOSED = 3;
    static lastInstance: any = null;
    listeners: Record<string, MockListener[]> = {};

    constructor(_url: string) {
      MockWebSocket.lastInstance = this;
      setTimeout(() => {
        if (this.listeners['open']) {
          this.listeners['open'].forEach(cb => cb());
        }
      }, 0);
    }

    on(event: string, callback: MockListener) {
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

    const subscribePromise = adapter.subscribe(['BTC-USDT']);
    await vi.advanceTimersByTimeAsync(1000);
    await subscribePromise;
    
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
    const subscribePromise = adapter.subscribe(['BTC-USDT']);
    await vi.advanceTimersByTimeAsync(1000);
    await subscribePromise;

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

  it('multi-hyphen symbol BTC-PERP-USD maps to btcperpusd stream key and back', async () => {
    const receivedEvents: any[] = [];
    adapter.onEvent(ev => receivedEvents.push(ev));

    const connectPromise = adapter.connect({ symbols: ['BTC-PERP-USD'] });
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    const mockWS = (WebSocket as any).lastInstance;

    // Subscribe — symbolMap should use global replace: 'btcperpusd'
    const subscribePromise = adapter.subscribe(['BTC-PERP-USD']);
    await vi.advanceTimersByTimeAsync(1000);
    await subscribePromise;

    const subscribeCall = mockWS.send.mock.calls.find((c: any[]) => {
      const msg = JSON.parse(c[0]);
      return msg.method === 'SUBSCRIBE';
    });
    expect(subscribeCall).toBeDefined();
    const subscribeMsg = JSON.parse(subscribeCall[0]);
    expect(subscribeMsg.params).toContain('btcperpusd@trade');

    // Simulate Binance returning message with s='BTCPERPUSD' (all-caps, no hyphens)
    const rawTrade = {
      e: 'trade',
      E: 1234567890123,
      s: 'BTCPERPUSD',
      t: 12345,
      p: '100.00',
      q: '0.5',
      T: Date.now(),
    };

    const messageHandler = mockWS.listeners['message']?.[0];
    expect(messageHandler).toBeDefined();
    messageHandler(Buffer.from(JSON.stringify(rawTrade)));

    // eventHandler must have been called with the original symbol restored
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].symbol).toBe('BTC-PERP-USD');
  });

  it('terminates stale websocket connections after a missed pong heartbeat', async () => {
    const connectPromise = adapter.connect({ symbols: ['BTC-USD'] });
    await vi.advanceTimersByTimeAsync(1);
    await connectPromise;

    const mockWS = (WebSocket as any).lastInstance;
    await vi.advanceTimersByTimeAsync(60_000);

    expect(mockWS.ping).toHaveBeenCalled();
    expect(mockWS.terminate).toHaveBeenCalled();
  });

});
