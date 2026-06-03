import { EventEmitter } from 'eventemitter3';
import { match } from 'ts-pattern';
import type { SimEvent, SimEventType } from './types.js';

export interface BusEvents {
  event: (simEvent: SimEvent) => void;
  error: (err: Error) => void;
}

export class SimEventBus extends EventEmitter<BusEvents> {
  /**
   * In-memory sequence counter for ephemeral (non-persisted) event ordering.
   * This is NOT the authoritative sequence — sequence numbers for persisted
   * events are assigned by appendEventPayload in @arena/db, which derives
   * them from MAX(seq)+1 at write time. Do not use ephemeralSeq() to assign
   * DB-level sequences. (WR-07)
   */
  private _ephemeralSeq = 0;

  append(event: SimEvent): void {
    this.emit('event', event);
  }

  /**
   * Returns an incrementing counter for ephemeral in-memory event ordering.
   * Not connected to the persisted DB sequence — use only for non-persisted flows.
   * Renamed from nextSeq() to clarify scope. (WR-07)
   */
  ephemeralSeq(): number {
    return this._ephemeralSeq++;
  }

  /**
   * Registers a listener that fires only for events of the given type.
   * Returns a disposer function — call it to remove the listener.
   * Unlike the previous implementation, this does not leak anonymous wrappers. (CR-03)
   */
  onEventType(type: SimEventType, listener: (event: SimEvent) => void): () => void {
    const wrapper = (ev: SimEvent) => {
      if (ev.type === type) listener(ev);
    };
    this.on('event', wrapper);
    return () => this.off('event', wrapper);
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
    .with('PAPER_ORDER_REJECTED', () => 'Paper order rejected before broker mutation')
    .with('PAPER_ORDER_FILLED', () => 'Paper order filled')
    .with('POSITION_UPDATED', () => 'Position state updated')
    .with('PNL_SNAPSHOT_CREATED', () => 'P&L snapshot recorded')
    .with('STRATEGY_SWITCHED', () => 'Agent switched active strategy')
    .with('STRATEGY_SWITCH_REQUESTED', () => 'Agent requested a strategy switch')
    .with('RATE_LIMIT_DELAYED', () => 'Operation delayed by rate limiter')
    .with('FEED_DISCONNECTED', () => 'Feed disconnected')
    .with('FEED_RECONNECTED', () => 'Feed reconnected')
    .exhaustive();
}

export function createEventBus(): SimEventBus {
  return new SimEventBus();
}
