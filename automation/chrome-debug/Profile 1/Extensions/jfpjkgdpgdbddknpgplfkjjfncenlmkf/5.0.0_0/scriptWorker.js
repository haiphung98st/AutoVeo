/* eslint no-restricted-globals: 0, no-undef: 0 */

self.addEventListener("activate", (e) => {
    console.log("[ServiceWorker] Activated");
    e.waitUntil(clients.claim());
  });
  
  self.addEventListener("install", (e) => {
    console.log("[ServiceWorker] Installed");
    e.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener("message", (e) => {
    const { data } = e;
  
    if (!data.type) {
      return;
    }
  
    console.log(`[ServiceWorker] Received message: ${data.type}`);
  
    switch (data.type) {
      default:
    }
  });
  
  self.addEventListener("notificationclick", (e) => {
    const { notification, action } = e;
  
    switch (action) {
      case "OPEN_UPLOADED_VIDEO":
        clients.openWindow(notification.data.videoUrl);
        notification.close();
        break;
      default:
    }
  });
  