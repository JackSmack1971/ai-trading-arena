import { WebSocketServer } from 'ws';

export function startMockWsServer(port: number) {
  const server = new WebSocketServer({ port });
  server.on('connection', (socket) => {
    for (let i = 0; i < 5; i += 1) {
      setTimeout(() => socket.send(JSON.stringify({ type: 'tick', price: 50000 + i })), i * 100);
    }
  });
  return server;
}
