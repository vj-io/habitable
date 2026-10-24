"use client";

import { useEffect, useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Registers the offline service worker (production only) and says so when the phone has no connection. */
export function Offline() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (online) return null;
  return (
    <p role="status" className="sticky top-0 z-40 bg-ink px-4 py-2 text-center font-mono text-[0.8125rem] tracking-[0.04em] text-paper">
      Offline · your case is saved on this phone. The AI and building records come back with a connection.
    </p>
  );
}
