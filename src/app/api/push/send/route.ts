import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const { targetUserId, title, message, link } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Dados insuficientes (title e message são obrigatórios)' },
        { status: 400 }
      );
    }

    // Configuração do Web Push
    const vapidSubject = process.env.VAPID_SUBJECT || 'admin@centralos.com';
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('Chaves VAPID ausentes nas variáveis de ambiente!');
      return NextResponse.json({ error: 'Configuração VAPID ausente no servidor' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Usa Service Role Key se disponível, ou Anon Key como fallback
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Opcional: Registra a notificação no banco
    if (targetUserId) {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        message,
        link: link || '/admin',
      });
    }

    // 2. Busca as inscrições push no Supabase
    let query = supabase.from('push_subscriptions').select('*');
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Erro ao buscar inscrições push no Supabase:', error);
      return NextResponse.json({ error: 'Erro ao buscar inscrições no banco' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('Nenhuma inscrição encontrada na tabela push_subscriptions.');
      return NextResponse.json({
        message: 'Nenhum dispositivo encontrado cadastrado para receber o Push.',
      });
    }

    // 3. Monta o payload para o sw.js
    const payload = JSON.stringify({
      title,
      message,
      link: link || '/admin',
    });

    // 4. Dispara a notificação para cada dispositivo
    const sendPromises = subscriptions.map(async (sub) => {
      // Garante que o objeto keys esteja formatado corretamente
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys,
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (pushError: any) {
        if (pushError.statusCode === 404 || pushError.statusCode === 410) {
          console.log(`Removendo inscrição expirada (ID: ${sub.id})`);
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error(`Erro ao enviar Push para ID ${sub.id}:`, pushError);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, count: subscriptions.length });
  } catch (err) {
    console.error('Erro interno na API de envio de Push:', err);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}