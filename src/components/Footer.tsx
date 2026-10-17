import React from 'react';
import { Heart, MessageCircle, MapPin, Phone, Shield } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: 'catalog' | 'pdfs' | 'admin') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-serif font-bold text-base">
                S
              </div>
              <span className="font-serif text-2xl font-bold text-white tracking-wide">
                Sheló <span className="text-cyan-400 font-sans text-xs tracking-widest uppercase">NABEL</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-light">
              La belleza a tu alcance… ¡En Armonía con la Naturaleza! Productos de belleza, salud, suplementos y papelería escolar.
            </p>

            <div className="pt-2">
              <a
                href="https://wa.me/526621395110"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-amber-300" />
                <span>Atención WhatsApp: +52 662 139 5110</span>
              </a>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              Navegación
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Catálogo de Productos
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('pdfs')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Descargas y Documentos PDF ($20 MXN)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('admin')}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>Área de Administrador (Clave ****)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Catalog Categories */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              Líneas Destacadas
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Baba de Caracol Crema y Jabón</li>
              <li>Línea Escolar (Folders de Colores, Tijeras, Crayola)</li>
              <li>Suplementos y Adaptógenos (Melena de León, NAD)</li>
              <li>Cuidado Capilar (Cola de Caballo, Bergamota)</li>
              <li>Cuidado Corporal (Hielo Mineral, Therapygel)</li>
            </ul>
          </div>

          {/* Official Corporate Info */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              Sheló NABEL® Corporativo
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Torre Cube 2 Piso No. 19-A, Av. Paseo Royal Country #4596, Puerta de Hierro, Zapopan, Jalisco, México. C.P. 45116</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Teléfono: (33) 3628-0445</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>© 2026 Sheló NABEL®. Todos los precios incluyen IVA en MXN.</p>
          <p className="flex items-center gap-1">
            <span>Creado con armonía y belleza natural</span>
            <Heart className="w-3 h-3 text-emerald-500 fill-emerald-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
