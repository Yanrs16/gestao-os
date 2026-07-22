"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // 1. Login no Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      console.error("Erro no Auth:", authError);
      setErrorMsg("Credenciais incorretas ou usuário não encontrado.");
      setLoading(false);
      return;
    }

    console.log("Usuário autenticado no Auth com ID:", authData.user.id);

    // 2. Busca na tabela profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    console.log("Resultado da busca na tabela profiles:", {
      profile,
      profileError,
    });

    // 3. Validação da Role
    if (profileError || !profile || profile.role !== "adm") {
      console.warn("Validação falhou. Role recebida do banco:", profile?.role);
      await supabase.auth.signOut();
      setErrorMsg(
        "Acesso negado. Esta conta não possui privilégios de Administrador.",
      );
      setLoading(false);
      return;
    }

    console.log("Acesso permitido! Redirecionando...");
    window.location.href = "/admin";
  };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-red-900/20 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-blue-400 font-bold uppercase tracking-wider transition-colors"
          >
            ← Voltar para a Home
          </Link>
          <h2 className="text-2xl font-black text-white uppercase tracking-wide mt-2">
            🛡️ Painel Restrito Admin
          </h2>
          <p className="text-xs text-slate-400">
            Identifique-se para acessar o controle macro
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-semibold text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              E-mail do Administrador
            </label>
            <input
              type="email"
              required
              placeholder="email@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 p-3 rounded-xl text-sm text-white outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sua Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 p-3 pr-12 rounded-xl text-sm text-white outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white transition-colors p-1"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {loading ? "Autenticando Master..." : "Desbloquear Painel"}
          </button>
        </form>
      </div>
    </div>
  );
}
