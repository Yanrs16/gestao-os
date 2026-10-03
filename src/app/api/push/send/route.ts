import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // 0. Exige usuário logado
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });
    const {
      data: { user },
    } = await supabaseSSR.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { targetUserId, title, message, link, tag } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Dados insuficientes (title e message são obrigatórios)' },
        { status: 400 }
      );
    }

    // Configuração do Web Push
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@centralos.com';
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('Chaves VAPID ausentes nas variáveis de ambiente!');
      return NextResponse.json({ error: 'Configuração VAPID ausente no servidor' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey
    );

    // 1. Registra a notificação no banco
    if (targetUserId) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        message,
        link: link || '/admin',
      });
      if (notifError) console.error('Erro ao gravar notifications:', notifError);
    }

    // 2. Busca as inscrições push
    let query = supabase.from('push_subscriptions').select('*');
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Erro ao buscar inscrições push:', error);
      return NextResponse.json({ error: 'Erro ao buscar inscrições no banco' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        message: 'Nenhum dispositivo cadastrado para receber o Push.',
      });
    }

    // 3. Payload (tag única para as notificações não se substituírem)
    const payload = JSON.stringify({
      title,
      message,
      link: link || '/admin',
      tag: tag || `notif-${Date.now()}`,
    });

    // 4. Envia para cada dispositivo
    let sent = 0;
    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys,
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          sent++;
        } catch (pushError) {
          const statusCode = (pushError as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            console.log(`Removendo inscrição expirada (ID: ${sub.id})`);
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error(`Erro ao enviar Push para ID ${sub.id}:`, pushError);
          }
        }
      })
    );

    return NextResponse.json({ success: true, total: subscriptions.length, sent });
  } catch (err) {
    console.error('Erro interno na API de envio de Push:', err);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}