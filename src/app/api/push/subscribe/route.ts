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
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

    // Pega o usuário logado (se houver)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userAgent = request.headers.get('user-agent') || 'Dispositivo Desconhecido';

    // Salva ou atualiza a inscrição na tabela push_subscriptions
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user?.id || null, // Atribui o ID se estiver logado, ou null se não encontrar a sessão
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: userAgent,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return NextResponse.json({ error: 'Erro ao salvar inscrição' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro na API push subscribe:', err);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}