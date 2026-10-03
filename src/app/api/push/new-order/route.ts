import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

const ADMIN_ROLE = 'adm'; // confirme este valor

export async function POST(request: Request) {
  try {
    const { osNumber } = await request.json();

    if (typeof osNumber !== 'string' || !/^OS-\d{4}$/.test(osNumber)) {
      return NextResponse.json({ error: 'Número de OS inválido' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();

    if (!serviceKey || !vapidPublicKey || !vapidPrivateKey) {
      console.error('Variáveis ausentes: SUPABASE_SERVICE_ROLE_KEY ou VAPID');
      return NextResponse.json({ error: 'Configuração ausente no servidor' }, { status: 500 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@centralos.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Marca o chamado como notificado (só funciona 1x, e só para chamados recentes)
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .update({ push_notified: true })
      .eq('os_number', osNumber)
      .eq('push_notified', false)
      .gte('created_at', since)
      .select('id, os_number, condominium_id');

    if (orderError) {
      console.error('Erro ao validar chamado:', orderError);
      return NextResponse.json({ error: 'Erro ao validar chamado' }, { status: 500 });
    }

    const order = orders?.[0];
    if (!order) {
      return NextResponse.json({ error: 'Chamado não encontrado ou já notificado' }, { status: 404 });
    }

    // 2. Nome do condomínio
    const { data: condo } = await supabase
      .from('condominiums')
      .select('nome')
      .eq('id', order.condominium_id)
      .maybeSingle();

    const title = '🚨 Novo Chamado Recebido!';
    const message = `Novo chamado (${order.os_number}) aberto no condomínio ${condo?.nome || ''}.`;
    const link = '/admin';

    // 3. Busca os admins ativos
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', ADMIN_ROLE)
      .or('active.is.null,active.eq.true');

    if (adminError) {
      console.error('Erro ao buscar admins:', adminError);
      return NextResponse.json({ error: 'Erro ao buscar admins' }, { status: 500 });
    }

    const adminIds = (admins ?? []).map((a) => a.id);
    if (adminIds.length === 0) {
      return NextResponse.json({ message: 'Nenhum admin encontrado' });
    }

    // 4. Registra no histórico de notificações de cada admin
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(adminIds.map((id) => ({ user_id: id, title, message, link })));
    if (notifError) console.error('Erro ao gravar notifications:', notifError);

    // 5. Busca os dispositivos dos admins
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', adminIds);

    if (subError) {
      console.error('Erro ao buscar inscrições:', subError);
      return NextResponse.json({ error: 'Erro ao buscar inscrições' }, { status: 500 });
    }

    const payload = JSON.stringify({ title, message, link, tag: `os-${order.os_number}` });

    let sent = 0;
    await Promise.all(
      (subscriptions ?? []).map(async (sub) => {
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
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error(`Erro ao enviar Push para ID ${sub.id}:`, pushError);
          }
        }
      })
    );

    return NextResponse.json({ success: true, total: subscriptions?.length ?? 0, sent });
  } catch (err) {
    console.error('Erro na rota new-order:', err);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}