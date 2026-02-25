import { useEffect, useRef, useState, useCallback } from "react";

type Channel = "news" | "images" | "reels";

// WebSocket URL of the Express backend.
// In development: ws://localhost:3001/ws-live
// In production:  set VITE_API_URL=https://api.yourdomain.com → ws(s) is derived automatically
function buildWsUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // Explicit backend URL — convert http(s) → ws(s)
    return apiUrl.replace(/^http/, "ws") + "/ws-live";
  }
  // Production behind Caddy: derive from current page origin
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws-live`;
}

const WS_BASE = buildWsUrl();

function getToken(): string | null {
  try {
    const auth = localStorage.getItem("auth");
    if (auth) return JSON.parse(auth).token;
  } catch {}
  return null;
}

export function useRealtimeData<T = unknown>(channel: Channel): {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setError(null);
      ws.send(JSON.stringify({ subscribe: [channel] }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === channel && Array.isArray(msg.data)) {
          setData(msg.data as T[]);
          setIsLoading(false);
        }
        if (msg.type === "error") {
          setError(msg.message);
        }
      } catch {}
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        // Auto-reconnect after 3 seconds
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 3000);
      }
    };

    ws.onerror = () => {
      setError("Connection error — retrying…");
    };
  }, [channel]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const refresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ refresh: channel }));
    }
  }, [channel]);

  return { data, isLoading, error, refresh };
}
