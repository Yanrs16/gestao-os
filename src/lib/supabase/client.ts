import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !supabaseAnonKey) {
  throw new Error('Chaves do Supabase não encontradas no arquivo .env.local');
}

// Remove o '/rest/v1/' ou barras extras do final se existirem
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // 👈 Força o navegador a salvar o login
    autoRefreshToken: true,    // 👈 Atualiza o token sozinho pro login não expirar rápido
    detectSessionInUrl: true   // 👈 Ajuda o Supabase a ler a sessão na troca de páginas
  }
});