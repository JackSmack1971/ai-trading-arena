// Core simulator safety constant — never changes.
export const REAL_TRADING_ENABLED = false as const;

export const SIMULATOR_VERSION = '0.0.0' as const;

export const DEFAULT_STARTING_BALANCE_USD = '10000.00' as const;

export const AGENT_DECISION_TIMEOUT_MS = 30_000 as const;

export const MAX_AGENT_THESIS_LENGTH = 1000 as const;

export const MAX_BARS_IN_OBSERVATION = 100 as const;

export const MAX_OPEN_ORDERS_PER_AGENT = 20 as const;

export const HEARTBEAT_INTERVAL_MS = 30_000 as const;

export const MAX_RECONNECT_ATTEMPTS = 10 as const;
