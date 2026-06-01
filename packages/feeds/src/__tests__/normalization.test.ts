import { describe, expect, it } from 'vitest';
import { normalizeCoinbaseTick } from '../normalizers/coinbase.js';
import { normalizeBinanceTrade } from '../normalizers/binance.js';
import { NormalizedMarketEventSchema } from '@arena/core';

describe('Feed Normalization Tests', () => {
  describe('Coinbase Normalization', () => {
    it('should successfully normalize a valid Coinbase ticker message', () => {
      const rawMsg = {
        type: 'ticker',
        sequence: 123456789,
        product_id: 'BTC-USD',
        price: '50000.12',
        open_24h: '49000.00',
        volume_24h: '120.5',
        low_24h: '48500.00',
        high_24h: '51000.00',
        best_bid: '50000.10',
        best_ask: '50000.15',
        time: '2026-05-31T20:30:12.000000Z',
      };

      const normalized = normalizeCoinbaseTick(rawMsg);

      // Verify schema compliance
      const parsed = NormalizedMarketEventSchema.safeParse(normalized);
      expect(parsed.success).toBe(true);

      // Assert correct field mapping
      expect(normalized.eventId).toBe('coinbase-BTC-USD-123456789');
      expect(normalized.sourceId).toBe('coinbase');
      expect(normalized.symbol).toBe('BTC-USD');
      expect(normalized.eventType).toBe('MARKET_TICK_RECEIVED');
      expect(normalized.exchangeTimestamp).toBe(rawMsg.time);
      expect(normalized.last).toBe('50000.12');
      expect(normalized.close).toBe('50000.12');
      expect(normalized.open).toBe('49000.00');
      expect(normalized.high).toBe('51000.00');
      expect(normalized.low).toBe('48500.00');
      expect(normalized.bid).toBe('50000.10');
      expect(normalized.ask).toBe('50000.15');
      expect(normalized.volume).toBe('120.5');
    });

    it('should handle missing fields in Coinbase ticker message gracefully', () => {
      const rawMsg = {
        type: 'ticker',
        product_id: 'ETH-USD',
        price: '3000.50',
      };

      const normalized = normalizeCoinbaseTick(rawMsg);
      const parsed = NormalizedMarketEventSchema.safeParse(normalized);
      expect(parsed.success).toBe(true);

      expect(normalized.eventId).toContain('coinbase-ETH-USD-');
      expect(normalized.last).toBe('3000.50');
      expect(normalized.close).toBe('3000.50');
      expect(normalized.bid).toBeUndefined();
      expect(normalized.ask).toBeUndefined();
    });
  });

  describe('Binance Normalization', () => {
    it('should successfully normalize a valid Binance trade message', () => {
      const rawMsg = {
        e: 'trade',
        E: 1234567890123,
        s: 'BTC-USDT',
        t: 987654321,
        p: '50000.50',
        q: '0.005',
        b: 1111,
        a: 2222,
        T: 1774907400000, // microsecond timestamp
        m: true,
        M: true,
      };

      const normalized = normalizeBinanceTrade(rawMsg);

      // Verify schema compliance
      const parsed = NormalizedMarketEventSchema.safeParse(normalized);
      expect(parsed.success).toBe(true);

      // Assert correct field mapping
      expect(normalized.eventId).toBe('binance-BTC-USDT-987654321');
      expect(normalized.sourceId).toBe('binance');
      expect(normalized.symbol).toBe('BTC-USDT');
      expect(normalized.eventType).toBe('MARKET_TICK_RECEIVED');
      expect(normalized.exchangeTimestamp).toBe(new Date(rawMsg.T).toISOString());
      expect(normalized.last).toBe('50000.50');
      expect(normalized.close).toBe('50000.50');
      expect(normalized.volume).toBe('0.005');
    });

    it('should handle missing transaction timestamp in Binance trade message gracefully', () => {
      const rawMsg = {
        e: 'trade',
        s: 'SOL-USDT',
        t: 456789,
        p: '150.25',
        q: '12.5',
      };

      const normalized = normalizeBinanceTrade(rawMsg);
      const parsed = NormalizedMarketEventSchema.safeParse(normalized);
      expect(parsed.success).toBe(true);

      expect(normalized.eventId).toBe('binance-SOL-USDT-456789');
      expect(normalized.last).toBe('150.25');
      expect(normalized.volume).toBe('12.5');
    });
  });
});
