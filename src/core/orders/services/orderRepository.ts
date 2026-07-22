import { supabase } from '@/lib/supabase/client';

export interface CreateOrderDTO {
  tenant_id: string;
  requester_name: string;
  requester_type: string;
  condominium: string;
  unit_block: string;
  phone?: string;
  category: string;
  description: string;
  image_before_url?: string;
}

export const orderRepository = {
  // 1. Criação de chamado por usuários externos (públicos)
  async createPublicOrder(data: CreateOrderDTO) {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([data])
      .select('public_code')
      .single();

    if (error) throw new Error(error.message);
    return order;
  },

  // 2. Busca segura feita por moradores para rastreamento
  async getByPublicCode(code: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('public_code, status, category, condominium, created_at, technical_notes')
      .eq('public_code', code)
      .single();

    if (error) return null;
    return data;
  },

  // 3. Atualização de andamento executada nos painéis operacionais
  async updateOrderStatus(orderId: string, status: 'aberto' | 'em_atendimento' | 'finalizado', technicalNotes?: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status, 
        technical_notes: technicalNotes, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId)
      .select();

    if (error) throw new Error(error.message);
    return data;
  }
};