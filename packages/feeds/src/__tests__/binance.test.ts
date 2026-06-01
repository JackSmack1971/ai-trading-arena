import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BinanceFeedAdapter } from '../clients/binance.js';
import { WebSocket } from 'ws';

// Mock ws module
vi.mock('ws', () => {
  const mockSend = vi.fn();
  const mockClose = vi.fn();
  
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
});
