"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

function TrackOrderContent() {
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const searchParams = useSearchParams();
  const urlCode = searchParams.get("code");
  const retorno = searchParams.get("retorno");

  // Função de busca com JOIN nas tabelas de feedbacks e anexos
  const buscarOS = async (codigoParaBuscar: string) => {
    if (!codigoParaBuscar.trim()) return;

    setLoading(true);
    setSearched(false);
    setErro("");
    setOrder(null);

    let termoFormatado = codigoParaBuscar.trim().toUpperCase();
    if (!termoFormatado.startsWith("OS-")) {
      termoFormatado = `OS-${termoFormatado.replace("OS", "").trim()}`;
    }

    try {
      // ✅ Traz a OS + Feedbacks (Comentários) + Attachments (Anexos/Fotos)
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_feedbacks(*),
          order_attachments(*)
        `,
        )
        // @ts-ignore
        .eq("os_number", termoFormatado)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setErro(
          "Nenhum chamado encontrado com este número. Verifique e tente novamente.",
        );
      } else {
        setOrder(data);
      }
    } catch (err: any) {
      console.error("Erro na busca da OS:", err);
      setErro("Ocorreu um erro ao buscar a Ordem de Serviço.");
    } finally {
      setSearched(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlCode) {
      setCode(urlCode);
      buscarOS(urlCode);
    }
  }, [urlCode]);

  const formatarData = (dataString: string) => {
    if (!dataString) return "";
    const data = new Date(dataString);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-6">
        {/* BOTÃO VOLTAR */}
        <div className="flex justify-start">
          <Link
            href={retorno === "sindico" ? "/sindico" : "/"}
            className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            <span>⬅️</span> Voltar para o Início
          </Link>
        </div>

        {/* CABEÇALHO */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <h1 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>🔍</span> Acompanhar OS
            </h1>
            <p className="text-[11px] text-slate-400">
              Visualização em tempo real do chamado
            </p>
          </div>

          {(code || urlCode) && (
            <button
              type="button"
              onClick={() => buscarOS(code || urlCode || "")}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            >
              <span className={loading ? "animate-spin inline-block" : ""}>
                🔄
              </span>
              <span className="hidden sm:inline">
                {loading ? "Atualizando..." : "Atualizar"}
              </span>
            </button>
          )}
        </div>

        {/* FORMULÁRIO SE NÃO HOUVER CÓDIGO NA URL */}
        {!urlCode && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              buscarOS(code);
            }}
            className="flex gap-2"
          >
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
              {loading ? "..." : "Buscar"}
            </button>
          </form>
        )}

        {/* STATUS DE CARREGAMENTO */}
        {loading && (
          <div className="text-xs text-slate-400 text-center py-4 animate-pulse">
            ⏳ Buscando informações do chamado técnico...
          </div>
        )}

        {/* MENSAGEM DE ERRO */}
        {searched && erro && !loading && (
          <div className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center font-medium">
            ⚠️ {erro}
          </div>
        )}

        {/* RESULTADO DA OS */}
        {order && !loading && (
          <div className="border-t border-slate-800 pt-5 space-y-5">
            {/* INFORMAÇÕES BÁSICAS */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Identificação da OS:
                </span>
                <span className="text-blue-400 font-mono font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md text-[10px]">
                  {order.os_number ||
                    `OS-${order.id?.slice(0, 4).toUpperCase()}`}
                </span>
              </div>
              <p className="font-semibold text-sm text-slate-200">
                {order.title || "Chamado Técnico"}
              </p>

              {order.description && (
                <p className="text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-900/60 whitespace-pre-line leading-relaxed">
                  {order.description}
                </p>
              )}
            </div>

            {/* LINHA DO TEMPO */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <span>📍</span> PROGRESSO ATUAL
              </h3>

              <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 ml-2">
                {/* 1. CHAMADO ABERTO */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 bg-amber-500 text-slate-950 w-3.5 h-3.5 rounded-full ring-4 ring-slate-900" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-200">
                      Chamado Aberto com Sucesso
                    </p>
                    {order.created_at && (
                      <p className="text-[9px] text-slate-500 font-medium mt-1">
                        Registrado em: {formatarData(order.created_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. AGENDAMENTO DE VISITA */}
                <div className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-900 transition-colors ${
                      order.status === "agendado" ||
                      order.status === "em_andamento" ||
                      order.status === "em_atendimento" ||
                      order.status === "concluido"
                        ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                        : "bg-slate-800"
                    }`}
                  />
                  <div
                    className={`text-xs ${
                      order.status === "aberto" ? "opacity-35" : "opacity-100"
                    }`}
                  >
                    <p className="font-bold text-slate-200 flex items-center gap-1.5">
                      Agendamento de Visita
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {order.data_agendamento
                        ? `Visita agendada para: ${new Date(order.data_agendamento).toLocaleString("pt-BR")}`
                        : order.status === "agendado"
                          ? "Visita confirmada pela equipe. Aguardando realização do serviço."
                          : "Aguardando definição do agendamento técnico."}
                    </p>
                  </div>
                </div>

                {/* 3. EM ANDAMENTO / ATENDIMENTO */}
                <div className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-900 transition-colors ${
                      order.status === "em_andamento" ||
                      order.status === "em_atendimento" ||
                      order.status === "concluido"
                        ? "bg-blue-500"
                        : "bg-slate-800"
                    }`}
                  />
                  <div
                    className={`text-xs ${
                      order.status === "aberto" || order.status === "agendado"
                        ? "opacity-35"
                        : "opacity-100"
                    }`}
                  >
                    <p className="font-bold text-slate-200">
                      Técnico Designado & Manutenção Iniciada
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {order.tecnico_name
                        ? `O profissional (${order.tecnico_name}) está no atendimento.`
                        : "A ordem foi direcionada para a equipe técnica."}
                    </p>
                  </div>
                </div>

                {/* 4. CONCLUÍDO */}
                <div className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-900 transition-colors ${
                      order.status === "concluido"
                        ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        : "bg-slate-800"
                    }`}
                  />
                  <div
                    className={`text-xs ${
                      order.status !== "concluido"
                        ? "opacity-35"
                        : "opacity-100"
                    }`}
                  >
                    <p className="font-bold text-slate-200">
                      Ordem de Serviço Finalizada
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* FOTOS / ANEXOS DA OS (Trata order_attachments + photo_url) */}
            {(() => {
              const anexos = order.order_attachments || [];

              // Foto anexada pelo técnico
              const anexoTecnico = anexos.find(
                (a: any) =>
                  String(a.uploaded_role).toLowerCase() === "tecnico" ||
                  String(a.uploaded_role).toLowerCase() === "technician",
              );

              // Foto de capa da abertura (coluna photo_url ou anexo do morador)
              const fotoMorador =
                order.photo_url ||
                anexos.find(
                  (a: any) =>
                    String(a.uploaded_role).toLowerCase() === "morador" ||
                    String(a.uploaded_role).toLowerCase() === "sindico",
                )?.file_url;

              const fotoTecnicoUrl =
                anexoTecnico?.file_url ||
                order.updated_by ||
                order.completion_photo;

              return (
                <div className="space-y-4">
                  {/* Foto da Abertura */}
                  {fotoMorador && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 text-left mb-2 pl-1">
                        📸 Foto Anexada na Abertura:
                      </p>
                      <img
                        src={fotoMorador}
                        alt="Foto da abertura"
                        className="max-h-[220px] mx-auto object-contain rounded-lg shadow-md"
                      />
                    </div>
                  )}

                  {/* Foto de Conclusão do Técnico */}
                  {fotoTecnicoUrl && (
                    <div className="rounded-xl overflow-hidden border border-emerald-500/20 bg-slate-950 p-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 text-left mb-2 pl-1">
                        ✅ Evidência do Técnico (Anexo):
                      </p>
                      <img
                        src={fotoTecnicoUrl}
                        alt="Foto de conclusão do técnico"
                        className="max-h-[220px] mx-auto object-contain rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* PARECER / COMENTÁRIOS DO TÉCNICO (order_feedbacks + notas diretas) */}
            {(() => {
              const feedbacks = order.order_feedbacks || [];
              const notaDireta =
                order.technical_notes ||
                order.notas_tecnicas ||
                order.parecer_tecnico;

              if (feedbacks.length === 0 && !notaDireta) return null;

              return (
                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                    💬 Parecer / Comentários do Técnico
                  </h3>

                  {notaDireta && (
                    <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl text-xs text-slate-300">
                      <span className="font-bold text-blue-400 block uppercase text-[10px] tracking-wider mb-1">
                        📋 Nota de Encerramento:
                      </span>
                      <p className="leading-relaxed italic">"{notaDireta}"</p>
                    </div>
                  )}

                  {feedbacks.map((f: any) => (
                    <div
                      key={f.id || Math.random()}
                      className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-blue-300">
                          🛠️{" "}
                          {f.author_role
                            ? f.author_role.toUpperCase()
                            : "TÉCNICO"}
                        </span>
                        <span>
                          {f.created_at
                            ? new Date(f.created_at).toLocaleString("pt-BR")
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed pt-1">
                        {f.message || f.comment || f.texto}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">
          Carregando painel...
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
