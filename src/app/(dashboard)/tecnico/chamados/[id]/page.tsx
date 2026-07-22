'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase/client';
import { gerarPDFOrdemServico } from '../../../../../gerarPdfOS';

type Order = {
  id: string;
  condominium_id: string | null;
  title: string;
  description: string | null;
  status: 'aberto' | 'agendado' | 'em_andamento' | 'concluido' | string | null;
  tecnico_name: string | null;
  updated_by: string | null;
  created_at: string;
  os_number: string | null;
  tecnico_id: string | null;
  data_agendamento: string | null;
  horario_agendamento: string | null;
  condominiums: {nome: string | null;} | null;
};

type Feedback = {
  id: string;
  order_id: string;
  author_id: string;
  author_role: string | null;
  message: string;
  created_at: string;
};

type Attachment = {
  id: string;
  order_id: string;
  uploaded_by: string;
  uploaded_role: string | null;
  file_url: string;
  file_type: string | null;
  file_name: string | null;
  is_public: boolean;
  created_at: string;
};

export default function DetalhesChamadoTecnico() {
  const router = useRouter();
  const params = useParams();

  const chamadoId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [mensagemErro, setMensagemErro] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [tecnicoEmail, setTecnicoEmail] = useState('');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [novoFeedback, setNovoFeedback] = useState('');
  const [salvandoFeedback, setSalvandoFeedback] = useState(false);
  const [feedbackTecnico, setFeedbackTecnico] = useState<Feedback | null>(null);
  const [editandoFeedback, setEditandoFeedback] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
 const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
 const [enviandoArquivo, setEnviandoArquivo] = useState(false);
 const [atualizandoStatus, setAtualizandoStatus] = useState(false);


  useEffect(() => {
    const carregarChamado = async () => {
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
          throw new Error('Perfil não encontrado.');
        }

        if (profile.role !== 'tecnico') {
          router.push('/login');
          return;
        }

        const { data: chamado, error: chamadoError } = await supabase
          .from('orders')
          .select(`
                id,
                condominium_id,
                title,
                description,
                status,
                tecnico_name,
                updated_by,
                created_at,
                os_number,
                tecnico_id,
                data_agendamento,
                horario_agendamento,
                condominiums (
                    nome
                )
                `)
          .eq('id', chamadoId)
          .eq('tecnico_id', session.user.id)
          .single();

        if (chamadoError || !chamado) {
          throw new Error('Chamado não encontrado ou não pertence a este técnico.');
        }
        const chamadoFormatado = {
  ...chamado,
        condominiums: Array.isArray(chamado.condominiums)
            ? chamado.condominiums[0] || null
            : chamado.condominiums,
        } as Order;

        setTecnicoEmail(session.user.email || '');
        setOrder(chamadoFormatado);
    
        const { data: feedbacksData, error: feedbacksError } = await supabase
        .from('order_feedbacks')
        .select('id, order_id, author_id, author_role, message, created_at')
        .eq('order_id', chamadoId)
        .order('created_at', { ascending: true });

        if (feedbacksError) {
        throw feedbacksError;
        }

        setFeedbacks(feedbacksData || []);

        const meuFeedback = (feedbacksData || []).find(
        (feedback) => feedback.author_id === session.user.id && feedback.author_role === 'tecnico'
        );

        if (meuFeedback) {
        setFeedbackTecnico(meuFeedback);
        setNovoFeedback(meuFeedback.message);
}

const { data: attachmentsData, error: attachmentsError } = await supabase
  .from('order_attachments')
  .select('id, order_id, uploaded_by, uploaded_role, file_url, file_type, file_name, is_public, created_at')
  .eq('order_id', chamadoId)
  .order('created_at', { ascending: false });

if (attachmentsError) {
  throw attachmentsError;
}

setAttachments(attachmentsData || []);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setMensagemErro('Erro ao carregar o chamado.');
        setLoading(false);
      }
    };

    carregarChamado();
  }, [chamadoId, router]);

  const formatarData = (data: string | null) => {
    if (!data) return 'Sem data definida';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(data));
  };

  const formatarDataHora = (data: string | null) => {
    if (!data) return 'Sem data';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

const handleEnviarFeedback = async () => {
  const mensagem = novoFeedback.trim();

  if (!mensagem || !order) return;

  setSalvandoFeedback(true);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    setSalvandoFeedback(false);
    return;
  }

  if (feedbackTecnico) {
    const { data, error } = await supabase
      .from('order_feedbacks')
      .update({ message: mensagem })
      .eq('id', feedbackTecnico.id)
      .eq('author_id', session.user.id)
      .select('id, order_id, author_id, author_role, message, created_at')
      .single();

    if (error) {
      console.error(error);
      setSalvandoFeedback(false);
      return;
    }

    setFeedbackTecnico(data);
    setFeedbacks((atual) =>
      atual.map((feedback) => (feedback.id === data.id ? data : feedback))
    );
    setEditandoFeedback(false);
    setSalvandoFeedback(false);
    return;
  }

  const { data, error } = await supabase
    .from('order_feedbacks')
    .insert({
      order_id: order.id,
      author_id: session.user.id,
      author_role: 'tecnico',
      message: mensagem,
    })
    .select('id, order_id, author_id, author_role, message, created_at')
    .single();

  if (error) {
    console.error(error);
    setSalvandoFeedback(false);
    return;
  }

  setFeedbackTecnico(data);
  setFeedbacks((atual) => [...atual, data]);
  setNovoFeedback(data.message);
  setEditandoFeedback(false);
  setSalvandoFeedback(false);
};

