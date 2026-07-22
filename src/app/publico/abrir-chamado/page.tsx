"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation"; // Adicionado para fazer a navegação de saída
import { orderRepository } from "@/core/orders/services/orderRepository";
import { supabase } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

export default function PublicOrderPage() {
  const router = useRouter(); // Inicializando o roteador do Next.js
  const [condominiums, setCondominiums] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, trigger, setValue } = useForm();
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const retorno = searchParams.get("retorno");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
      setValue("image", e.target.files); // Sincroniza com o react-hook-form
    }
  };

  // Limpa a foto da memória e limpa o formulário
  const handleRemoveFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview); // Evita vazamento de memória
    setFotoFile(null);
    setFotoPreview(null);
    setValue("image", null);
  };

  // Estado para controlar em qual etapa o usuário está (1, 2 ou 3)
  const [step, setStep] = useState(1);

  // Monitora os campos para validação visual dos botões
  const watchAllFields = watch();

  useEffect(() => {
    const fetchCondos = async () => {
      const { data, error } = await supabase
        .from("condominiums")
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true }); //

      if (error) {
        console.error("Erro na busca:", error);
        return;
      }

      if (data) setCondominiums(data);
    };

    fetchCondos();
  }, []);

  // Função para avançar de etapa validando apenas os campos da etapa atual
  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["name", "type"];
    if (step === 2) fieldsToValidate = ["condominium", "unit_block"];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      let image_before_url = "";

      // 1. Tratamento, Limite de Tamanho e Upload da Imagem
      if (data.image?.[0]) {
        const file = data.image[0];

        // CORREÇÃO/MELHORIA: Limita o tamanho em 5MB (5 * 1024 * 1024 bytes)
        const maxFileSize = 5 * 1024 * 1024;
        if (file.size > maxFileSize) {
          throw new Error(
            "A foto é muito pesada! Escolha uma imagem de até 5MB.",
          );
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("os-attachments")
          .upload(`before/${fileName}`, file);

        if (uploadError) {
          throw new Error(
            `Falha no Upload. Verifique o bucket do Supabase. Erro: ${uploadError.message}`,
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from("os-attachments")
          .getPublicUrl(`before/${fileName}`);

        image_before_url = publicUrlData.publicUrl;
      }

      // 2. Busca o ID do condomínio baseado no nome selecionado no formulário
      const condominioSelecionado = condominiums.find(
        (c) => c.nome === data.condominium,
      );
      if (!condominioSelecionado) {
        throw new Error("Condomínio selecionado não foi encontrado no banco.");
      }

      // 3. Cria um código de protocolo aleatório para o morador (Ex: OS-1234)
      const randomCode = `OS-${Math.floor(1000 + Math.random() * 9000)}`;

      // 4. Salva direto na tabela 'orders' do Supabase sincronizada com o nosso SQL
      const { error: insertError } = await supabase.from("orders").insert([
        {
          condominium_id: condominioSelecionado.id,
          os_number: randomCode, // 🔥 AGORA SALVA O PROTOCOLO DE VERDADE (Ex: OS-1445)
          title: `${data.category.toUpperCase()} - Solicitado por ${data.name}`,
          description: `Vínculo: ${data.type} | Local: ${data.unit_block} | Tel: ${data.phone || "Não informado"} \n\nDescrição do Defeito: ${data.description}`,
          status: "aberto",
          updated_by: image_before_url,
        },
      ]);

      if (insertError) throw insertError;

      // Se deu tudo certo, exibe o código gerado na tela de sucesso
      setGeneratedCode(randomCode);
      reset();
      handleRemoveFoto();
      setStep(1);
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      alert(
        `Erro ao registrar ordem de serviço: ${err.message || "Verifique os dados."}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Tela de Sucesso Ajustada com as duas opções
  if (generatedCode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-slate-900 rounded-2xl shadow-2xl text-center border border-slate-800 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide mb-2">
            Chamado Aberto!
          </h2>
          <p className="text-slate-400 mb-6 text-xs">
            Anote o código de protocolo para acompanhar o andamento técnico:
          </p>
          <div className="text-2xl font-mono bg-slate-950 text-emerald-400 p-4 rounded-xl font-bold tracking-widest shadow-inner border border-slate-850 mb-6">
            {generatedCode}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setGeneratedCode(null)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              🔄 Abrir Novo Chamado
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              🏠 Voltar à Página Inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center transition-all duration-300">
      <div className="max-w-md w-full mx-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* BOTÃO VOLTAR FIXO NO TOPO DO CARD */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-850 flex justify-between items-center bg-slate-900/40">
          <button
            type="button"
            onClick={() =>
              router.push(retorno === "sindico" ? "/sindico" : "/")
            }
            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-all"
          >
            🏠 Voltar ao Início
          </button>

          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">
            Passo {step} de 3
          </span>
        </div>

        {/* Cabeçalho */}
        <div className="px-6 py-6 border-b border-slate-800 bg-slate-900/50 text-center">
          <h1 className="text-lg font-bold text-white tracking-wider uppercase">
            Suporte Técnico
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Segurança Eletrônica & Automação
          </p>

          {/* Barra de Progresso Interativa */}
          <div className="mt-6 flex items-center justify-between relative max-w-xs mx-auto">
            <div className="absolute left-0 right-0 h-0.5 bg-slate-800 top-1/2 -translate-y-1/2 z-0"></div>
            <div
              className="absolute left-0 h-0.5 bg-blue-500 top-1/2 -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>

            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs z-10 transition-all duration-300 border ${
                  step >= num
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* ETAPA 1: DADOS PESSOAIS */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                Passo 1: Suas Informações
              </h2>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Nome Completo
                </label>
                <input
                  {...register("name", { required: true })}
                  className="w-full border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-900/30 p-3 rounded-xl mt-1 text-white bg-slate-950 outline-none transition-all text-sm"
                  placeholder="Digite seu nome"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Seu Vínculo
                </label>
                <select
                  {...register("type", { required: true })}
                  className="w-full border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-900/30 p-3 rounded-xl mt-1 text-white bg-slate-950 outline-none transition-all text-sm"
                >
                  <option value="">Selecione seu vínculo...</option>
                  <option value="morador">Morador / Proprietário</option>
                  <option value="zelador">Zelador / Funcionário</option>
                  <option value="sindico">Síndico(a)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Telefone Celular (Opcional)
                </label>
                <input
                  {...register("phone")}
                  className="w-full border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-900/30 p-3 rounded-xl mt-1 text-white bg-slate-950 outline-none transition-all text-sm"
                  placeholder="(61) 99999-0000"
                />
              </div>
            </div>
          )}
          {/* ETAPA 2: LOCALIZAÇÃO */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                Passo 2: Onde é o problema?
              </h2>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Selecione o Condomínio
                </label>
                <select
                  {...register("condominium", { required: true })}
                  className="w-full border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-900/30 p-3 rounded-xl mt-1 text-white bg-slate-950 outline-none transition-all text-sm"
                >
                  <option value="">Escolha um condomínio...</option>
                  {condominiums.map((condo) => (
                    // Mudamos condo.name para condo.nome nas duas linhas abaixo:
                    <option key={condo.id} value={condo.nome}>
                      🏢 {condo.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Bloco / Apartamento / Lote
                </label>
                <input
                  {...register("unit_block", { required: true })}
                  className="w-full border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-900/30 p-3 rounded-xl mt-1 text-white bg-slate-950 outline-none transition-all text-sm"
                  placeholder="Ex: Bloco C Apto 104"
                />
              </div>
            </div>
          )}
          {/* ETAPA 3: DETALHES DO DEFEITO */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                Passo 3: Detalhes Técnicos
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  O que precisa de reparo?
                </label>
                <select
                  {...register("category", { required: true })}
                  className="w-full border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-900/30 p-3 rounded-xl mt-1 text-white bg-slate-950 outline-none transition-all text-sm"
                >
                  <option value="">Selecione o equipamento...</option>
                  <option value="cameras_cftv">Câmeras / CFTV</option>
                  <option value="motores_portoes">
                    Motores e Portões Automáticos
                  </option>
                  <option value="interfonia">Interfonia e Comunicação</option>
                  <option value="cercas_seguranca">
                    Cercas Elétricas / Concertinas
                  </option>
                  <option value="alarmes_sensores">
                    Alarmes e Sensores de Presença
                  </option>
                  <option value="controle_acesso">
                    Controle de Acesso (Tags / Biometria)
                  </option>
                  <option value="preventiva">
                    Manutenção Preventiva de Rotina
                  </option>
                  <option value="outros">Outros / Não sei identificar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Descrição do Defeito
                </label>
                <textarea
                  {...register("description", { required: true })}
                  className="w-full border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-900/30 p-3 rounded-xl mt-1 text-white bg-slate-950 outline-none transition-all text-sm resize-none"
                  rows={4}
                  placeholder="Ex: O portão principal não está travando no imã ao fechar..."
                />
              </div>

              {/* CAMPO DE FOTO COM BOTÃO REMOVER DINÂMICO */}
              {/* CAMPO DE FOTO COM PRÉVIA VISUAL E REMOÇÃO */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  Anexar Foto (Opcional)
                </label>

                {!fotoPreview ? (
                  /* CAIXA DE UPLOAD QUANDO NÃO HÁ FOTO */
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 hover:bg-slate-900/50 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                        📷
                      </span>
                      <p className="text-xs text-slate-400 font-medium">
                        Clique para tirar foto ou anexar
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        PNG, JPG ou WEBP (Máx. 5MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  /* CARD DE PRÉVIA DA FOTO */
                  <div className="relative w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <img
                      src={fotoPreview}
                      alt="Prévia da foto"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFoto}
                      className="absolute top-3 right-3 bg-rose-600/90 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg backdrop-blur-sm flex items-center gap-1"
                    >
                      <span>🗑️</span>
                      <span>Remover</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          ;{/* BOTÕES DE NAVEGAÇÃO INTERATIVOS */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all"
              >
                Voltar
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/10 transition-all ml-auto"
              >
                Avançar
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/10 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all ml-auto"
              >
                {loading ? "Enviando..." : "Finalizar e Abrir OS"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
