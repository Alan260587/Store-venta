import React, { useState } from 'react';
import { Shield, Lock, KeyRound, X, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { verifyAdminKeyInput } from '../services/dbStorage';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminKeyInput(password)) {
      setError('');
      setPassword('');
      onSuccess();
    } else {
      setError('Clave de administrador incorrecta. Usa la misma clave Admin (****) en tu laptop, celular o iOS.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-emerald-100 z-10 animate-scale-up">
        
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          title="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-amber-200">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="font-serif font-bold text-xl text-slate-900">
            Conexión Exclusiva con Clave Admin
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ingresa la <strong>misma Clave de Administrador (****)</strong> desde cualquier aparato (Laptop, Celular Android o iOS). Verás exactamente los mismos productos y PDFs sincronizados.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Clave Única de Administrador (Laptop, Celular e iOS)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="****"
                maxLength={10}
                autoFocus
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg font-mono tracking-widest text-slate-900 text-center"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-1.5">
              Clave requerida en cualquier dispositivo: <span className="font-mono font-bold text-amber-600 tracking-widest">****</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-98"
            >
              <KeyRound className="w-4 h-4" />
              <span>Conectarme como Administrador</span>
            </button>
          </div>
        </form>

        <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Misma Página y Misma Clave en Todos tus Aparatos:</span>
          </div>
          <p className="leading-relaxed">
            • Los PDFs y productos que guardes en tu <strong>Laptop, Celular Android o iPhone/iPad (iOS)</strong> se sincronizan automáticamente para que todos vean la misma página.
          </p>
          <p className="leading-relaxed">
            • Tu sesión de Administrador usa la <strong>misma clave (****)</strong> en cualquier aparato y se cierra automáticamente al cerrar la página.
          </p>
        </div>

        <div className="mt-4 text-center text-[11px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sincronización multiplataforma Sheló NABEL</span>
        </div>

      </div>
    </div>
  );
};
