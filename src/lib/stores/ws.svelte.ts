import type { WsIncoming, WsOutgoing } from '../types';

let socket: WebSocket | null = $state(null);
let connected = $state(false);

type MessageHandler = (msg: WsIncoming) => void;
const handlers = new Set<MessageHandler>();

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.onopen = () => {
    socket = ws;
    connected = true;
  };

  ws.onclose = () => {
    socket = null;
    connected = false;
    setTimeout(connect, 2000);
  };

  ws.onerror = () => {};

  ws.onmessage = (event) => {
    try {
      const msg: WsIncoming = JSON.parse(event.data);
      for (const handler of handlers) {
        handler(msg);
      }
    } catch {}
  };
}

function send(msg: WsOutgoing) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function subscribe(handler: MessageHandler) {
  handlers.add(handler);
  return () => { handlers.delete(handler); };
}

export const ws = {
  get connected() { return connected; },
  connect,
  send,
  subscribe,
};
