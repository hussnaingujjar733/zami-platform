"use client";

import { useEffect, useState } from "react";

export function ApiStatus() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    fetch("/api/backend/")
      .then((r) => (r.ok ? setStatus("online") : setStatus("offline")))
      .catch(() => setStatus("offline"));
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-xs font-bold text-slate-300 backdrop-blur-xl">
      <span className={status === "online" ? "text-emerald-400" : status === "offline" ? "text-red-400" : "text-yellow-400"}>
        ●
      </span>{" "}
      API {status === "online" ? "connectée" : status === "offline" ? "hors ligne" : "vérification"}
    </div>
  );
}
