// AI 플래너 서비스 워커 - 푸시 알림 처리

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || "AI 플래너 알림";
  const options = {
    body: data.body || "일정을 확인하세요.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: data.tag || "ai-planner",
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "앱 열기" },
      { action: "close", title: "닫기" },
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
