import { describe, expect, it } from 'vitest';
import { doNothingBaseline } from '../built-ins/do-nothing-baseline.js';
import { momentumBasic } from '../built-ins/momentum-basic.js';
import { createDefaultRegistry, defaultRegistry } from '../default-registry.js';
import { StrategyRegistry } from '../registry.js';
import type { Strategy } from '../types.js';

const stubStrategy = (id: string): Strategy => ({
  id,
  name: `Strategy ${id}`,
  version: '0.0.1',
  onStart() {},
  onMarketEvent() {
    return [];
  },
});

describe('StrategyRegistry', () => {
  it('registers and retrieves a strategy', () => {
    const reg = new StrategyRegistry();
    const s = stubStrategy('alpha');
    reg.register(s);
    expect(reg.get('alpha')).toBe(s);
  });

  it('has() returns true after register', () => {
    const reg = new StrategyRegistry();
    reg.register(stubStrategy('beta'));
    expect(reg.has('beta')).toBe(true);
    expect(reg.has('gamma')).toBe(false);
  });

  it('throws when registering duplicate id', () => {
    const reg = new StrategyRegistry();
    reg.register(stubStrategy('dup'));
    expect(() => reg.register(stubStrategy('dup'))).toThrow(/already registered/);
  });

  it('list() returns descriptors for all registered strategies', () => {
    const reg = new StrategyRegistry();
    reg.register(stubStrategy('s1'));
    reg.register(stubStrategy('s2'));
    const list = reg.list();
    expect(list).toHaveLength(2);
    expect(list.map((d) => d.id)).toContain('s1');
    expect(list.map((d) => d.id)).toContain('s2');
  });

  it('unregister removes the strategy', () => {
    const reg = new StrategyRegistry();
    reg.register(stubStrategy('remove-me'));
    expect(reg.unregister('remove-me')).toBe(true);
    expect(reg.has('remove-me')).toBe(false);
  });

  it('unregister returns false for unknown id', () => {
    const reg = new StrategyRegistry();
    expect(reg.unregister('never-registered')).toBe(false);
  });
});

describe('defaultRegistry', () => {
  const BUILT_IN_IDS = [
    'do-nothing-baseline',
    'momentum-basic',
    'mean-reversion-basic',
    'volatility-breakout',
    'orderbook-imbalance',
  ];

  it('contains all 5 built-in strategies', () => {
    for (const id of BUILT_IN_IDS) {
      expect(defaultRegistry.has(id)).toBe(true);
    }
  });

  it('list() returns 5 descriptors', () => {
    expect(defaultRegistry.list()).toHaveLength(5);
  });

  it('do-nothing-baseline instance is the same object', () => {
    expect(defaultRegistry.get('do-nothing-baseline')).toBe(doNothingBaseline);
  });

  it('momentum-basic instance is the same object', () => {
    expect(defaultRegistry.get('momentum-basic')).toBe(momentumBasic);
  });

  it('createDefaultRegistry returns a fresh independent registry', () => {
    const reg1 = createDefaultRegistry();
    const reg2 = createDefaultRegistry();
    reg1.unregister('do-nothing-baseline');
    expect(reg2.has('do-nothing-baseline')).toBe(true);
  });
});
