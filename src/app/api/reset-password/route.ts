import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ mensagem: "A rota de API foi encontrada com sucesso!" });
}

export async function POST(request: Request) {

  try {
    // 1. Verifica se as chaves do Supabase estão configuradas no .env
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta (chaves do Supabase ausentes).' },
        { status: 500 }
      );
    }

    // Inicializa o admin internamente para isolar erros
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Tenta ler o corpo da requisição
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
    }

    const { userId, newPassword } = body;

    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'ID do usuário ausente ou senha com menos de 6 caracteres.' },
        { status: 400 }
      );
    }

    // 3. Executa a redefinição no Supabase Auth e força a confirmação do e-mail
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: newPassword,
        email_confirm: true // <-- ADICIONADO AQUI! Ativa a conta fictícia no mesmo instante
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Senha atualizada e conta ativada!' });

  } catch (globalError: any) {
    // Captura qualquer outro erro e força o retorno em formato JSON
    return NextResponse.json(
      { error: `Erro interno no servidor: ${globalError.message || globalError}` },
      { status: 500 }
    );
  }
}