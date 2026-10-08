"use client";

import { useEffect } from "react";

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const hostname = window.location.hostname;
    const localPreview = ["localhost", "127.0.0.1", "[::1]"].includes(hostname)
      || /^10\./.test(hostname)
      || /^192\.168\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

    const configure = async () => {
      if (localPreview) {
        // Localhost permits workers, HTTP LAN addresses do not. Remove only
        // this landing page's worker/cache so both previews use the live build.
        const workerUrl = new URL("/sw.js", window.location.origin).href;
        const wasControlled = navigator.serviceWorker.controller?.scriptURL === workerUrl;
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration && [registration.active, registration.waiting, registration.installing]
          .some(worker => worker?.scriptURL === workerUrl)) {
          await registration.unregister();
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter(key => key.startsWith("gosavingfood-"))
            .map(key => caches.delete(key)));
        }
        if (wasControlled) window.location.reload();
        return;
      }

      if (process.env.NODE_ENV === "production") {
        const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        await registration.update();
      }
    };

    void configure().catch(() => {});
  }, []);

  return null;
};
