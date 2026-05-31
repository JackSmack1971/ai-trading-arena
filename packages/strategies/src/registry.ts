import type { Strategy, StrategyDescriptor } from './types.js';

export class StrategyRegistry {
  private readonly strategies = new Map<string, Strategy>();

  register(strategy: Strategy): void {
    if (this.strategies.has(strategy.id)) {
      throw new Error(`Strategy '${strategy.id}' is already registered`);
    }
    this.strategies.set(strategy.id, strategy);
  }

  get(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }

  has(id: string): boolean {
    return this.strategies.has(id);
  }

  list(): StrategyDescriptor[] {
    return Array.from(this.strategies.values()).map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version,
    }));
  }

  unregister(id: string): boolean {
    return this.strategies.delete(id);
  }
}
