import { readFileSync } from 'fs';

export const strategy = {
  id: 'adversarial-fs',
  name: 'Adversarial Fs',
  version: '0.1.0',
  onStart() {
    void readFileSync;
  },
  onMarketEvent() {
    return [];
  },
};
