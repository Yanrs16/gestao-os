"use client";

import { useEffect, useState } from "react";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function AdminDashboard() {
  const router = useRouter();

  // Abas do Painel: 'condos' | 'tecnicos' | 'sindicos'
  const [activeTab, setActiveTab] = useState<
    "condos" | "tecnicos" | "sindicos"
  >("condos");

  // Estados Gerais
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroChamados, setFiltroChamados] = useState<
    "todos" | "com_chamados" | "agendados" | "sem_chamados"
  >("todos");
  ("todos");

  // ESTADOS DO MODAL DE RESET DE SENHA (Nomes ajustados para não duplicar)
  const [modalOpen, setModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isConfirmCondoModalOpen, setIsConfirmCondoModalOpen] = useState(false);
  const [condoToInactivate, setCondoToInactivate] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  // Estados - Condomínios
  const [condominiums, setCondominiums] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCondo, setSelectedCondo] = useState<any | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEndereco, setEditEndereco] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [sindicoId, setSindicoId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Estados - Técnicos e Síndicos (Profiles)
  const [users, setUsers] = useState<any[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userNome, setUserNome] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userSenha, setUserSenha] = useState("");
  const [selectedCondoId, setSelectedCondoId] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // ESTADOS DE EDIÇÃO DE USUÁRIOS (Técnicos/Síndicos)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null); // Esse edita Nome/Email
  const [editUserNome, setEditUserNome] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);

  const listaSindicosDisponiveis = Array.isArray(users)
    ? users.filter((u) => u.role === "sindico")
    : [];

  // FUNÇÃO DEFINITIVA DO MODAL DE RESET
  const executeResetPassword = async (
    newPassword: string,
  ): Promise<boolean> => {
    if (!userToReset) return false;

    setIsResettingPassword(true);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userToReset.id, newPassword }),
      });

      const resultado = await response.json();
      if (!response.ok)
        throw new Error(resultado.error || "Erro ao redefinir.");

      return true;
    } catch (error: any) {
      alert(`Erro no servidor: ${error.message}`);
      return false;
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 1. Busca Condomínios e agrega a contagem de Ordens de Serviço
  const fetchCondos = async () => {
    try {
      const { data: condos, error: condoError } = await supabase
        .from("condominiums")
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (condoError) throw condoError;

      if (condos) {
        const { data: chamados, error: chamadosError } = await supabase
          .from("orders")
          .select("condominium_id, status")
          .in("status", ["aberto", "em_atendimento", "pendente", "agendado"]);

        if (chamadosError)
          console.error("Erro ao contar chamados:", chamadosError.message);

        const condosComNotificacao = condos.map((condo) => {
          const chamadosDoCondo = chamados
            ? chamados.filter((c) => c.condominium_id === condo.id)
            : [];
          const ativos = chamadosDoCondo.filter((c) =>
            ["aberto", "em_atendimento", "pendente"].includes(c.status),
          ).length;
          const agendados = chamadosDoCondo.filter(
            (c) => c.status === "agendado",
          ).length;

          return {
            ...condo,
            chamados_ativos: ativos,
            chamados_agendados: agendados,
          };
        });

        setCondominiums(condosComNotificacao);
      }
    } catch (error: any) {
      console.error("Erro ao buscar condomínios:", error.message);
    }
  };

  // 2. Busca Usuários Ativos
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error.message);
    }
  };

  useEffect(() => {
    const checkUserAndFetch = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      await Promise.all([fetchCondos(), fetchUsers()]);
      setLoading(false);
    };

    checkUserAndFetch();
  }, []);

  // Cadastro de Condomínio
  const handleCreateCondo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return alert("O nome do condomínio é obrigatório!");
    setIsCreating(true);

    let idSindicoValido = null;
    const sindicoEncontrado = listaSindicosDisponiveis.find(
      (s) => s.id === sindicoId || s.full_name === sindicoId,
    );

    if (sindicoEncontrado) {
      idSindicoValido = sindicoEncontrado.id;
    }

    const { data, error } = await supabase
      .from("condominiums")
      .insert([{ nome, endereco, sindico_id: idSindicoValido }])
      .select()
      .single();

    if (error) {
      alert("Erro ao cadastrar condomínio: " + error.message);
    } else {
      if (idSindicoValido && data) {
        await supabase
          .from("profiles")
          .update({ condominium_id: data.id })
          .eq("id", idSindicoValido);
      }

      setNome("");
      setEndereco("");
      setSindicoId("");
      setShowForm(false);
      await Promise.all([fetchCondos(), fetchUsers()]);
    }
    setIsCreating(false);
  };

  // Cadastro de Operadores
  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNome || !userEmail || !userSenha)
      return alert("Todos os campos são obrigatórios!");

    if (userSenha.length < 6) {
      return alert("A senha provisória deve conter no mínimo 6 caracteres!");
    }

    setIsCreatingUser(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: userEmail,
        password: userSenha,
        options: {
          data: {
            full_name: userNome,
            role: activeTab === "tecnicos" ? "tecnico" : "sindico",
          },
        },
      });

      if (authError) throw authError;

      if (data?.user) {
        const isSindico = activeTab === "sindicos";
        const condoIdParaVincular =
          isSindico && selectedCondoId ? selectedCondoId : null;

        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: userNome,
          role: activeTab === "tecnicos" ? "tecnico" : "sindico",
          email: userEmail,
          condominium_id: condoIdParaVincular,
          active: true,
        });

        if (profileError) throw profileError;

        if (isSindico && condoIdParaVincular) {
          const { error: condoError } = await supabase
            .from("condominiums")
            .update({ sindico_id: data.user.id })
            .eq("id", condoIdParaVincular);

          if (condoError)
            console.error(
              "Erro ao atualizar síndico no condomínio:",
              condoError.message,
            );
        }

        alert("Operador registrado com sucesso!");
        setUserNome("");
        setUserEmail("");
        setUserSenha("");
        setSelectedCondoId("");
        setShowUserForm(false);
        await Promise.all([fetchCondos(), fetchUsers()]);
      }
    } catch (err: any) {
      alert("Erro ao registrar operador: " + err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Exclusão Lógica
  const handleSoftDeleteUser = async (id: string) => {
    if (
      !confirm(
        "Tem certeza que deseja remover o acesso deste operador? Históricos e OSs vinculadas serão mantidos.",
      )
    )
      return;

    const { error } = await supabase
      .from("profiles")
      .update({ active: false })
      .eq("id", id);

    if (error) alert("Erro ao desativar: " + error.message);
    else await fetchUsers();
  };

  // Exclusão Lógica de Condomínio
  const handleInactivateCondo = (id: string, nome: string) => {
    setCondoToInactivate({ id, nome });
    setIsConfirmCondoModalOpen(true);
  };

  const executeInactivateCondo = async () => {
    if (!condoToInactivate) return;

    try {
      const { error } = await supabase
        .from("condominiums")
        .update({ ativo: false })
        .eq("id", condoToInactivate.id);

      if (error) throw error;

      setCondominiums((prev) =>
        prev.filter((c) => c.id !== condoToInactivate.id),
      );
      setIsConfirmCondoModalOpen(false);
      setCondoToInactivate(null);
    } catch (error: any) {
      alert("Erro ao inativar condomínio: " + error.message);
    }
  };

  const handleOpenEditModal = (condo: any) => {
    if (!condo) return;
    setSelectedCondo(condo);
    setEditNome(condo.nome || "");
    setEditEndereco(condo.endereco || "");
    setSindicoId(condo.sindico_id || "");
    setIsModalOpen(true);
  };

  // Salvar Alterações da Edição de Condomínio
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCondo) return;
    setIsSaving(true);

    try {
      const sindicoEncontrado = listaSindicosDisponiveis.find(
        (s) => s.id === sindicoId || s.full_name === sindicoId,
      );
      const novoSindicoId = sindicoEncontrado ? sindicoEncontrado.id : null;

      const { error } = await supabase
        .from("condominiums")
        .update({
          nome: editNome,
          endereco: editEndereco,
          sindico_id: novoSindicoId,
        })
        .eq("id", selectedCondo.id);

      if (error) throw error;

      if (novoSindicoId) {
        await supabase
          .from("profiles")
          .update({ condominium_id: selectedCondo.id })
          .eq("id", novoSindicoId);
      }

      setIsModalOpen(false);
      await Promise.all([fetchCondos(), fetchUsers()]);
      alert("Condomínio updated com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // FUNÇÕES ADICIONADAS: Controle do Modal de Edição de Operador (Técnico/Síndico)
  const handleOpenEditUserModal = (user: any) => {
    if (!user) return;
    setSelectedUser(user);
    setEditUserNome(user.full_name || "");
    setEditUserEmail(user.email || "");
    setIsUserModalOpen(true);
  };

  const handleSaveUserChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSavingUser(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editUserNome, email: editUserEmail })
        .eq("id", selectedUser.id);

      if (error) throw error;

      setIsUserModalOpen(false);
      await fetchUsers();
      alert("Operador atualizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar usuário: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Filtro Dinâmico Combinado de Condomínios (Texto + Notificações)
  const filteredCondos = condominiums.filter((condo) => {
    const matchesSearch = condo.nome
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const qtdChamados = condo.chamados_ativos || 0;
    const qtdAgendados = condo.chamados_agendados || 0;

    if (!matchesSearch) return false;
    if (filtroChamados === "com_chamados") return qtdChamados > 0;
    if (filtroChamados === "agendados") return qtdAgendados > 0;
    if (filtroChamados === "sem_chamados")
      return qtdChamados === 0 && qtdAgendados === 0;
    return true;
  });

  const filteredUsers = users.filter(
    (u) =>
      u.active !== false &&
      u.role === (activeTab === "tecnicos" ? "tecnico" : "sindico") &&
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Carregando Pastas...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {/* CABEÇALHO */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-500 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Diretório de Operações Master
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wide">
            📁 Central<span className="text-blue-500">.OS</span> Control
          </h1>
        </div>

        <div className="flex gap-3">
          {activeTab === "condos" ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              {showForm ? "✖️ Fechar" : "➕ Novo Condomínio"}
            </button>
          ) : (
            <button
              onClick={() => setShowUserForm(!showUserForm)}
              className="text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              {showUserForm
                ? "✖️ Fechar"
                : activeTab === "tecnicos"
                  ? "➕ Novo Técnico"
                  : "➕ Novo Síndico"}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 px-4 py-2.5 rounded-xl transition-all"
          >
            🚪 Sair
          </button>
        </div>
      </header>

      {/* SELETOR DE ABAS */}
      <section className="max-w-7xl mx-auto mb-6 flex gap-2 border-b border-slate-900 pb-3">
        <button
          onClick={() => {
            setActiveTab("condos");
            setSearchTerm("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${activeTab === "condos" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400"}`}
        >
          🏢 Condomínios ({condominiums.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("tecnicos");
            setSearchTerm("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${activeTab === "tecnicos" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400"}`}
        >
          🛠️ Técnicos Parceiros (
          {
            users.filter((u) => u.role === "tecnico" && u.active !== false)
              .length
          }
          )
        </button>
        <button
          onClick={() => {
            setActiveTab("sindicos");
            setSearchTerm("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${activeTab === "sindicos" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400"}`}
        >
          👨‍💼 Síndicos Cadastrados (
          {
            users.filter((u) => u.role === "sindico" && u.active !== false)
              .length
          }
          )
        </button>
      </section>

      {/* BARRA DE PESQUISA E FILTROS DE NOTIFICAÇÃO */}
      <section className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="w-full max-w-md">
          <input
            type="text"
            placeholder={`🔍 Buscar ${activeTab === "condos" ? "condomínio" : activeTab === "tecnicos" ? "técnico" : "síndico"} por nome...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 p-3 rounded-xl text-sm text-white outline-none transition-all"
          />
        </div>

        {activeTab === "condos" && (
          <div className="flex flex-wrap gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFiltroChamados("todos")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filtroChamados === "todos" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroChamados("com_chamados")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${filtroChamados === "com_chamados" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-amber-400"}`}
            >
              ⚠️ Abertos (
              {condominiums.filter((c) => (c.chamados_ativos || 0) > 0).length})
            </button>
            <button
              onClick={() => setFiltroChamados("agendados")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${filtroChamados === "agendados" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400 hover:text-cyan-400"}`}
            >
              ⏳ Agendados (
              {
                condominiums.filter((c) => (c.chamados_agendados || 0) > 0)
                  .length
              }
              )
            </button>
            <button
              onClick={() => setFiltroChamados("sem_chamados")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filtroChamados === "sem_chamados" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-emerald-400"}`}
            >
              Limpos (
              {
                condominiums.filter(
                  (c) =>
                    (c.chamados_ativos || 0) === 0 &&
                    (c.chamados_agendados || 0) === 0,
                ).length
              }
              )
            </button>
          </div>
        )}
      </section>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* ================= ABA DE CONDOMÍNIOS ================= */}
        {activeTab === "condos" && (
          <>
            {showForm && (
              <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-xl space-y-4 shadow-2xl">
                <h2 className="text-sm font-black uppercase tracking-wider text-white border-b border-slate-850 pb-2">
                  🏢 Cadastrar Novo Condomínio
                </h2>
                <form onSubmit={handleCreateCondo} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Nome do Condomínio *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Bella Vista"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Endereço
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Rua A, 10"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Responsável / Síndico (Digite para buscar)
                      </label>
                      <input
                        type="text"
                        list="sindicos-cadastro-list"
                        placeholder="Comece a digitar o nome do síndico..."
                        value={
                          listaSindicosDisponiveis.find(
                            (s) => s.id === sindicoId,
                          )?.full_name || sindicoId
                        }
                        onChange={(e) => {
                          const valor = e.target.value;
                          const selecionado = listaSindicosDisponiveis.find(
                            (s) => s.full_name === valor,
                          );
                          setSindicoId(selecionado ? selecionado.id : valor);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none focus:border-blue-500"
                      />
                      <datalist id="sindicos-cadastro-list">
                        {listaSindicosDisponiveis.map((s) => (
                          <option key={s.id} value={s.full_name}>
                            {s.email}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    {isCreating ? "Cadastrando..." : "Salvar Condomínio"}
                  </button>
                </form>
              </section>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredCondos.map((condo) => {
                const temAberto = (condo.chamados_ativos || 0) > 0;
                const temAgendado = (condo.chamados_agendados || 0) > 0;

                //  Linha de segurança: se o resto do card usar 'temChamado', ele vai entender que se refere aos ativos
                const temChamado = temAberto;

                let classeBorda = "border-slate-800";
                if (temAberto) {
                  classeBorda = "border-amber-500/30";
                } else if (temAgendado) {
                  classeBorda = "border-cyan-500/30";
                }

                return (
                  <div
                    key={condo.id}
                    onClick={() => router.push(`/admin/${condo.id}`)}
                    className={`bg-slate-900 p-5 rounded-2xl cursor-pointer hover:bg-slate-850/50 transition-all group shadow-lg flex flex-col justify-between min-h-[140px] border relative ${classeBorda}`}
                  >
                    <div className="flex justify-start pt-2 border-t border-slate-800/50 mt-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); //  IMPORTANTE: Evita que o card abra a página do condomínio ao clicar para deletar!
                          handleInactivateCondo(condo.id, condo.nome);
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-rose-400 uppercase tracking-wider transition-colors py-1"
                      >
                        🗑️ Inativar Pasta
                      </button>
                    </div>

                    {/* GRUPO DE NOTIFICAÇÕES (CANTINHO SUPERIOR DIREITO) */}
                    <div className="absolute -top-1.5 -right-1.5 flex flex-col gap-1 items-end">
                      {temAberto && (
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          ⚠️ {condo.chamados_ativos} Aberto
                        </span>
                      )}

                      {temAgendado && (
                        <span className="bg-cyan-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          ⏳ {condo.chamados_agendados} Agendado
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">
                          {temAberto || temAgendado ? "📂" : "🏢"}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {condo.nome}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {condo.endereco || "Sem endereço"}
                          </p>
                          <p className="text-[11px] text-blue-400 mt-1.5 font-medium">
                            👨‍💼 Síndico:{" "}
                            {users.find((u) => u.id === condo.sindico_id)
                              ?.full_name || "Não atribuído"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(condo);
                        }}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors hover:underline"
                      >
                        ⚙️ Editar Dados
                      </button>
                      <span className="text-slate-500 group-hover:text-blue-400 text-xs font-bold">
                        Ver OS ➔
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================= ABA DE OPERADORES ================= */}
        {(activeTab === "tecnicos" || activeTab === "sindicos") && (
          <>
            {showUserForm && (
              <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-xl space-y-4 shadow-2xl">
                <h2 className="text-sm font-black uppercase tracking-wider text-white border-b border-slate-850 pb-2">
                  ➕ Cadastrar{" "}
                  {activeTab === "tecnicos" ? "Técnico" : "Síndico"}
                </h2>
                <form onSubmit={handleCreateOperator} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Marcos Silva"
                        value={userNome}
                        onChange={(e) => setUserNome(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        E-mail Corporativo
                      </label>
                      <input
                        type="email"
                        placeholder="email@provedor.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Senha Provisória
                      </label>
                      <input
                        type="password"
                        placeholder="Mínimo 6 dígitos"
                        value={userSenha}
                        onChange={(e) => setUserSenha(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-white outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    {activeTab === "sindicos" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">
                          Vincular Condomínio
                        </label>
                        <select
                          value={selectedCondoId}
                          onChange={(e) => setSelectedCondoId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-slate-300 outline-none focus:border-blue-500"
                          required
                        >
                          <option value="">Selecione o prédio...</option>
                          {condominiums.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    {isCreatingUser ? "Salvando..." : "Salvar Operador"}
                  </button>
                </form>
              </section>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-850">
                    <th className="p-4">Nome</th>
                    <th className="p-4">E-mail</th>
                    {activeTab === "sindicos" && (
                      <th className="p-4">Condomínio Vinculado</th>
                    )}
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-200 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTab === "sindicos" ? 4 : 3}
                        className="p-8 text-center text-slate-500"
                      >
                        Nenhum operador localizado nesta categoria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-850/20 transition-colors"
                      >
                        <td className="p-4 font-bold text-white">
                          {user.full_name}
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {user.email || "Não informado"}
                        </td>
                        {activeTab === "sindicos" && (
                          <td className="p-4 text-blue-400 font-semibold">
                            🏢{" "}
                            {condominiums.find(
                              (c) => c.id === user.condominium_id,
                            )?.nome || "Não vinculado"}
                          </td>
                        )}
                        {/* ALTERAÇÃO: Coluna de ações agora conta com o botão "Editar" funcional */}
                        <td className="p-4 text-center flex items-center justify-center gap-2">
                          TypeScript
                          <button
                            onClick={() => {
                              // Passa o id e o email do técnico/síndico da linha atual da tabela
                              setUserToReset({
                                id: user.id,
                                email: user.email,
                              });
                              setModalOpen(true);
                            }}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
                          >
                            🔑 Resetar Senha
                          </button>
                          <button
                            onClick={() => handleOpenEditUserModal(user)}
                            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all font-bold"
                          >
                            ⚙️ Editar
                          </button>
                          <button
                            onClick={() => handleSoftDeleteUser(user.id)}
                            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all font-bold"
                          >
                            🗑️ Desativar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* ================= MODAL EDITAR CONDOMÍNIO ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                Editar Condomínio
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nome do Condomínio
                </label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={editEndereco}
                  onChange={(e) => setEditEndereco(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Alterar Síndico Responsável
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="sindicos-edicao-list"
                    placeholder="Selecione ou digite um novo síndico..."
                    value={
                      listaSindicosDisponiveis.find((s) => s.id === sindicoId)
                        ?.full_name || sindicoId
                    }
                    onChange={(e) => {
                      const valor = e.target.value;
                      const selecionado = listaSindicosDisponiveis.find(
                        (s) => s.full_name === valor,
                      );
                      setSindicoId(selecionado ? selecionado.id : valor);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-600 text-[10px]">
                    ▼
                  </div>
                </div>
                <datalist id="sindicos-edicao-list">
                  {listaSindicosDisponiveis.map((s) => (
                    <option key={s.id} value={s.full_name}>
                      {s.email}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-xs font-semibold text-white rounded-xl hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ADICIONADO: EDITAR USUÁRIO ================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                Editar{" "}
                {selectedUser?.role === "tecnico" ? "Técnico" : "Síndico"}
              </h2>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveUserChanges} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editUserNome}
                  onChange={(e) => setEditUserNome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-4 py-2 bg-blue-600 text-xs font-semibold text-white rounded-xl hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSavingUser ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ResetPasswordModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userEmail={userToReset?.email || ""}
        userId={userToReset?.id || ""}
        isResetting={isResettingPassword}
        onConfirm={executeResetPassword}
      />

      {/* ================= MODAL CONFIRMAÇÃO INATIVAR CONDOMÍNIO ================= */}

      {isConfirmCondoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-500/10 mb-4 text-rose-500 text-xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Inativar Condomínio?
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Tem certeza que deseja inativar o condomínio{" "}
                <span className="text-rose-400 font-semibold uppercase">
                  "{condoToInactivate?.nome}"
                </span>
                ? Ele sumirá do painel principal.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmCondoModalOpen(false);
                  setCondoToInactivate(null);
                }}
                className="w-full px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl hover:bg-slate-750 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeInactivateCondo}
                className="w-full px-4 py-2 bg-rose-600 text-xs font-semibold text-white rounded-xl hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/20"
              >
                Sim, Inativar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
