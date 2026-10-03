export async function registerServiceWorkerAndSubscribe() {
  let step = 'início';
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Navegador sem suporte a push');
      return null;
    }

    step = 'registrar SW';
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    step = 'permissão';
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Permissão: ' + permission);
      return null;
    }

    step = 'chave VAPID';
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!vapidPublicKey) {
      alert('VAPID key vazia no build');
      return null;
    }
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    step = 'subscribe';
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe().catch(() => {});
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    step = 'enviar para API';
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!response.ok) {
      const txt = await response.text();
      alert(`API ${response.status}: ${txt.slice(0, 300)}`);
      return null;
    }

    alert('Push OK');
    return subscription;
  } catch (error: any) {
    alert(`Falhou em "${step}": ${error?.name}: ${error?.message}`);
    return null;
  }
}