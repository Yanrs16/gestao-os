"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase/client";

// ================= TIPAGENS (Interfaces) =================
interface Condominio {
  nome?: string;
  endereco?: string;
  sindico_nome?: string;
}

interface Tecnico {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  os_number?: string;
  title?: string;
  titulo?: string; // Fallback usado no seu código
  description?: string;
  descricao?: string; // Fallback usado no seu código
  tecnico_id?: string;
  tecnico_name?: string;
  data_agendamento?: string | null;
  updated_by?: string; // URL da imagem/evidência
  photo_url?: string; // URL da imagem/evidência
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function CondominioInterno() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const condominioId = params.id;

  // Estados dos dados tipados
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [agora, setAgora] = useState(new Date());
  const [listaTecnicos, setListaTecnicos] = useState<Tecnico[]>([]);
  const [editTecnicoId, setEditTecnicoId] = useState("");
  const [editDataAgendamento, setEditDataAgendamento] = useState("");

  // Estados do Modal Unificado
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  // Campos controlados do formulário de edição
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Função para formatar a data de criação do chamado
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";

    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calcula o tempo corrido e define o nível de alerta
  const obterAlertaAtraso = (order: any) => {
    const status = order?.status;
    const created_at = order?.created_at;

    if (!created_at || status === "concluido") {
      return {
        texto: "FINALIZADO",
        cor: "bg-emerald-950/80 text-emerald-400 border-emerald-500/30",
        pisca: false,
      };
    }

    const inicio = new Date(created_at);
    const dfeEmMs = agora.getTime() - inicio.getTime();

    const totalMinutos = Math.floor(dfeEmMs / 1000 / 60);
    const totalHoras = Math.floor(totalMinutos / 60);
    const totalDias = Math.floor(totalHoras / 24);

    let texto = "";
    if (totalMinutos < 60) texto = `${totalMinutos} min`;
    else if (totalHoras < 24) texto = `${totalHoras}h ${totalMinutos % 60}m`;
    else texto = `${totalDias} dias`;

    if (status === "aberto") {
      if (totalMinutos >= 60) {
        return {
          texto: `🚨 CRÍTICO: ${texto} atrás`,
          cor: "text-[15px] bg-red-950 text-red-400 border-2 border-red-500 font-black tracking-wide shadow-lg shadow-red-950/50",
          pisca: true,
        };
      }
      if (totalMinutos >= 15) {
        return {
          texto: `⚠️ ALERTA: ${texto} atrás`,
          cor: "text-[15px] px-3 py-1.5 bg-amber-950 text-amber-400 border border-amber-500 font-bold rounded-xl",
          pisca: false,
        };
      }
      return {
        texto: `🟢 RECENTE: ${texto} atrás`,
        cor: "text-[15px] bg-slate-900 text-blue-400 border border-blue-500/40 font-medium",
        pisca: false,
      };
    }

    // 2. NOVA LÓGICA: CHAMADOS AGENDADOS (Passo 5 - Corrigido)

    if (status === "agendado") {
      const dataAgendamentoStr = order?.data || order?.data_agendamento;
      if (!dataAgendamentoStr) {
        return {
          texto: `⏳ AGENDADO: Sem data definida`,
          cor: "text-[15px] bg-slate-900 text-slate-400 border border-slate-700 font-medium",
          pisca: false,
        };
      }

      const horarioAgendado = new Date(dataAgendamentoStr);
      const diferencaMs = horarioAgendado.getTime() - agora.getTime();
      const isAtrasado = diferencaMs < 0;

      // Calcula minutos e horas absolutos da diferença
      const totalMinutosAgendamento = Math.floor(
        Math.abs(diferencaMs) / (1000 * 60),
      );
      const horasAgendamento = Math.floor(totalMinutosAgendamento / 60);
      const minutosAgendamento = totalMinutosAgendamento % 60;

      // Formata o texto bonitinho: "Xh e Ymin" ou apenas "Ymin"
      const textoTempo =
        horasAgendamento > 0
          ? `${horasAgendamento}h e ${minutosAgendamento}min`
          : `${minutosAgendamento}min`;

      if (isAtrasado) {
        return {
          texto: `🚨 ATRASADO: Visita era há ${textoTempo}`,
          cor: "text-[15px] bg-red-950 text-red-400 border-2 border-red-500 font-black tracking-wide shadow-lg shadow-red-950/50",
          pisca: true,
        };
      } else {
        return {
          texto: `⏳ AGENDADO: Faltam ${textoTempo} para a visita`,
          cor: "text-[15px] bg-slate-900 text-cyan-400 border border-cyan-500/40 font-medium",
          pisca: false,
        };
      }
    }

    return {
      texto: `⚙️ EM EXECUÇÃO: ${texto}`,
      cor: "text-[15px] bg-slate-900 text-purple-400 border border-purple-500/40 font-medium",
      pisca: false,
    };
  };