const handleEnviarArquivo = async () => {
  if (!arquivoSelecionado || !order) return;

  setEnviandoArquivo(true);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    setEnviandoArquivo(false);
    return;
  }

  const extensao = arquivoSelecionado.name.split('.').pop();
  const caminhoArquivo = `${order.id}/${session.user.id}-${Date.now()}.${extensao}`;

  const { error: uploadError } = await supabase.storage
    .from('order-attachments')
    .upload(caminhoArquivo, arquivoSelecionado, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error(uploadError);
    setEnviandoArquivo(false);
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from('order-attachments')
    .getPublicUrl(caminhoArquivo);

  const { data: attachmentData, error: attachmentError } = await supabase
    .from('order_attachments')
    .insert({
      order_id: order.id,
      uploaded_by: session.user.id,
      uploaded_role: 'tecnico',
      file_url: publicUrlData.publicUrl,
      file_type: arquivoSelecionado.type,
      file_name: arquivoSelecionado.name,
      is_public: false,
    })
    .select('id, order_id, uploaded_by, uploaded_role, file_url, file_type, file_name, is_public, created_at')
    .single();

  if (attachmentError) {
    console.error(attachmentError);
    setEnviandoArquivo(false);
    return;
  }

  setAttachments((atual) => [attachmentData, ...atual]);
  setArquivoSelecionado(null);
  setEnviandoArquivo(false);
};

const handleRemoverArquivo = async (attachment: Attachment) => {
  const confirmar = window.confirm('Deseja remover este anexo?');

  if (!confirmar) return;

  const caminhoArquivo = attachment.file_url.split('/order-attachments/')[1];

  if (caminhoArquivo) {
    const { error: storageError } = await supabase.storage
      .from('order-attachments')
      .remove([caminhoArquivo]);

    if (storageError) {
      console.error(storageError);
      return;
    }
  }

  const { error } = await supabase
    .from('order_attachments')
    .delete()
    .eq('id', attachment.id);

  if (error) {
    console.error(error);
    return;
  }

  setAttachments((atual) =>
    atual.filter((item) => item.id !== attachment.id)
  );
};

const handleAtualizarStatus = async (
  novoStatus: 'em_andamento' | 'concluido'
) => {
  if (!order) return;

  setAtualizandoStatus(true);

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: novoStatus,
      updated_by: 'tecnico',
    })
    .eq('id', order.id)
    .eq('tecnico_id', order.tecnico_id)
    .select(
      'id, condominium_id, title, description, status, tecnico_name, updated_by, created_at, os_number, tecnico_id, data_agendamento, horario_agendamento'
    )
    .single();

  if (error) {
    console.error(error);
    setAtualizandoStatus(false);
    return;
  }

  setOrder((atual) => {
    if (!atual) return atual;

    return {
      ...atual,
      status: data.status,
      updated_by: data.updated_by,
    };
  });

  setAtualizandoStatus(false);
};



  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-medium">
        Carregando chamado...
      </div>
    );
  }

  if (mensagemErro || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm">
          <p className="text-red-400 font-semibold mb-4">
            {mensagemErro || 'Chamado não encontrado.'}
          </p>

          <button
            onClick={() => router.push('/tecnico')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold py-3 px-4 rounded-xl transition-all"
          >
            Voltar para agenda
          </button>
        </div>
      </div>
    );
  }



