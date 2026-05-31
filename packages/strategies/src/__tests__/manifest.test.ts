import { describe, expect, it } from 'vitest';
import { ManifestValidationError, parseManifestYaml } from '../manifest.js';

const VALID_YAML = `
id: my-strategy
name: My Strategy
version: 0.1.0
entry: strategy.ts
permissions:
  network: false
  filesystem: false
  can_emit_orders: false
  can_emit_signals: true
`;

describe('parseManifestYaml', () => {
  it('parses a valid manifest', () => {
    const manifest = parseManifestYaml(VALID_YAML);
    expect(manifest.id).toBe('my-strategy');
    expect(manifest.name).toBe('My Strategy');
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.entry).toBe('strategy.ts');
    expect(manifest.permissions.network).toBe(false);
    expect(manifest.permissions.filesystem).toBe(false);
    expect(manifest.permissions.can_emit_orders).toBe(false);
    expect(manifest.permissions.can_emit_signals).toBe(true);
  });

  it('parses can_emit_signals: false as valid', () => {
    const yaml = VALID_YAML.replace('can_emit_signals: true', 'can_emit_signals: false');
    const manifest = parseManifestYaml(yaml);
    expect(manifest.permissions.can_emit_signals).toBe(false);
  });

  it('throws ManifestValidationError for missing id', () => {
    const yaml = `
name: My Strategy
version: 0.1.0
entry: strategy.ts
permissions:
  network: false
  filesystem: false
  can_emit_orders: false
  can_emit_signals: true
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('throws ManifestValidationError when network: true', () => {
    const yaml = VALID_YAML.replace('network: false', 'network: true');
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('throws ManifestValidationError when can_emit_orders: true', () => {
    const yaml = VALID_YAML.replace('can_emit_orders: false', 'can_emit_orders: true');
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('throws ManifestValidationError for missing entry', () => {
    const yaml = `
id: my-strategy
name: My Strategy
version: 0.1.0
permissions:
  network: false
  filesystem: false
  can_emit_orders: false
  can_emit_signals: true
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('error message includes the issue path', () => {
    const yaml = VALID_YAML.replace('network: false', 'network: true');
    try {
      parseManifestYaml(yaml);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestValidationError);
      const e = err as ManifestValidationError;
      expect(e.issues.length).toBeGreaterThan(0);
    }
  });
});
