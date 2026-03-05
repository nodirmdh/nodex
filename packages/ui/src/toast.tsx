import { Toaster, toast } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { background: "#0f172a", color: "#fff", borderRadius: "12px" },
      }}
    />
  );
}

export { toast };