//  CÁLCULO DO AGENDAMENTO PARA A TELA INTERNA DO TÉCNICO
  const obterAlertaTecnicoInterno = () => {
    if (!order || order.status !== 'agendado') return null;

    const dataStr = order.data_agendamento;
    const horaStr = order.horario_agendamento || '';
    const agora = new Date();

    if (!dataStr) {
      return {
        texto: '⏳ AGENDADO: Sem data definida',
        cor: 'bg-zinc-900 text-zinc-400 border-zinc-800'
      };
    }

    let dataFinal = new Date(dataStr);
    if (horaStr && !dataStr.includes('T')) {
      dataFinal = new Date(`${dataStr}T${horaStr}`);
    } else if (horaStr) {
      const [horas, minutos] = horaStr.split(':');
      dataFinal.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0, 0);
    }

    const diferencaMs = dataFinal.getTime() - agora.getTime();
    const isAtrasado = diferencaMs < 0;

    const totalMinutos = Math.floor(Math.abs(diferencaMs) / (1000 * 60));
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    const tempoTexto = horas > 0 ? `${horas}h e ${minutos}min` : `${minutos}min`;

    if (isAtrasado) {
      return {
        texto: `🚨 ATRASADO: Sua visita era há ${tempoTexto}`,
        cor: 'bg-red-500/10 text-red-400 border-red-500/20'
      };
    } else {
      return {
        texto: `⏳ AGENDADO: Falta ${tempoTexto} para a visita`,
        cor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      };
    }
  };

  const alertaInterno = obterAlertaTecnicoInterno();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6">
      <header className="border-b border-zinc-800 pb-5 mb-6">
        <button
          onClick={() => router.push('/tecnico')}
          className="mb-4 text-sm text-zinc-400 hover:text-white transition-all"
        >
          ← Voltar para agenda
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 font-bold">
              OS {order.os_number || 'sem número'}
            </p>
            <h1 className="text-2xl font-black mt-1">{order.title}</h1>
          </div>

          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${getStatusClass(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>
      </header>

   {/* 🚨 CARD DE ALERTA DO AGENDAMENTO SEGURO CONTRA NULL */}
{alertaInterno && order?.data_agendamento && (
  <div className={`m-4 p-3.5 rounded-2xl border text-xs font-bold flex flex-col gap-1 shadow-sm ${alertaInterno.cor}`}>
    <p>{alertaInterno.texto}</p>
    <p className="opacity-60 text-[11px] font-normal">
      📅 Marcado para: {new Date(order.data_agendamento).toLocaleDateString('pt-BR')} às {' '}
      <span className="font-bold opacity-100 text-zinc-200">
        {order.horario_agendamento 
          ? formatarHora(order.horario_agendamento) 
          : order.data_agendamento.includes('T')
            ? new Date(order.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : 'Sem horário'
        }
      </span>
    </p>
  </div>
)}

      <main className="grid gap-4">
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-2">Descrição do chamado</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {order.description || 'Nenhuma descrição informada.'}
          </p>
        </section>

              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-3">Informações do chamado</h2>

          <div className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2">
             <span className="text-zinc-500">Número da OS</span>
            <span className="text-right text-zinc-300 font-bold">
                {order.os_number || 'OS sem número'}
            </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Condomínio</span>
              <span className="text-right text-zinc-300">
            {order.condominiums?.nome || 'Condomínio não informado'}       
            </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Técnico</span>
              <span className="text-right text-zinc-300">
                {order.tecnico_name || tecnicoEmail || 'Técnico não informado'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Criado em</span>
              <span className="text-right text-zinc-300">
                {formatarDataHora(order.created_at)}
              </span>
            </div>
          </div>
        </section>

        {order.updated_by && order.updated_by.startsWith('http') && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold mb-3">Foto do problema</h2>

            <a href={order.updated_by} target="_blank" rel="noopener noreferrer">
              <img
                src={order.updated_by}
                alt="Foto anexada ao chamado"
                className="w-full rounded-xl border border-zinc-800 object-cover max-h-96"
              />
            </a>
            </section>
        )}
 <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
  <h2 className="text-sm font-bold mb-3">Ações do atendimento</h2>

  {order.status === 'concluido' ? (
    <div className="space-y-3">
      <p className="text-sm text-emerald-400 font-semibold">
        Este chamado já foi concluído.
      </p>
      
      {/* Botão para gerar o PDF manualmente */}
      <button
        type="button"
        onClick={() => gerarPDFOrdemServico(order)}
        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        📄 Gerar e Baixar PDF da OS
      </button>
    </div>
  ) : order.status === 'em_andamento' ? (
    <button
      type="button"
      onClick={() => handleAtualizarStatus('concluido')}
      disabled={atualizandoStatus}
      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-sm font-black py-3 rounded-xl transition-all"
    >
      {atualizandoStatus ? 'Atualizando...' : 'Finalizar chamado'}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => handleAtualizarStatus('em_andamento')}
      disabled={atualizandoStatus}
      className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-sm font-black py-3 rounded-xl transition-all"
    >
      {atualizandoStatus ? 'Atualizando...' : 'Iniciar atendimento'}
    </button>
  )}
</section>


            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
  <h2 className="text-sm font-bold mb-3">Feedback do atendimento</h2>

  <div className="grid gap-3 mb-4">
    {feedbacks.length === 0 ? (
      <p className="text-sm text-zinc-500">
        Nenhum feedback registrado ainda.
      </p>
    ) : (
      feedbacks.map((feedback) => (
        <div
          key={feedback.id}
          className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-amber-400">
              {feedback.author_role || 'usuário'}
            </span>

            <span className="text-[11px] text-zinc-500">
              {formatarDataHora(feedback.created_at)}
            </span>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">
            {feedback.message}
          </p>
        </div>
      ))
    )}
  </div>

{feedbackTecnico && !editandoFeedback ? (
  <button
    type="button"
    onClick={() => setEditandoFeedback(true)}
    className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold py-3 rounded-xl transition-all"
  >
    Editar meu feedback
  </button>
) : (
  <>
  

   <textarea
      value={novoFeedback}
      onChange={(event) => setNovoFeedback(event.target.value)}
      placeholder="Escreva um feedback sobre o atendimento..."
      className="w-full min-h-28 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
    />

 <button
      type="button"
      onClick={handleEnviarFeedback}
      disabled={salvandoFeedback || !novoFeedback.trim()}
      className="mt-3 w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-sm font-black py-3 rounded-xl transition-all"
    >
      {salvandoFeedback
        ? 'Salvando...'
        : feedbackTecnico
          ? 'Salvar edição'
          : 'Enviar feedback'}
    </button>
  </>


)}
 </section>

 <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
  <h2 className="text-sm font-bold mb-3">Anexos internos do atendimento</h2>

  <div className="mb-4">
    <input
      type="file"
      accept="image/*,video/*"
      onChange={(event) => {
        const file = event.target.files?.[0] || null;
        setArquivoSelecionado(file);
      }}
      className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-zinc-700"
    />

    {arquivoSelecionado && (
      <p className="mt-2 text-xs text-zinc-500">
        Arquivo selecionado: {arquivoSelecionado.name}
      </p>
    )}

    <button
      type="button"
      onClick={handleEnviarArquivo}
      disabled={enviandoArquivo || !arquivoSelecionado}
      className="mt-3 w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-sm font-black py-3 rounded-xl transition-all"
    >
      {enviandoArquivo ? 'Enviando...' : 'Enviar anexo'}
    </button>
  </div>

  {attachments.length === 0 ? (
    <p className="text-sm text-zinc-500">Nenhum anexo técnico enviado ainda.</p>
  ) : (
    <div className="grid gap-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"
        >
         <div className="flex items-center gap-3">
  <a
    href={attachment.file_url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs font-bold text-amber-400 hover:text-amber-300"
  >
    Abrir
  </a>

  <button
    type="button"
    onClick={() => handleRemoverArquivo(attachment)}
    className="text-xs font-bold text-red-400 hover:text-red-300"
  >
    Remover
  </button>
</div>

          {attachment.file_type?.startsWith('image/') && (
            <img
              src={attachment.file_url}
              alt={attachment.file_name || 'Anexo do atendimento'}
              className="w-full rounded-xl border border-zinc-800 object-cover max-h-96"
            />
          )}

          {attachment.file_type?.startsWith('video/') && (
            <video
              src={attachment.file_url}
              controls
              className="w-full rounded-xl border border-zinc-800 max-h-96"
            />
          )}


          
        </div>
      ))}
    </div>
  )}
</section>
      </main>
    </div>
    );
}
