"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  const [searchCode, setSearchCode] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleSearchOS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    let termoFormatado = searchCode.trim().toUpperCase();
    if (!termoFormatado.startsWith("OS-")) {
      termoFormatado = `OS-${termoFormatado.replace("OS", "").trim()}`;
    }

    router.push(`/publico/consultar-os?code=${termoFormatado}`);
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert(
        "Para instalar no iPhone (iOS): toque no botão 'Compartilhar' e escolha 'Adicionar à Tela de Início'.\n\nNo Android: caso o pop-up automático não apareça, utilize o menu de 3 pontos do navegador.",
      );
      return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("Instalação aceita pelo usuário.");
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      {/* BARRA DE NAVEGAÇÃO */}
      <header className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <Image
                src="/icon-192.png"
                alt="Logo Central.OS"
                width={192}
                height={192}
                className="w-12 h-12 object-contain rounded-lg shadow-inner"
                priority
              />
              <span className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase">
                CENTRAL<span className="text-blue-500">.OS</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="text-xs font-bold uppercase tracking-wider bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl transition-all shadow-md block whitespace-nowrap"
            >
              🛡️ Admin
            </Link>
            <Link
              href="/login"
              className="text-xs font-bold uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-all shadow-md block whitespace-nowrap"
            >
              👤 Login
            </Link>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl text-center space-y-6">
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-70 transition duration-500"></div>
              <Image
                src="/icon-192.png"
                alt="Logo Central.OS Grande"
                width={192}
                height={192}
                className="relative w-36 h-36 sm:w-48 sm:h-48 object-contain rounded-2xl p-2 bg-slate-900 border border-slate-800 shadow-2xl"
                priority
              />
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none uppercase">
            Sua Gestão de Suporte <br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Descomplicada
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
            Abra chamados para portões automáticos, câmeras, interfonia e cercas
            elétricas. Acompanhe tudo em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto pt-2">
            <Link
              href="/publico/abrir-chamado"
              className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 text-center uppercase tracking-wide"
            >
              Abrir um Chamado
            </Link>
          </div>

          <div className="max-w-md mx-auto bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xl mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 text-left mb-2.5 flex items-center gap-1.5">
              <span>🔍</span> Já abriu um chamado? Consulte aqui:
            </h3>
            <form onSubmit={handleSearchOS} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: OS-9874"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-blue-500 p-3 rounded-xl text-sm text-white font-mono uppercase outline-none tracking-widest transition-all"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 rounded-xl uppercase tracking-wider transition-all min-w-[120px]"
              >
                Consultar OS
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* SEÇÃO SOBRE NÓS */}
      <section className="border-t border-slate-900 bg-slate-900/10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-500">
              Diferenciais do Sistema
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
              Por que utilizar a Central-OS?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            <div className="space-y-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-900/60">
              <div className="text-2xl">📋</div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Fim do Papel
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Esqueça blocos de papel ou mensagens perdidas no WhatsApp. Todas
                as solicitações ficam salvas em um único banco de dados seguro.
              </p>
            </div>
            <div className="space-y-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-900/60">
              <div className="text-2xl">🛡️</div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Transparência Total
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Moradores consultam o andamento do defeito apenas digitando o
                código do protocolo, reduzindo cobranças desnecessárias ao
                síndico.
              </p>
            </div>
            <div className="space-y-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-900/60">
              <div className="text-2xl">⚡</div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Foco Técnico
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Os técnicos recebem a categoria exata do equipamento com defeito
                e a foto do problema antes mesmo de saírem da empresa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="border-t border-slate-900 bg-slate-950 pt-10 pb-6 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left mb-8">
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Central-OS
            </h4>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
              Tecnologia voltada para automação, manutenção preventiva e
              segurança eletrônica condominial de alto desempenho.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Links Rápidos
            </h4>
            <div className="flex flex-col gap-1.5 text-slate-500">
              <Link
                href="publico/abrir-chamado"
                className="hover:text-blue-400 transition-colors"
              >
                Abertura de Chamados
              </Link>
              <Link
                href="/admin"
                className="hover:text-blue-400 transition-colors"
              >
                Acesso Administrativo
              </Link>
            </div>
          </div>
          <div className="space-y-3 flex flex-col items-center sm:items-start">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Aplicativo Móvel
            </h4>
            <button
              onClick={handleInstallApp}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              <span>📲</span> Instalar no Celular
            </button>
          </div>
        </div>
        <div className="text-center text-slate-600 border-t border-slate-900/60 pt-6">
          &copy; {new Date().getFullYear()} Central-OS - Sistema de Gestão
          Técnica. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
