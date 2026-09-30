// Listener para receber e exibir avisos de Push
self.addEventListener('push', function (event) {
  if (!event.data) return;

  event.waitUntil(
    (async () => {
      try {
        let data = {};
        
        // Tenta converter para JSON, tratando falhas se vier texto puro
        try {
          data = event.data.json();
        } catch (_) {
          data = { message: event.data.text() };
        }

        const title =
          typeof data.title === 'string' && data.title
            ? data.title
            : 'Nova Notificação';

        // Aceita 'message' ou 'body' no payload
        const message =
          typeof data.message === 'string'
            ? data.message
            : typeof data.body === 'string'
            ? data.body
            : 'Você recebeu uma nova atualização no sistema.';

        const targetUrl =
          typeof data.link === 'string'
            ? data.link
            : typeof data.url === 'string'
            ? data.url
            : '/admin';

        const options = {
          body: message,
          icon: '/icon-192.png', // Altere para a imagem que você tiver na pasta /public
          data: {
            url: targetUrl,
          },
          vibrate: [100, 50, 100],
          tag: typeof data.tag === 'string' ? data.tag : 'general-notification',
        };

        await self.registration.showNotification(title, options);
      } catch (error) {
        console.error('Erro ao processar notificação push:', error);
      }
    })()
  );
});

// Listener ao clicar na notificação
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/admin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});