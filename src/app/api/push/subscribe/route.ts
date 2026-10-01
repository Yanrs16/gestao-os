import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Inscrição inválida' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Para bypass RLS em gravações de sistema (se configurado)
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

    // Cliente SSR para identificar o usuário logado
    const supabaseSSR = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabaseSSR.auth.getUser();

    const userAgent = request.headers.get('user-agent') || 'Dispositivo Desconhecido';

    // Instancia o cliente de banco de dados (usa Service Role se disponível no .env, senão usa Anon)
    const dbClient = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey) 
      : supabaseSSR;

    // 1. Tenta deletar qualquer registro antigo que já possua este mesmo endpoint
    await dbClient
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint);

    // 2. Insere a nova assinatura
    const { error } = await dbClient
      .from('push_subscriptions')
      .insert([
        {
          user_id: user?.id || null,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          user_agent: userAgent,
        },
      ]);

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return NextResponse.json({ error: 'Erro ao salvar inscrição: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro na API push subscribe:', err);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}