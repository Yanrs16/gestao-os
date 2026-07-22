import { supabase } from '../supabase/client'; 

/**
 * Busca no banco de dados todos os perfis que possuem a role 'tecnico'
 */
export async function obterTecnicos() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      // Se na sua tabela os campos tiverem nomes diferentes (ex: nome ao invés de full_name), ajuste aqui
      .select('id, full_name, email, role') 
      .eq('role', 'tecnico');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar lista de técnicos:', error);
    return [];
  }
}