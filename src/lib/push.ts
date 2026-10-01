function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorkerAndSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Este navegador não suporta Web Push Notifications.');
    return null;
  }

  try {
    // 1. Registra e aguarda o Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 2. Solicita permissão
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permissão de notificação negada pelo usuário.');
      return null;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY não está configurada!');
      return null;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // 3. Força a renovação da inscrição no Android/Chrome
    let subscription = await registration.pushManager.getSubscription();

    // Se já existir uma inscrição, cancela a antiga para gerar um endpoint atualizado
    if (subscription) {
      await subscription.unsubscribe().catch(() => {});
    }

    // Cria uma inscrição 100% nova
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    // 4. Envia para a API salvar no Supabase
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Erro na resposta do servidor:', errData);
      throw new Error('Falha ao registrar a inscrição no servidor.');
    }

    console.log('Push registrado com sucesso!');
    return subscription;
  } catch (error) {
    console.error('Erro ao registrar Service Worker/Push:', error);
    return null;
  }
}