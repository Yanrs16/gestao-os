"use client";

import { useState, useEffect } from "react";
import { registerServiceWorkerAndSubscribe } from "@/lib/push";

export default function NotificationToggle() {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const sub = await registerServiceWorkerAndSubscribe();
      if (sub) {
        setPermission("granted");
        alert("Notificações ativadas com sucesso neste dispositivo! 🔔");
      } else {
        setPermission(Notification.permission);
      }
    } catch (err) {
      console.error(err);
      alert("Não foi possível ativar as notificações.");
    } finally {
      setLoading(false);
    }
  };

  if (permission === "unsupported") {
    return (
      <span className="text-xs text-gray-400">
        Navegador não suporta notificações Push.
      </span>
    );
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
        <span>🔔 Notificações ativadas neste celular/navegador</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleEnableNotifications}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      {loading ? "Ativando..." : "🔔 Ativar Notificações no Celular/Navegador"}
    </button>
  );
}
