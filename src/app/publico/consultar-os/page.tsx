'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

function TrackOrderContent() {
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

 const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');
  const retorno = searchParams.get('retorno');

  // Função que faz a busca real no banco de dados
  const buscarOS = async (codigoParaBuscar: string) => {
    if (!codigoParaBuscar.trim()) return;

    setLoading(true);
    setSearched(false);
    setErro('');
    setOrder(null);

    let termoFormatado = codigoParaBuscar.trim().toUpperCase();
    if (!termoFormatado.startsWith('OS-')) {
      termoFormatado = `OS-${termoFormatado.replace('OS', '').trim()}`;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        // @ts-ignore
        .eq('os_number', termoFormatado)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setErro('Nenhum chamado encontrado com este número. Verifique e tente novamente.');
      } else {
        setOrder(data);
      }
    } catch (err: any) {
      console.error("Erro na busca da OS:", err);
      setErro('Ocorreu um erro ao buscar a Ordem de Serviço.');
    } finally {
      setSearched(true);
      setLoading(false);
    }
  };

  // 🔥 GATILHO AUTOMÁTICO: Se tiver código na URL, busca na hora que a página abre!
  useEffect(() => {
    if (urlCode) {
      setCode(urlCode); // Preenche o campo de texto visualmente
      buscarOS(urlCode); // Executa a busca direto
    }
  }, [urlCode]);

  // Auxiliar para formatar as datas vindas do Supabase
  const formatarData = (dataString: string) => {
    if (!dataString) return "";
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 flex flex-col items-center justify-center">
      
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-6">
        
        {/* BOTÃO VOLTAR PARA A HOME ⬅️ */}
        <div className="flex justify-start">
          <Link 
            href={retorno === 'sindico' ? '/sindico' : '/'} 
            className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5">
            <span>⬅️</span> Voltar para o Início
          </Link>
        </div>

        {/* CABEÇALHO DA BUSCA */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-black uppercase tracking-wider text-white">🔍 Acompanhar Ordem de Serviço</h1>
          <p className="text-xs text-slate-400">Visualização em tempo real do andamento do seu chamado</p>
        </div>

        {/* SE RETORNAR DO INÍCIO SEM CÓDIGO, PERMITE DIGITAR MANUALLY */}
        {!urlCode && (
          <form onSubmit={(e) => { e.preventDefault(); buscarOS(code); }} className="flex gap-2">
            <input
              type="text"
              placeholder="Digite o número da OS... (Ex: 1445)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm text-white outline-none font-mono tracking-wider focus:border-blue-500 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase px-6 rounded-xl transition-colors disabled:opacity-50 min-w-[90px]"
            >
              {loading ? '...' : 'Buscar'}
            </button>
          </form>
        )}

        {/* ESTADO DE CARREGAMENTO MANUAL */}
        {loading && (
          <div className="text-xs text-slate-400 text-center py-4 animate-pulse">
            ⏳ Buscando informações do chamado técnico...
          </div>
        )}

        {/* ERRO: CHAMADO NÃO ENCONTRADO */}
        {searched && erro && !loading && (
          <div className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center font-medium animate-in fade-in duration-200">
            ⚠️ {erro}
          </div>
        )}

        {/* ================= RESULTADO DO ACOMPANHAMENTO ================= */}
        {order && !loading && (
          <div className="border-t border-slate-800 pt-5 space-y-5 animate-in fade-in duration-300">
            
            {/* CARD DE DETALHES GERAIS */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Identificação da OS:</span>
                <span className="text-blue-400 font-mono font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md text-[10px]">
                  {order.os_number || `OS-${order.id?.slice(0, 4).toUpperCase()}`}
                </span>
              </div>
              <p className="font-semibold text-sm text-slate-200">{order.title || 'Chamado Técnico'}</p>
              
              {order.description && (
                <p className="text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-900/60 whitespace-pre-line leading-relaxed">
                  {order.description}
                </p>
              )}
            </div>

            {/* LINHA DO TEMPO DINÂMICA */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <span>📍</span> PROGRESSO ATUAL
              </h3>

              <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 ml-2">
                
                {/* STATUS 1: ABERTO */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 bg-amber-500 text-slate-950 w-3.5 h-3.5 rounded-full ring-4 ring-slate-900" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-200">Chamado Aberto com Sucesso</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Triagem inicial enviada. Aguardando análise da administração do condomínio.</p>
                    {order.created_at && (
                      <p className="text-[9px] text-slate-500 font-medium mt-1">Registrado em: {formatarData(order.created_at)}</p>
                    )}
                  </div>
                </div>

                {/* STATUS 2: EM ANDAMENTO */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-900 transition-colors ${
                    order.status === 'em_andamento' || order.status === 'em_atendimento' || order.status === 'concluido' 
                      ? 'bg-blue-500' 
                      : 'bg-slate-800'
                  }`} />
                  <div className={`text-xs ${order.status === 'aberto' ? 'opacity-35' : 'opacity-100'}`}>
                    <p className="font-bold text-slate-200">Técnico Designado & Manutenção Iniciada</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {order.tecnico_name 
                        ? `O profissional encarregado (${order.tecnico_name}) já iniciou os reparos no local.` 
                        : 'A ordem foi direcionada para a equipe técnica e um prestador está a caminho.'}
                    </p>
                  </div>
                </div>

                {/* STATUS 3: CONCLUÍDO */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-900 transition-colors ${
                    order.status === 'concluido' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-800'
                  }`} />
                  <div className={`text-xs ${order.status !== 'concluido' ? 'opacity-35' : 'opacity-100'}`}>
                    <p className="font-bold text-slate-200">Ordem de Serviço Finalizada</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">O problema foi totalmente resolvido pelo técnico. Caso precise de suporte adicional, abra um novo chamado.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* SEÇÃO DA IMAGEM DE EVIDÊNCIA */}
            {order.updated_by && (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left mb-2 pl-1">Evidência Anexada no Chamado:</p>
                <img 
                  src={order.updated_by} 
                  alt="Foto do chamado" 
                  className="max-h-[220px] mx-auto object-contain rounded-lg shadow-md" 
                />
              </div>
            )}

            {/* NOTAS DO TÉCNICO / ENCERRAMENTO */}
            {(order.technical_notes || order.notas_tecnicas) && (
              <div className="bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl text-xs text-slate-300 space-y-1">
                <span className="font-bold text-blue-400 block uppercase text-[10px] tracking-wider">📋 Nota de Encerramento:</span>
                <p className="leading-relaxed italic">"{order.technical_notes || order.notas_tecnicas}"</p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// Envolvemos em um Suspense para o Next.js gerenciar o useSearchParams() em build de produção
export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">Carregando painel...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}