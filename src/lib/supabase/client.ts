import { createBrowserClient } from '@supabase/ssr';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !supabaseAnonKey) {
  throw new Error('Chaves do Supabase não encontradas no arquivo .env.local');
}

const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

// Função criadora padrão do @supabase/ssr
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey!);
}

// Instância exportada direta
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey!);