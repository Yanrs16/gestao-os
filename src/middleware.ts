import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Identifica se a URL atual é QUALQUER uma das telas de login
  const isLoginPage = pathname === '/login' || pathname === '/admin/login';

  // 2. Identifica se é uma rota protegida (exclui a tela /admin/login de ser considerada protegida)
  const isProtectedRoute =
    (pathname.startsWith('/admin') ||
      pathname.startsWith('/tecnico') ||
      pathname.startsWith('/sindico')) &&
    !isLoginPage;

  // 3. Se NÃO estiver logado e tentar acessar área protegida:
  // - Se for do Admin -> Manda para /admin/login
  // - Se for Técnico ou Síndico -> Manda para /login
  if (isProtectedRoute && !user) {
    const loginTarget = pathname.startsWith('/admin') ? '/admin/login' : '/login';
    return NextResponse.redirect(new URL(loginTarget, request.url));
  }

  // 4. Se JÁ ESTIVER logado e tentar acessar a tela de login do Admin (/admin/login):
// Redireciona para o painel correspondente ao perfil
if (pathname === '/admin/login' && user) {
  const role = user.user_metadata?.role;
  let redirectPath = '/admin';

  if (role === 'tecnico') redirectPath = '/tecnico';
  if (role === 'sindico') redirectPath = '/sindico';

  return NextResponse.redirect(new URL(redirectPath, request.url));
}

  // 5. Aplica os cabeçalhos Anti-Cache APENAS nas rotas privadas
  if (isProtectedRoute) {
    supabaseResponse.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    supabaseResponse.headers.set('Pragma', 'no-cache');
    supabaseResponse.headers.set('Expires', '0');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/tecnico/:path*',
    '/sindico/:path*',
    '/login',
  ],
};