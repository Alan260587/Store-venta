import React from 'react';
import { Sparkles, ShoppingBag, ShieldCheck, HeartPulse } from 'lucide-react';

interface HeroProps {
  onExploreCatalog: () => void;
  onExplorePdfs: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreCatalog, onExplorePdfs }) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl my-4 mx-4 sm:mx-6 lg:mx-8 shadow-xl border border-emerald-700/50">
      {/* Decorative ambient blurred circles */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 py-12 sm:py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold mb-6 shadow-inner backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Productos Naturales de Salud, Belleza &amp; Artículos Escolares</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-white mb-4 leading-tight">
          La Belleza a tu Alcance… <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            ¡En Armonía con la Naturaleza!
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-emerald-100 font-light mb-8 leading-relaxed">
          Descubre nuestra línea extracto natural Sheló NABEL: cremas faciales de baba de caracol, suplementos alimenticios, cuidado capilar y artículos de oficina/escolares. Haz tu pedido fácil y directo vía WhatsApp.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onExploreCatalog}
            className="px-6 py-3.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm shadow-lg hover:shadow-amber-400/20 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <ShoppingBag className="w-4 h-4 text-slate-900" />
            <span>Ver Catálogo de Productos</span>
          </button>

          <button
            onClick={onExplorePdfs}
            className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Catálogos en PDF ($20 MXN)</span>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 pt-8 border-t border-emerald-700/50 text-emerald-100 text-xs sm:text-sm font-medium">
          <div className="flex items-center justify-center gap-2.5 bg-emerald-950/30 py-2.5 px-4 rounded-xl border border-emerald-700/30">
            <HeartPulse className="w-5 h-5 text-emerald-300" />
            <span>Extractos Naturales puros</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 bg-emerald-950/30 py-2.5 px-4 rounded-xl border border-emerald-700/30">
            <ShoppingBag className="w-5 h-5 text-amber-300" />
            <span>Pedidos inmediatos por WhatsApp</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 bg-emerald-950/30 py-2.5 px-4 rounded-xl border border-emerald-700/30">
            <ShieldCheck className="w-5 h-5 text-cyan-300" />
            <span>Atención personal +52 662 139 5110</span>
          </div>
        </div>
      </div>
    </div>
  );
};