  // Atualiza o relógio interno a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    if (!condominioId) return;
    const { data } = await supabase
      .from("orders")
      .select("*, profiles(full_name, email)")
      .eq("condominium_id", condominioId)
      .order("created_at", { ascending: false });

    if (data)
      console.log(
        "Dados que vieram do banco:",
        data.map((o) => ({
          id: o.id,
          status: o.status,
          data: o.data_agendamento,
        })),
      );
    setOrders(data as unknown as Order[]);
  };

  // Carrega os dados iniciais da tela
  useEffect(() => {
    if (!condominioId) return;

    const fetchDadosIniciais = async () => {
      setLoading(true);

      const { data: condoData } = await supabase
        .from("condominiums")
        .select("*")
        .eq("id", condominioId)
        .single();

      if (condoData) setCondominio(condoData);

      await fetchOrders();

      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name, email, role");

      if (usersData) {
        setListaTecnicos(usersData as Tecnico[]);
      }

      setLoading(false);
    };

    fetchDadosIniciais();
  }, [condominioId]);

  const totalChamados = orders.length;
  const emAberto = orders.filter((o) => o.status === "aberto").length;
  const emAndamento = orders.filter((o) => o.status === "em_andamento").length;
  const concluidos = orders.filter((o) => o.status === "concluido").length;

  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== "todos" && order.status !== filterStatus) {
      return false;
    }

    if (searchQuery.trim()) {
      const termoBusca = searchQuery.toLowerCase().trim();
      const numeroLimpo = termoBusca
        .replace("os-", "")
        .replace("os", "")
        .trim();
      const orderOSNumber = (order.os_number || "").toLowerCase();
      const orderOSNumberLimpo = orderOSNumber
        .replace("os-", "")
        .replace("os", "")
        .trim();

      const bateNumero =
        orderOSNumber.includes(termoBusca) ||
        orderOSNumberLimpo === numeroLimpo;
      const bateTitulo =
        order.title?.toLowerCase().includes(termoBusca) ||
        order.titulo?.toLowerCase().includes(termoBusca);
      const bateDescricao =
        order.description?.toLowerCase().includes(termoBusca) ||
        order.descricao?.toLowerCase().includes(termoBusca);

      return bateNumero || bateTitulo || bateDescricao;
    }

    return true;
  });

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setEditTitulo(order.title || order.titulo || "");
    setEditDescricao(order.description || order.descricao || "");
    setEditStatus(order.status || "aberto");
    setEditTecnicoId(order.tecnico_id || "");

    if (order.data_agendamento) {
      const dataFormatada = new Date(order.data_agendamento)
        .toISOString()
        .slice(0, 16);
      setEditDataAgendamento(dataFormatada);
    } else {
      setEditDataAgendamento("");
    }

    setIsEditing(false);
    setIsDetailsOpen(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsSaving(true);

    try {
      const dadosParaAtualizar: Partial<Order> = {
        title: editTitulo,
        description: editDescricao,
        status: editStatus,
        tecnico_id: editTecnicoId || undefined,
      };

      if (editStatus === "agendado") {
        if (!editDataAgendamento) {
          alert("Por favor, defina a data e hora para o agendamento.");
          setIsSaving(false);
          return;
        }
        dadosParaAtualizar.data_agendamento = new Date(
          editDataAgendamento,
        ).toISOString();
        dadosParaAtualizar.status = "agendado";
      } else {
        dadosParaAtualizar.data_agendamento = null;
      }

      //  mostrar a data de criação do chamado

      const { error } = await supabase
        .from("orders")
        .update(dadosParaAtualizar)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      setIsEditing(false);
      setIsDetailsOpen(false);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar o chamado.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Abrindo Pasta...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      <header className="max-w-7xl mx-auto space-y-4 border-b border-slate-900 pb-6 mb-8">
        <button
          onClick={() => router.push("/admin")}
          className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          ⬅️ Voltar para as Pastas
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              📂 {condominio?.nome || "Pasta do Condomínio"}
            </h1>
            <p className="text-xs text-slate-400">
              📍 {condominio?.endereco || "Endereço não cadastrado"}
            </p>
          </div>
          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-400">
            👤 Síndico:{" "}
            <strong className="text-white">
              {condominio?.sindico_nome || "Não informado"}
            </strong>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Geral na Pasta
            </p>
            <p className="text-2xl font-black text-white mt-1">
              {totalChamados}
            </p>
          </div>
          <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Aguardando Técnico
            </p>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {emAberto}
            </p>
          </div>
          <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
              Em Execução
            </p>
            <p className="text-2xl font-black text-blue-400 mt-1">
              {emAndamento}
            </p>
          </div>
          <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              Finalizados
            </p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {concluidos}
            </p>
          </div>
        </section>

        <section className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-900/40 p-3 rounded-2xl border border-slate-900">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            {["todos", "aberto", "em_andamento", "concluido"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                  filterStatus === status
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="🔍 Buscar por Nº OS, título ou bloco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-900 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Nº / Descrição</th>
                  <th className="p-4">Técnico Encarregado</th>
                  <th className="p-4">Criado</th>
                  <th className="p-4">Tempo de Espera / SLA</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-xs text-slate-500 uppercase tracking-wide font-medium"
                    >
                      📭 Nenhum chamado encontrado nesta busca.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const statusAlerta = obterAlertaAtraso(order);

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-800/20 transition-colors"
                      >
                        {/* 1. Nº / Descrição */}
                        <td className="p-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sb font-mono font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-xl whitespace-nowrap">
                              {order.os_number ||
                                `OS-${order.id?.slice(0, 4).toUpperCase()}`}
                            </span>
                            <span className="font-bold text-white">
                              {order.title || order.titulo || "Sem título"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 max-w-md truncate mt-1.5 pl-1">
                            {order.description || order.descricao}
                          </p>
                        </td>

                        {/* 2. Técnico */}
                        <td className="p-4 text-xs text-blue-400 font-bold uppercase tracking-wide">
                          🛠{" "}
                          {order.profiles?.full_name ||
                            order.tecnico_name ||
                            "Não direcionado"}
                        </td>

                        {/* 3. Data/Hora (NOVO) */}
                        <td className="p-4 text-xs text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>

                        {/* 4. SLA */}
                        <td className="p-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg ${statusAlerta.cor} ${statusAlerta.pisca ? "animate-pulse font-black" : ""}`}
                          >
                            {statusAlerta.texto}
                          </span>
                        </td>

                        {/* 5. Status */}
                        <td className="p-4">
                          <span
                            className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              order.status === "concluido"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : order.status === "em_andamento"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>

                        {/* 6. Ações */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenDetails(order)}
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-xl transition-colors"
                          >
                            ⚙️ Gerenciar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {/* ================= MODAL DUPLO ================= */}
      {isDetailsOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                  Ordem de Serviço:{" "}
                  {selectedOrder.os_number ||
                    `OS-${selectedOrder.id?.slice(0, 4).toUpperCase()}`}
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white mt-1">
                  {isEditing
                    ? "📝 Editar Informações"
                    : "🔍 Visualizar Chamado"}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              {(() => {
                const statusAlerta = obterAlertaAtraso(selectedOrder);
                return (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${statusAlerta.cor}`}
                  >
                    <span>⏱️ Tempo acumulado desde a abertura:</span>
                    <span className="font-bold uppercase tracking-wider">
                      {statusAlerta.texto}
                    </span>
                  </div>
                );
              })()}
            </div>

            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">
                      Título
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={editTitulo}
                        onChange={(e) => setEditTitulo(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none mt-1"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-100 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 mt-1">
                        {selectedOrder.title || "Sem título"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">
                      Descrição
                    </label>
                    {isEditing ? (
                      <textarea
                        rows={5}
                        required
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none mt-1 resize-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 mt-1 whitespace-pre-line min-h-[120px]">
                        {selectedOrder.description ||
                          "Nenhuma descrição fornecida."}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Responsável Técnico
                      </label>
                      {isEditing ? (
                        <select
                          value={editTecnicoId}
                          onChange={(e) => setEditTecnicoId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none mt-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        >
                          <option value="">⚠️ Não direcionado / Nenhum</option>
                          {listaTecnicos &&
                            listaTecnicos
                              .filter(
                                (t) =>
                                  t &&
                                  t.role &&
                                  String(t.role).toLowerCase() === "tecnico",
                              )
                              .map((t) => (
                                <option
                                  key={t.id}
                                  value={t.id}
                                  className="bg-slate-950 text-white"
                                >
                                  🛠️ {t.full_name} ({t.email})
                                </option>
                              ))}
                        </select>
                      ) : (
                        <p className="text-sm text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 mt-1">
                          🛠️{" "}
                          {selectedOrder.profiles?.full_name ||
                            selectedOrder.tecnico_name ||
                            "Não direcionado"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Status
                      </label>
                      {isEditing ? (
                        <select
                          value={editStatus}
                          onChange={(e) => {
                            setEditStatus(e.target.value);
                            if (
                              e.target.value === "agendado" &&
                              !editTecnicoId
                            ) {
                              alert(
                                "Lembre-se de selecionar um técnico para este agendamento!",
                              );
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none mt-1"
                        >
                          <option value="aberto">⏳ Em Aberto</option>
                          <option value="agendado">
                            📅 Agendamento de Visita
                          </option>
                          <option value="em_andamento">⚡ Em Andamento</option>
                          <option value="concluido">✅ Concluído</option>
                        </select>
                      ) : (
                        <p className="text-sm text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 mt-1 uppercase font-bold text-xs">
                          {selectedOrder.status || "aberto"}
                        </p>
                      )}
                    </div>

                    {(editStatus === "agendado" ||
                      selectedOrder.data_agendamento) && (
                      <div className="col-span-1 sm:col-span-2 bg-slate-950/30 p-3 rounded-xl border border-slate-800/50 mt-1">
                        <label className="text-[10px] font-bold uppercase text-blue-400 block mb-1">
                          📅 Data e Horário Previsto da Visita
                        </label>
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            required={editStatus === "agendado"}
                            value={editDataAgendamento}
                            onChange={(e) =>
                              setEditDataAgendamento(e.target.value)
                            }
                            className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-xs font-mono text-slate-300">
                            {selectedOrder.data_agendamento
                              ? `Agendado para: ${new Date(selectedOrder.data_agendamento).toLocaleString("pt-BR")}`
                              : "Nenhuma data definida para esta ordem."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* 📸 FOTO DO MORADOR (Abertura do Chamado) */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-blue-400 block mb-1">
                      📸 Foto do Defeito (Morador) - Clique para ampliar
                    </label>
                    {selectedOrder.photo_url ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-[220px] p-2 mt-1">
                        <img
                          src={selectedOrder.photo_url}
                          alt="Foto do Defeito"
                          onClick={() => setIsPhotoZoomed(true)}
                          className="max-h-full max-w-full object-contain rounded-lg mx-auto cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div
                          onClick={() => setIsPhotoZoomed(true)}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-zoom-in"
                        >
                          <span className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 text-white">
                            🔍 Clique para Ampliar
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-800 bg-slate-950/25 h-[120px] flex items-center justify-center rounded-xl text-center mt-1">
                        <p className="text-xs text-slate-500">
                          📁 Nenhuma foto anexada pelo morador.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 🛠️ FOTO DO TÉCNICO (Conclusão do Chamado) */}
                  {selectedOrder.status === "concluido" && (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
                        ✅ Comprovante de Conclusão (Técnico)
                      </label>
                      {selectedOrder.updated_by ? (
                        <div className="relative group rounded-xl overflow-hidden border border-emerald-500/20 bg-slate-950 h-[220px] p-2 mt-1">
                          <img
                            src={selectedOrder.updated_by}
                            alt="Evidência do Técnico"
                            onClick={() => setIsPhotoZoomed(true)}
                            className="max-h-full max-w-full object-contain rounded-lg mx-auto cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <div
                            onClick={() => setIsPhotoZoomed(true)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-zoom-in"
                          >
                            <span className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 text-white">
                              🔍 Clique para Ampliar
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-800 bg-slate-950/25 h-[120px] flex items-center justify-center rounded-xl text-center mt-1">
                          <p className="text-xs text-slate-500">
                            📁 Sem foto de conclusão enviada pelo técnico.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-6">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    ✏️ Editar Dados da OS
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-300"
                  >
                    Voltar para Leitura
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="text-xs font-bold uppercase text-slate-400 px-4 py-2"
                  >
                    {isEditing ? "Cancelar" : "Fechar"}
                  </button>

                  {isEditing && (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold uppercase rounded-xl disabled:opacity-50"
                    >
                      {isSaving ? "Salvando..." : "Salvar"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ZOOM DA FOTO ================= */}
      {isPhotoZoomed && selectedOrder?.updated_by && (
        <div
          onClick={() => setIsPhotoZoomed(false)}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <button
            onClick={() => setIsPhotoZoomed(false)}
            className="absolute top-6 right-6 bg-slate-900/80 hover:bg-slate-800 text-white p-3 rounded-full border border-slate-800 text-lg"
          >
            ✕
          </button>
          <img
            src={selectedOrder.updated_by}
            alt="Evidência ampliada"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-xs text-slate-400 mt-4 bg-slate-900/40 px-4 py-2 rounded-full border border-slate-800/40">
            Clique em qualquer lugar para sair do zoom
          </p>
        </div>
      )}
    </div>
  );
}
