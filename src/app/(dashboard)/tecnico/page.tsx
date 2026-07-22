'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { supabase } from '../../../lib/supabase/client';
type Order = {
  id: string;
  condominium_id: string | null;
  title: string;
  description: string | null;
  status: 'aberto' | 'agendado' | 'em_andamento' | 'concluido' | string | null;
  tecnico_name: string | null;
  os_number: string | null;
  tecnico_id: string | null;
  data_agendamento: string | null;
  horario_agendamento: string | null;
  created_at: string;
  // Preparado para caso queira fazer um join e trazer o nome do condomínio diretamente
 condominiums?: any; 
};

export default function TecnicoDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tecnicoEmail, setTecnicoEmail] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  
  //  Novos Estados para Filtros e Abas
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'a_fazer' | 'concluidos'>('a_fazer');
  const [atualizandoStatus, setAtualizandoStatus] = useState<string | null>(null);

  const carregarPainelTecnico = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      router.push('/login');
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil não encontrado no sistema.');
      }

      if (profile.role !== 'tecnico') {
        setMensagemErro('Acesso negado. Esta página é exclusiva para técnicos.');
        setLoading(false);

        setTimeout(() => {
          if (profile.role === 'sindico') router.push('/sindico');
          else if (profile.role === 'admin') router.push('/admin');
          else router.push('/login');
        }, 3000);

        return;
      }

     const { data: chamados, error: chamadosError } = await supabase
        .from('orders')
        .select(
          'id, condominium_id, title, description, status, tecnico_name, os_number, tecnico_id, data_agendamento, horario_agendamento, created_at'
        ) // Removido o condominiums(name) daqui
        .eq('tecnico_id', session.user.id)
        .order('data_agendamento', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (chamadosError) {
        throw chamadosError;
      }

      // 1. Pega todos os IDs de condomínios únicos desta lista de chamados
      const idsCondominios = [...new Set(chamados.map((c) => c.condominium_id).filter(Boolean))];
      let condominiosMap: Record<string, string> = {};
      
      // LOG de depuração para você ver no Console do navegador (F12)
      console.log("IDs dos Condomínios encontrados nos chamados:", idsCondominios);

      // 2. Busca os dados usando '*' para evitar erros de nomes de colunas
      if (idsCondominios.length > 0) {
        // Tenta primeiro buscar na tabela em português 'condominios'
        let { data: condData, error: condError } = await supabase
          .from('condominios')
          .select('*') // Busca todas as colunas para não errarmos o nome de nenhuma
          .in('id', idsCondominios);

        // Se der erro ou não achar nada, tenta na tabela em inglês 'condominiums'
        if (condError || !condData || condData.length === 0) {
          const { data: condDataEn, error: condErrorEn } = await supabase
            .from('condominiums')
            .select('*')
            .in('id', idsCondominios);
          
          if (!condErrorEn && condDataEn) {
            condData = condDataEn;
          }
        }

        // Se encontramos os condomínios, vamos mapear o nome dinamicamente
        if (condData && condData.length > 0) {
          console.log("Dados brutos dos condomínios retornados pelo Supabase:", condData);
          
          condData.forEach((c: any) => {
            // Tenta pegar o nome usando as variações mais comuns de colunas
            const nomeFinal = c.nome || c.name || c.titulo || c.title || 'Condomínio Sem Nome';
            condominiosMap[c.id] = nomeFinal;
          });
        }
      }

      // 3. Mescla os dados para a interface
      const chamadosComCondominio = chamados.map((chamado) => {
        const nomeCondo = chamado.condominium_id ? condominiosMap[chamado.condominium_id] : null;
        return {
          ...chamado,
          condominiums: nomeCondo ? { name: nomeCondo } : { name: 'Sem Condomínio' },
        };
      });

      setTecnicoEmail(session.user.email || '');
      setOrders(chamadosComCondominio as any);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setMensagemErro('Erro ao carregar o painel do técnico.');
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPainelTecnico();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Função para Reabrir/Estornar um Chamado Concluído
  const handleReabrirChamado = async (orderId: string) => {
    if (!confirm('Deseja realmente reabrir este chamado? Ele voltará para a sua lista de tarefas.')) return;

    setAtualizandoStatus(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'em_andamento' })
        .eq('id', orderId);

      if (error) throw error;

      // Atualiza o estado local para mover o card de aba em tempo real
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: 'em_andamento' } : order
        )
      );
    } catch (error) {
      console.error('Erro ao reabrir chamado:', error);
      alert('Não foi possível reabrir o chamado. Tente novamente.');
    } finally {
      setAtualizandoStatus(null);
    }
  };

  const formatarData = (data: string | null) => {
    if (!data) return 'Sem data definida';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(data));
  };

  const formatarHora = (hora: string | null) => {
    if (!hora) return 'Sem horário';

    return hora.slice(0, 5);
  };

  const getStatusLabel = (status: Order['status']) => {
    if (status === 'aberto') return 'Aberto';
    if (status === 'agendado') return 'Agendado';
    if (status === 'em_andamento') return 'Em andamento';
    if (status === 'concluido') return 'Concluído';

    return 'Sem status';
  };

  const getStatusClass = (status: Order['status']) => {
    if (status === 'aberto') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (status === 'agendado') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (status === 'em_andamento') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (status === 'concluido') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

    return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  };

  //  Lógica de Filtro Combinado (Aba Ativa + Barra de Busca)
  const filteredOrders = orders.filter((order) => {
    // 1. Filtro de Abas
    const matchesTab =
      activeTab === 'a_fazer'
        ? order.status !== 'concluido' // Tudo que não está finalizado entra aqui
        : order.status === 'concluido'; // Só o que está concluído entra aqui

    // 2. Filtro da Barra de Pesquisa (OS ou Nome do Chamado)
    const matchesSearch =
      order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.os_number && order.os_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.description && order.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  // Contadores para as Abas
  const totalAFazer = orders.filter((o) => o.status !== 'concluido').length;
  const totalConcluidos = orders.filter((o) => o.status === 'concluido').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-medium">
        Carregando painel do técnico...
      </div>
    );
  }

  if (mensagemErro) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm shadow-2xl">
          <p className="text-red-400 font-semibold mb-2">{mensagemErro}</p>
          <p className="text-zinc-500 text-xs">Redirecionando você para o lugar certo...</p>

          <button
            onClick={handleLogout}
            className="mt-4 w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
            Painel do Técnico
          </span>
          <h1 className="text-2xl font-black mt-1">Minha Agenda</h1>
          <p className="text-zinc-400 text-xs mt-0.5">Conectado como: {tecnicoEmail}</p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all self-start sm:self-center"
        >
          Sair do Sistema
        </button>
      </header>

      <main className="max-w-4xl mx-auto">
        {/*  BARRA DE FILTROS E BUSCA */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por OS, descrição ou título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          {/*  SELETOR DE ABAS */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('a_fazer')}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'a_fazer'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              A Fazer ({totalAFazer})
            </button>
            <button
              onClick={() => setActiveTab('concluidos')}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'concluidos'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Concluídos ({totalConcluidos})
            </button>
          </div>
        </div>

        {/*  LISTAGEM DE CHAMADOS */}
        {filteredOrders.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center my-6">
            <div className="w-12 h-12 bg-zinc-800 text-zinc-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              📂
            </div>
            <h2 className="text-base font-bold mb-1">Nenhum chamado encontrado</h2>
            <p className="text-zinc-500 text-xs max-w-xs mx-auto">
              Não encontramos nenhum chamado correspondente nesta lista. Tente alterar sua busca ou trocar de aba.
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className={`bg-zinc-900 border rounded-2xl p-4 shadow-xl transition-all ${
                  order.status === 'concluido' ? 'border-zinc-800/60 opacity-80' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[20px] text-zinc-500 font-bold tracking-wider uppercase">
                         {order.os_number || 'sem número'}
                      </span>
                      {/* Badge puxando o nome do banco */}
                      {order.condominiums && (
                        <span className="bg-zinc-900 text-zinc-500 text-[20px] font-bold px-2 py-0.5 rounded border border-zinc-800 truncate max-w-[150px]">
                          🏢 {Array.isArray(order.condominiums) ? order.condominiums[0]?.name : order.condominiums.name}
                        </span>
                      )}
                    </div>
                    <h2 className={`text-base font-bold mt-1 ${order.status === 'concluido' && 'line-through text-zinc-400'}`}>
                      {order.title}
                    </h2>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${getStatusClass(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {order.description && (
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    {order.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <p className="text-zinc-500 mb-1">Data</p>
                    <p className="font-bold text-zinc-200">{formatarData(order.data_agendamento)}</p>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <p className="text-zinc-500 mb-1">Horário</p>
                    <p className="font-bold text-zinc-200">
                      {formatarHora(order.horario_agendamento)}
                    </p>
                  </div>
                </div>

                {/*  ÁREA DE AÇÕES COM CONDICIONAL DE ABAS */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  {order.status === 'concluido' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push(`/tecnico/chamados/${order.id}`)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                      >
                        Visualizar Laudo/OS
                      </button>
                      <button
                        type="button"
                        disabled={atualizandoStatus === order.id}
                        onClick={() => handleReabrirChamado(order.id)}
                        className="flex-1 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold py-2.5 rounded-xl transition-all disabled:opacity-55"
                      >
                        {atualizandoStatus === order.id ? 'Processando...' : '↩️ Reabrir Chamado'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push(`/tecnico/chamados/${order.id}`)}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-black py-3 rounded-xl transition-all"
                    >
                      Acessar Execução / Detalhes
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}