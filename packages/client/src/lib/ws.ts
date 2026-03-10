import type { WsClientMessage, WsServerMessage } from "@dash/shared";
import { supabase } from "./supabase";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

export function createChatSocket(
  onMessage: (msg: WsServerMessage) => void,
  onClose?: () => void,
): {
  send: (msg: WsClientMessage) => void;
  close: () => void;
} {
  let ws: WebSocket | null = null;
  let pending: WsClientMessage[] = [];

  async function connect() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token || "";
    ws = new WebSocket(`${WS_BASE}/ws/chat?token=${token}`);

    ws.onopen = () => {
      for (const msg of pending) {
        ws?.send(JSON.stringify(msg));
      }
      pending = [];
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      onClose?.();
    };
  }

  connect();

  return {
    send(msg: WsClientMessage) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        pending.push(msg);
      }
    },
    close() {
      ws?.close();
    },
  };
}
