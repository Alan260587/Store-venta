import React from 'react';
import { Heart, MessageCircle, MapPin, Phone, Shield, Sparkles } from 'lucide-react';
import { ProductCategory } from '../types';
import { SHELO_LOGO_URL } from './Navbar';

interface FooterProps {
  onNavigate: (tab: 'catalog' | 'pdfs' | 'admin') => void;
  onSelectCategory?: (category: ProductCategory) => void;
}

const FOOTER_CATEGORIES: ProductCategory[] = [
  'Todos',
  'Salud y Bienestar',
  'Cuidado Facial',
  'Cuidado Capilar',
  'Cuidado Corporal',
  'Cosméticos y Aromas',
  'Línea Infantil',
  'Escolar y Accesorios'
];

export const Footer: React.FC<FooterProps> = ({ onNavigate, onSelectCategory }) => {
  const handleCategoryClick = (cat: ProductCategory) => {
    onNavigate('catalog');
    if (onSelectCategory) onSelectCategory(cat);
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  return (
    <footer className="bg-blue-950 text-slate-200 pt-12 pb-8 border-t-4 border-amber-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-blue-900">
          {/* Brand Info with Large Official Sheló NABEL Logo */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={SHELO_LOGO_URL}
                alt="Sheló NABEL Jhosie Girón"
                className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-lg bg-white shrink-0"
              />
              <div>
                <span className="font-serif text-2xl font-extrabold text-white tracking-wide block">
                  Sheló <span className="text-sky-400 font-sans text-xs tracking-widest uppercase">NABEL</span>
                </span>
                <span className="text-xs font-bold text-amber-300 block">
                  Jhosie Girón • 6621395110
                </span>
                <span className="text-[11px] text-emerald-300 font-semibold block">
                  &ldquo;Salud al alcance de todos&rdquo;
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Nutrición, Belleza, Salud, Bienestar y Calidad de Vida. Encuentra tu bienestar total con nosotros y descubre la mejor línea de productos Sheló NABEL.
            </p>

            <div className="pt-1">
              <a
                href="https://wa.me/526621395110"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors border border-emerald-400 shadow-md"
              >
                <MessageCircle className="w-4 h-4 text-amber-300" />
                <span>WhatsApp Directo: 6621395110</span>
              </a>
            </div>
          </div>

          {/* Quick Navigation (Menu 2) */}
          <div>
            <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-4 border-b border-blue-900 pb-2">
              Menú Principal
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Inicio y Bienvenida
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleCategoryClick('Todos')}
                  className="hover:text-amber-300 transition-colors"
                >
                  Línea Shelo (Catálogo Completo)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('pdfs')}
                  className="hover:text-amber-300 transition-colors"
                >
                  Descargas y Catálogos PDF ($0 y $20 MXN)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>Área de Administrador (Clave ****)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Interactive Catalog Categories Menu */}
          <div>
            <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-4 border-b border-blue-900 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Categorías del Catálogo</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {FOOTER_CATEGORIES.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className="hover:text-amber-300 transition-colors text-left"
                  >
                    • {cat === 'Todos' ? 'Todos los Productos Sheló NABEL' : cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Corporate Info */}
          <div>
            <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-4 border-b border-blue-900 pb-2">
              Contacto Jhosie Girón &amp; Corporativo
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2 font-bold text-white">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Contacto Jhosie: 6621395110</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Torre Cube 2 Piso No. 19-A, Av. Paseo Royal Country #4596, Puerta de Hierro, Zapopan, Jalisco, México. C.P. 45116
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <img
              src={SHELO_LOGO_URL}
              alt="Sheló NABEL"
              className="w-6 h-6 rounded-full object-cover border border-amber-400"
            />
            <p>© 2026 Sheló NABEL® • Jhosie Girón (6621395110). Todos los precios incluyen IVA en MXN.</p>
          </div>
          <p className="flex items-center gap-1">
            <span>Salud al alcance de todos</span>
            <Heart className="w-3 h-3 text-amber-400 fill-amber-400" />
          </p>
        </div>
      </div>
    </footer>
  );
};
