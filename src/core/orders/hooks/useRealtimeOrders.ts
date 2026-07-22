'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';

export function useRealtimeOrders(technicianId: string, tenantId: string) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // Busca inicial de OS atribuídas ao técnico
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('assigned_technician_id', technicianId);
      if (data) setOrders(data);
    };

    fetchOrders();

    // Escuta Realtime usando o canal do Supabase
    const channel = supabase
      .channel(`tenant-orders-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [technicianId, tenantId]);

  return { orders };
}