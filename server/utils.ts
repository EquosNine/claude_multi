import type { ServerWebSocket } from "bun";
import type { WsData } from "./types";

const sockets = new Set<ServerWebSocket<WsData>>();

export function registerSocket(ws: ServerWebSocket<WsData>) {
  sockets.add(ws);
}

export function unregisterSocket(ws: ServerWebSocket<WsData>) {
  sockets.delete(ws);
}

export function sendTo(ws: ServerWebSocket<WsData>, msg: object) {
  try { ws.send(JSON.stringify(msg)); } catch {}
}

export function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  for (const ws of sockets) {
    try { ws.send(data); } catch {}
  }
}

export function findPort(preferred: number): number {
  for (let p = preferred; p < preferred + 10; p++) {
    try {
      const test = Bun.listen({ hostname: "0.0.0.0", port: p, socket: {
        data() {}, open() {}, close() {}, error() {},
      }});
      test.stop(true);
      return p;
    } catch {}
  }
  return preferred;
}
