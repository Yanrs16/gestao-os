import React, { useState } from 'react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userId: string;
  isResetting: boolean;
  onConfirm: (password: string) => Promise<boolean>;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  userEmail,
  isResetting,
  onConfirm
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ email: string; pass: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleAction = async () => {
    if (successData) {
      // Se já teve sucesso, o botão serve para fechar
      handleClose();
      return;
    }

    if (password.trim().length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setError('');
    const validationOk = await onConfirm(password.trim());
    if (validationOk) {
      setSuccessData({ email: userEmail, pass: password.trim() });
    }
  };

  const handleCopyToClipboard = () => {
    if (!successData) return;
    const textToCopy = `📋 *Dados de Acesso - Gestão OS*\n\n📧 *E-mail:* ${successData.email}\n🔑 *Nova Senha:* ${successData.pass}\n\n_Recomendamos alterar a senha após o primeiro acesso._`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reseta o texto do botão após 2s
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setSuccessData(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl transition-all">
        
        {/* Estado 1: Digitar a Senha */}
        {!successData ? (
          <>
            <h3 className="text-lg font-bold text-white mb-1">🔑 Alterar Senha</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Defina a nova senha para <span className="text-amber-500 font-medium">{userEmail}</span>.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Digite a nova senha (mín. 6 dígitos)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isResetting}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={isResetting}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAction}
                disabled={isResetting}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm px-5 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isResetting ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </>
        ) : (
          /* Estado 2: Sucesso com Opção de Copiar */
          <>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4 text-xl">
              ✓
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Senha Alterada!</h3>
            <p className="text-zinc-400 text-sm mb-4">
              A senha foi atualizada com sucesso no banco de dados.
            </p>

            {/* Bloco de visualização limpa */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 mb-4 font-mono text-xs select-all">
              <div className="flex justify-between"><span className="text-zinc-500">USER:</span> <span className="text-zinc-300">{successData.email}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">PASS:</span> <span className="text-amber-500 font-bold">{successData.pass}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6">
              <button
                onClick={handleCopyToClipboard}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                  copied 
                    ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' 
                    : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
                }`}
              >
                {copied ? '📋 Copiado com Sucesso!' : '📄 Copiar Dados'}
              </button>
              <button
                onClick={handleClose}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all text-center"
              >
                Concluído
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}