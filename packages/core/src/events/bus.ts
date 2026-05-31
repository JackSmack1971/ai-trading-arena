import { EventEmitter } from 'eventemitter3';
import { match } from 'ts-pattern';
import type { SimEvent, SimEventType } from './types.js';

export interface BusEvents {
  event: (simEvent: SimEvent) => void;
  error: (err: Error) => void;
}

export class SimEventBus extends EventEmitter<BusEvents> {
  private _seq = 0;

  append(event: SimEvent): void {
    this.emit('event', event);
  }

  nextSeq(): number {
    return this._seq++;
  }

  // Route event to a type-specific listener in addition to the generic one.
  onEventType(type: SimEventType, listener: (event: SimEvent) => void): this {
    return this.on('event', (ev) => {
      if (ev.type === type) listener(ev);
    });
  }
}

export function describeEventType(type: SimEventType): string {
  return match(type)
    .with('MARKET_TICK_RECEIVED', () => 'Market tick received from feed')
    .with('ORDERBOOK_UPDATED', () => 'Order book updated')
    .with('BAR_CLOSED', () => 'OHLCV bar closed')
    .with('STRATEGY_SIGNAL_CREATED', () => 'Strategy emitted a signal')
    .with('AGENT_DECISION_REQUESTED', () => 'Agent decision cycle started')
    .with('AGENT_DECISION_RECEIVED', () => 'Agent returned a valid decision')
    .with('AGENT_DECISION_INVALID', () => 'Agent returned an invalid decision — NOOP applied')
    .with('RISK_CHECK_PASSED', () => 'Risk gate approved the action')
    .with('RISK_CHECK_REJECTED', () => 'Risk gate rejected the action')
    .with('PAPER_ORDER_CREATED', () => 'Paper order created in broker')
    .with('PAPER_ORDER_AMENDED', () => 'Paper order amended')
    .with('PAPER_ORDER_CANCELLED', () => 'Paper order cancelled')
    .with('PAPER_ORDER_FILLED', () => 'Paper order filled')
    .with('POSITION_UPDATED', () => 'Position state updated')
    .with('PNL_SNAPSHOT_CREATED', () => 'P&L snapshot recorded')
    .with('STRATEGY_SWITCHED', () => 'Agent switched active strategy')
    .with('RATE_LIMIT_DELAYED', () => 'Operation delayed by rate limiter')
    .with('FEED_DISCONNECTED', () => 'Feed disconnected')
    .with('FEED_RECONNECTED', () => 'Feed reconnected')
    .exhaustive();
}

export function createEventBus(): SimEventBus {
  return new SimEventBus();
}
