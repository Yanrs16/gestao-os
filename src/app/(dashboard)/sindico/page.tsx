"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function SindicoDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [condoName, setCondoName] = useState("");

  // Contadores para o resumo
  const [resumo, setResumo] = useState({
    total: 0,
    pendentes: 0,
    concluidos: 0,
  });

  useEffect(() => {
    async function carregarDadosDoSindico() {
      try {
        setLoading(true);

        // 1. Pega o usuário autenticado atual
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.error("Usuário não autenticado");
          setLoading(false);
          return;
        }

        // 2. Busca o condomínio vinculado ao perfil do usuário
        const { data: perfil, error: perfilError } = await supabase
          .from("profiles")
          .select("condominium_id")
          .eq("id", user.id)
          .maybeSingle();

        const condoId =
          perfil?.condominium_id || user.user_metadata?.condominium_id;

        if (!condoId) {
          console.error("Este usuário não está vinculado a nenhum condomínio.");
          setOrders([]);
          setCondoName("Não vinculado");
          setLoading(false);
          return;
        }

        // 3. Busca o nome do condomínio de forma direta e garantida
        const { data: condo } = await supabase
          .from("condominiums")
          .select("nome")
          .eq("id", condoId)
          .maybeSingle();

        if (condo?.nome) {
          setCondoName(condo.nome);
        }

        // 4. Busca apenas os chamados deste condomínio específico (sem precisar fazer join)
        const { data: chamados, error: chamadosError } = await supabase
          .from("orders")
          .select(
            `
            id,
            os_number,
            title,
            description,
            status,
            created_at,
            updated_by,
            data_agendamento,
            horario_agendamento
          `,
          )
          .eq("condominium_id", condoId)
          .order("created_at", { ascending: false });

        if (chamadosError) throw chamadosError;

        if (chamados) {
          setOrders(chamados);

          // Calcula os contadores do resumo
          const total = chamados.length;
          const concluidos = chamados.filter(
            (o) => o.status === "concluido",
          ).length;
          const pendentes = total - concluidos;

          setResumo({ total, pendentes, concluidos });
        }
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarDadosDoSindico();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* TOPO COM IDENTIFICAÇÃO E AÇÕES */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-900 p-6 rounded-2xl border border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏢</span>
              <h1 className="text-xl font-black uppercase tracking-wide text-white">
                Painel do Síndico
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Condomínio atual:{" "}
              <span className="text-indigo-400 font-bold">
                {condoName || "Carregando..."}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão de abertura que redireciona para a sua página de criação de chamados */}
            {/* DICA: Passe um parâmetro na URL (?origem=sindico) para tratar o retorno após salvar */}
            <Link
              href="/publico/abrir-chamado?retorno=sindico"
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider px-4 py-3 rounded-xl transition-all text-center flex-1 md:flex-initial"
            >
              ➕ Abrir Chamado
            </Link>

            <Link
              href="/"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider px-4 py-3 rounded-xl transition-all text-center"
            >
              Sair
            </Link>
          </div>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total de Chamados
            </p>
            <p className="text-3xl font-black text-white mt-2">
              {loading ? "..." : resumo.total}
            </p>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 border-l-amber-500/50 border-l-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Em Andamento / Abertos
            </p>
            <p className="text-3xl font-black text-amber-400 mt-2">
              {loading ? "..." : resumo.pendentes}
            </p>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 border-l-emerald-500/50 border-l-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Concluídos
            </p>
            <p className="text-3xl font-black text-emerald-400 mt-2">
              {loading ? "..." : resumo.concluidos}
            </p>
          </div>
        </div>

        {/* TABELA DE CONSULTA DE CHAMADOS */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Acompanhamento de Ordens de Serviço
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Buscando os chamados do seu condomínio...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Nenhum chamado encontrado para este condomínio.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-bold uppercase">
                    <th className="p-4">Nº da OS</th>
                    <th className="p-4">Título</th>
                    <th className="p-4">Abertura</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-indigo-400">
                        {order.os_number || "N/A"}
                      </td>
                      <td className="p-4 font-semibold text-white max-w-xs truncate">
                        {order.title}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-md font-bold uppercase text-[10px] tracking-wider ${
                            order.status === "concluido"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {order.status === "concluido"
                            ? "Concluído"
                            : "Em Aberto"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          href={`/publico/consultar-os?code=${order.os_number}&retorno=sindico`}
                          className="inline-block bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-lg transition-all"
                        >
                          🔍 Visualizar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
