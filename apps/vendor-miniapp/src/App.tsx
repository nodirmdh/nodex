import { useEffect, useState } from "react";
import { listActiveOrders, telegramAuth, updateOrderStatus } from "./api";

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: { id?: number | string } };
  ready?: () => void;
};

function readTelegramWebApp() {
  const tg = (window as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  tg?.ready?.();
  return tg ?? null;
}

export function App() {
  const DEV_MODE =
    import.meta.env.DEV ||
    import.meta.env.VITE_DEV_MODE === "1" ||
    import.meta.env.VITE_DEV_MODE === "true";
  const [authState, setAuthState] = useState<"loading" | "ready" | "blocked">("loading");
  const [manualInitData, setManualInitData] = useState("");
  const [tgUserId, setTgUserId] = useState<string | null>(null);
  const [ordersJson, setOrdersJson] = useState("[]");
  const [statusOrderId, setStatusOrderId] = useState("");
  const [statusValue, setStatusValue] = useState("PREPARING");
  const [message, setMessage] = useState<string | null>(null);

  const login = async (initData: string) => {
    setAuthState("loading");
    setMessage(null);
    try {
      if (!initData.trim()) {
        throw new Error("Telegram initData is required");
      }
      await telegramAuth(initData);
      await refreshOrders();
      setAuthState("ready");
    } catch (err) {
      setAuthState("blocked");
      setMessage(err instanceof Error ? err.message : "Auth failed");
    }
  };

  useEffect(() => {
    const tg = readTelegramWebApp();
    if (!tg) {
      setAuthState("blocked");
      setMessage("Open this app via Telegram bot menu button.");
      return;
    }

    const initData = tg.initData?.trim() ?? "";
    const unsafeUserId = tg.initDataUnsafe?.user?.id;
    if (unsafeUserId !== undefined && unsafeUserId !== null) {
      setTgUserId(String(unsafeUserId));
    }

    if (!initData) {
      setAuthState("blocked");
      setMessage("Open this app via Telegram bot menu button.");
      return;
    }

    void login(initData);
  }, []);

  const refreshOrders = async () => {
    setMessage(null);
    try {
      const data = await listActiveOrders();
      setOrdersJson(JSON.stringify(data.orders, null, 2));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load orders");
    }
  };

  const updateStatus = async () => {
    setMessage(null);
    try {
      if (!statusOrderId.trim()) {
        throw new Error("order id is required");
      }
      const result = await updateOrderStatus(statusOrderId.trim(), statusValue);
      setMessage(`Updated: ${result.id} -> ${result.status}`);
      await refreshOrders();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (authState === "loading") {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Nodex Vendor Mini App</h1>
          <p>Authenticating via Telegram...</p>
        </section>
      </main>
    );
  }

  if (authState === "blocked") {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Nodex Vendor Mini App</h1>
          <p>Open this app via Telegram bot menu button.</p>
          {tgUserId && <p>Detected Telegram user: {tgUserId}</p>}
          {message && <p className="error">{message}</p>}
        </section>
        {DEV_MODE && (
          <section className="panel">
            <h2>DEV fallback</h2>
            <p>Use manual initData only for local development.</p>
            <textarea
              value={manualInitData}
              onChange={(event) => setManualInitData(event.target.value)}
              rows={6}
              placeholder="Paste initData"
            />
            <button onClick={() => void login(manualInitData.trim())}>Auth with initData</button>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="shell">
      <h1>Nodex Vendor Mini App</h1>
      <section className="panel">
        <h2>Active orders</h2>
        <button onClick={() => void refreshOrders()}>Refresh</button>
        <pre>{ordersJson}</pre>
      </section>

      <section className="panel">
        <h2>Update order status</h2>
        <input
          value={statusOrderId}
          onChange={(event) => setStatusOrderId(event.target.value)}
          placeholder="Order ID"
        />
        <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="PREPARING">PREPARING</option>
          <option value="READY">READY</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <button onClick={() => void updateStatus()}>Update status</button>
      </section>

      {message && <p className="error">{message}</p>}
    </main>
  );
}
