import React, { useState } from 'react';
import { Shield, Lock, KeyRound, X, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    if (password.trim() === '1987') {
      setError('');
      setPassword('');
      onSuccess();
    } else {
      setError('Clave incorrecta. Por favor verifica e intenta nuevamente.');
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

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-amber-200">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="font-serif font-bold text-xl text-slate-900">
            Acceso Total de Administrador
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ingresa la clave de seguridad para habilitar la subida y edición de PDFs, ver claves de descarga y administrar artículos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Clave de Seguridad (4 dígitos)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
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
              Clave requerida: <span className="font-mono font-bold text-amber-600 tracking-widest">****</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-98"
            >
              <KeyRound className="w-4 h-4" />
              <span>Desbloquear Acceso Total</span>
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-400 border-t border-slate-100 pt-4 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Acceso seguro protegido Sheló NABEL</span>
        </div>

      </div>
    </div>
  );
};
