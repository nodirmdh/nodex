import { useEffect, useState } from "react";
import { listActiveOrders, telegramAuth, updateOrderStatus } from "./api";

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
};

function readTelegramInitData() {
  const tg = (window as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  tg?.ready?.();
  return tg?.initData ?? "";
}

export function App() {
  const [initData, setInitData] = useState("");
  const [authed, setAuthed] = useState(false);
  const [ordersJson, setOrdersJson] = useState("[]");
  const [statusOrderId, setStatusOrderId] = useState("");
  const [statusValue, setStatusValue] = useState("PREPARING");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setInitData(readTelegramInitData());
  }, []);

  const login = async () => {
    setMessage(null);
    try {
      if (!initData.trim()) {
        throw new Error("Telegram initData is required");
      }
      await telegramAuth(initData.trim());
      setAuthed(true);
      await refreshOrders();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Auth failed");
    }
  };

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

  if (!authed) {
    return (
      <main className="shell">
        <h1>Nodex Vendor Mini App</h1>
        <p>Authenticate with Telegram WebApp initData</p>
        <textarea
          value={initData}
          onChange={(event) => setInitData(event.target.value)}
          rows={6}
          placeholder="initData"
        />
        <button onClick={() => void login()}>Login via Telegram</button>
        {message && <p className="error">{message}</p>}
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
