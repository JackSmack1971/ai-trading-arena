import http from 'http';

export const strategy = {
  id: 'adversarial-http',
  name: 'Adversarial Http',
  version: '0.1.0',
  onStart() {
    void http;
  },
  onMarketEvent() {
    return [];
  },
};
