"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function TecnicoDashboard() {
  const router = useRouter();
  const [tecnico, setTecnico] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pendentes"); // pendentes ou concluidos

  // Estados para o Modal de Ações da OS
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);

      // 1. Pega o usuário logado na sessão do Supabase Auth
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // 2. Pega os dados do Perfil dele e valida a Role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // SEGURANÇA: Se não achar o perfil ou a role não for 'tecnico', barra o acesso!
      if (profileError || !profile || profile.role !== "tecnico") {
        alert("Acesso negado. Esta área é exclusiva para técnicos.");
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      setTecnico(profile);

      // 3. Busca as ordens de serviço vinculadas a esse ID técnico
      await fetchTecnicoOrders(user.id);
      setLoading(false);
    };

    checkUser();
  }, []);

  const fetchTecnicoOrders = async (tecnicoId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, condominiums(nome, endereco)") // Nome correto em inglês
      .eq("tecnico_id", tecnicoId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar chamados:", error);
      return;
    }

    if (data) setOrders(data);
  };

  // Função para extrair a URL da foto do morador sem erros de tipo no TS
  const getOrderImageUrl = (order: any) => {
    if (!order) return null;

    const rawPath =
      order.photo_url ||
      order.foto_url ||
      order.image_url ||
      order.foto ||
      order.photo ||
      order.image ||
      order.anexo;

    if (!rawPath || typeof rawPath !== "string") return null;

    if (rawPath.startsWith("http")) {
      return rawPath;
    }

    try {
      const { data } = supabase.storage.from("os_files").getPublicUrl(rawPath);
      return data.publicUrl;
    } catch (e) {
      return null;
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "pendentes") {
      return order.status !== "concluido";
    }
    return order.status === "concluido";
  });

  const handleManageOrder = (order: any) => {
    console.log(" DADOS COMPLETOS DA OS SELECIONADA:", order);
    setSelectedOrder(order);
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (novoStatus: string) => {
    if (!selectedOrder || !tecnico) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: novoStatus })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      await fetchTecnicoOrders(tecnico.id);
      setIsModalOpen(false);
      alert(`Status atualizado para ${novoStatus.replace("_", " ")}!`);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFinalizeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !imageFile || !tecnico) return;
    setIsSubmitting(true);

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${selectedOrder.os_number || selectedOrder.id}-${Date.now()}.${fileExt}`;
      const filePath = `evidencias/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("os_files")
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("os_files").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "concluido",
          updated_by: publicUrl,
        })
        .eq("id", selectedOrder.id);

      if (updateError) throw updateError;

      await fetchTecnicoOrders(tecnico.id);
      setIsModalOpen(false);
      alert("Ordem de Serviço Concluída com Sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar a OS.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col pb-12">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
              ÁREA DO TÉCNICO
            </span>
            <h1 className="text-base font-black text-white truncate max-w-[200px]">
              Olá, {tecnico?.full_name?.split(" ")[0] || "Técnico"} 🛠️
            </h1>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilterStatus("pendentes")}
            className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              filterStatus === "pendentes"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⏳ Pendentes (
            {orders.filter((o) => o.status !== "concluido").length})
          </button>
          <button
            onClick={() => setFilterStatus("concluidos")}
            className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              filterStatus === "concluidos"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ✅ Concluídos (
            {orders.filter((o) => o.status === "concluido").length})
          </button>
        </div>

        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
              <p className="text-sm text-slate-500 font-medium">
                Nenhum chamado por aqui. 👍
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleManageOrder(order)}
                className="bg-slate-900 border border-slate-850 p-4 rounded-2xl shadow-sm active:scale-[0.99] transition-transform cursor-pointer space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-mono text-xs font-black bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg">
                    {order.os_number || "OS-PROV"}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      order.status === "em_andamento"
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : order.status === "agendado"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : order.status === "concluido"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm line-clamp-1">
                    {order.title || order.titulo}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                    {order.description || order.descricao}
                  </p>
                </div>

                <div className="border-t border-slate-800/60 pt-2.5 flex flex-col gap-1 text-xs text-slate-400">
                  <p className="truncate">
                    🏢{" "}
                    <strong className="text-slate-200">
                      {order.condominiums?.nome}
                    </strong>
                  </p>
                  <p className="truncate text-[11px]">
                    📍 {order.condominiums?.endereco}
                  </p>
                  {order.data_agendamento && (
                    <p className="text-amber-400 text-[11px] font-medium mt-1">
                      📅 Visita:{" "}
                      {new Date(order.data_agendamento).toLocaleString(
                        "pt-BR",
                        { dateStyle: "short", timeStyle: "short" },
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ================= MODAL DE AÇÃO COMPACTO PARA CELULAR ================= */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl text-white max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-blue-400 font-bold">
                  {selectedOrder.os_number}
                </span>
                <h2 className="text-sm font-black uppercase text-white">
                  {selectedOrder.title || selectedOrder.titulo}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-800 text-slate-400 rounded-full font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs space-y-1">
              <p className="text-slate-400">
                <strong>Condomínio:</strong> {selectedOrder.condominiums?.nome}
              </p>
              <p className="text-slate-400">
                <strong>Descrição:</strong>{" "}
                {selectedOrder.description || selectedOrder.descricao}
              </p>
            </div>

            {/* 📸 FOTO DO PROBLEMA (MORADOR) */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                📸 Foto do Problema (Morador):
              </span>

              {getOrderImageUrl(selectedOrder) ? (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
                  <img
                    src={getOrderImageUrl(selectedOrder)!}
                    alt="Foto enviada pelo morador"
                    className="w-full max-h-48 object-contain rounded-lg mx-auto"
                    onError={(e) => {
                      console.error("Erro ao carregar imagem:", e);
                    }}
                  />
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic bg-slate-950 p-2.5 rounded-xl border border-slate-800/50">
                  Nenhuma foto anexada pelo morador para esta OS.
                </p>
              )}
            </div>

            {selectedOrder.status === "concluido" ? (
              <div className="space-y-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/20 text-center text-xs font-bold">
                  ✅ ESTA ORDEM JÁ FOI FINALIZADA
                </div>
                {selectedOrder.updated_by && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      ✅ Evidência da Conclusão:
                    </span>
                    <img
                      src={selectedOrder.updated_by}
                      alt="Evidência do Técnico"
                      className="w-full h-48 object-cover rounded-xl border border-slate-800"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {selectedOrder.status !== "em_andamento" && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleUpdateStatus("em_andamento")}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wide transition-colors"
                    >
                      ⚡ Iniciar Serviço Agora
                    </button>
                  )}
                </div>

                <form
                  onSubmit={handleFinalizeOrder}
                  className="border-t border-slate-800 pt-3 space-y-3"
                >
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Concluir e Fechar Chamado:
                  </span>

                  <div className="space-y-2">
                    <label className="block bg-slate-950 border-2 border-dashed border-slate-800 hover:border-blue-500 p-4 rounded-xl text-center cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                        required
                      />
                      {imagePreview ? (
                        <div className="space-y-2">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-36 mx-auto object-contain rounded-lg"
                          />
                          <p className="text-[10px] text-blue-400 font-bold">
                            📸 Trocar foto
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1 py-2">
                          <p className="text-xs font-bold text-slate-300">
                            📸 Tirar Foto da Evidência
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Obrigatório para concluir
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !imageFile}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wide transition-all"
                  >
                    {isSubmitting
                      ? "Enviando Comprovante..."
                      : "✅ Concluir Chamado"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
