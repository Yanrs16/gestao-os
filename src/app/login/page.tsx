"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tecnico"); // Seleção do formulário ('tecnico' ou 'sindico')
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Autentica o usuário no Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setErrorMsg(
          "E-mail ou senha incorretos. Verifique os dados digitados.",
        );
        setLoading(false);
        return;
      }

      // 2. Busca a role real gravada no banco de dados
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setErrorMsg("Erro ao identificar o perfil cadastrado para esta conta.");
        await supabase.auth.signOut(); // Desconecta por segurança
        setLoading(false);
        return;
      }

      const userRole = profile.role;

      // 3. REGRA 1: Se for Administrador tentando entrar pelo portal público
      if (userRole === "admin") {
        setErrorMsg(
          "Esta é uma conta de Administrador. Por favor, acesse pelo Portal Administrativo.",
        );
        await supabase.auth.signOut(); // Desconecta
        setLoading(false);
        return;
      }

      // 4. REGRA 2: Verifica se o tipo selecionado no <select> é compatível com o perfil real
      if (role === "tecnico" && userRole !== "tecnico") {
        setErrorMsg(
          "Esta conta não está cadastrada como Técnico. Altere a opção acima ou verifique seu e-mail.",
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (role === "sindico" && userRole !== "sindico") {
        setErrorMsg(
          "Esta conta não está cadastrada como Síndico/Gestor. Altere a opção acima ou verifique seu e-mail.",
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 5. Redirecionamento correto se tudo bater
      if (userRole === "tecnico") {
        router.push("/tecnico");
      } else if (userRole === "sindico") {
        router.push("/sindico");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocorreu um erro inesperado ao tentar fazer login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-blue-400 font-bold uppercase tracking-wider transition-colors"
          >
            ← Voltar para a Home
          </Link>
          <h2 className="text-2xl font-black text-white uppercase tracking-wide mt-2">
            Acesso ao Sistema
          </h2>
          <p className="text-xs text-slate-400">
            Entre com suas credenciais de operador
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs font-semibold text-center leading-relaxed animate-fadeIn">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tipo de Acesso
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 font-medium outline-none transition-colors"
            >
              <option value="tecnico">👨‍💻 Sou Técnico Parceiro</option>
              <option value="sindico">🏢 Sou Síndico / Gestor</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              E-mail Corporativo
            </label>
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 p-3 rounded-xl text-sm text-white outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sua Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 p-3 pr-12 rounded-xl text-sm text-white outline-none transition-colors"
              />
              <button
                type="button" /* IMPORTANTE: type="button" para não disparar o login! */
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white transition-colors p-1"
              >
                {showPassword ? " Ocultar" : " Mostrar"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm uppercase tracking-wider transition-all"
          >
            {loading ? "Verificando..." : "Entrar no Painel"}
          </button>
        </form>
      </div>
    </div>
  );
}
