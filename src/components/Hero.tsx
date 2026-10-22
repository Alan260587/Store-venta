import React from 'react';
import {
  ShoppingBag,
  FileText,
  MessageCircle,
  HeartPulse,
  Sparkles,
  Home,
  Info,
  Phone,
  Smile,
  Scissors,
  Droplets,
  Baby,
  BookOpen,
  Star,
  Handshake,
  ChevronRight
} from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { SHELO_LOGO_URL } from './Navbar';

interface HeroProps {
  onExploreCatalog: () => void;
  onExplorePdfs: () => void;
  products?: Product[];
  pdfsCount?: number;
  selectedCategory?: ProductCategory;
  onSelectCategory?: (category: ProductCategory) => void;
  onToggleStarProducts?: (onlyStar: boolean) => void;
}

const CATALOG_CATEGORIES_MENU: Array<{
  category: ProductCategory;
  title: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    category: 'Todos',
    title: 'Línea Shelo Completa',
    desc: 'Todo el catálogo de nutrición, belleza y bienestar',
    icon: <Sparkles className="w-4 h-4 text-amber-500" />
  },
  {
    category: 'Salud y Bienestar',
    title: 'Salud y Bienestar',
    desc: 'Nutrición, Melena de León, NAD Colágeno, Adaptógenos',
    icon: <HeartPulse className="w-4 h-4 text-emerald-600" />
  },
  {
    category: 'Cuidado Facial',
    title: 'Cuidado Facial',
    desc: 'Baba de Caracol, Agua Termal, Sueros Hialurónico y Vitamina C',
    icon: <Smile className="w-4 h-4 text-teal-600" />
  },
  {
    category: 'Cuidado Capilar',
    title: 'Cuidado Capilar',
    desc: 'Shampoo Cola de Caballo, Bergamota con Minoxidil, Cebolla',
    icon: <Scissors className="w-4 h-4 text-cyan-600" />
  },
  {
    category: 'Cuidado Corporal',
    title: 'Cuidado Corporal',
    desc: 'Hielo Mineral, Therapygel, Crema Corporal, Leche de Burra',
    icon: <Droplets className="w-4 h-4 text-blue-600" />
  },
  {
    category: 'Cosméticos y Aromas',
    title: 'Cosméticos y Aromas',
    desc: 'Barras Multiusos Labios y Mejillas Cereza y Durazno',
    icon: <Sparkles className="w-4 h-4 text-rose-500" />
  },
  {
    category: 'Línea Infantil',
    title: 'Línea Infantil',
    desc: 'Vita Niños Suplemento con vitaminas y minerales',
    icon: <Baby className="w-4 h-4 text-amber-600" />
  },
  {
    category: 'Escolar y Accesorios',
    title: 'Escolar y Accesorios',
    desc: 'Folders Escolares, Tijeras Westcott y Crayones Crayola 24',
    icon: <BookOpen className="w-4 h-4 text-indigo-600" />
  }
];

export const Hero: React.FC<HeroProps> = ({
  onExploreCatalog,
  onExplorePdfs,
  products = [],
  pdfsCount = 17,
  selectedCategory = 'Todos',
  onSelectCategory,
  onToggleStarProducts
}) => {
  const handleJumpToCategory = (cat: ProductCategory) => {
    if (onToggleStarProducts) onToggleStarProducts(false);
    if (onSelectCategory) onSelectCategory(cat);
    onExploreCatalog();
  };

  const getCategoryCount = (cat: ProductCategory) => {
    if (cat === 'Todos') return products.length;
    return products.filter((p) => p.category === cat).length;
  };

  return (
    <div className="my-4 mx-4 sm:mx-6 lg:mx-8 space-y-6">
      {/* Main Hero Banner: Phrase removed and replaced by LARGE Sheló NABEL Logo + Menu 2 Design */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-amber-100/70 to-amber-50 rounded-3xl shadow-xl border-2 border-amber-300/90">
        {/* Subtle decorative gold & blue ambient glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-300/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-sky-300/25 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          {/* LARGE SHELÓ NABEL LOGO (Replaces the removed phrase) */}
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="relative p-2 sm:p-3 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 shadow-2xl ring-4 ring-amber-400/70">
              <img
                src={SHELO_LOGO_URL}
                alt="Sheló NABEL - Jhosie Girón - Salud al alcance de todos"
                className="w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full object-cover bg-white shadow-inner"
              />
            </div>

            {/* Welcome Block from Menu 2 */}
            <div className="mt-6 max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-blue-950 tracking-tight mb-2">
                Bienvenidos a nuestro sitio web
              </h1>
              <p className="text-sm sm:text-lg text-slate-800 font-medium leading-relaxed">
                Conoce nuestros productos y servicios de nutrición, belleza y bienestar.{' '}
                <strong className="text-blue-900 font-extrabold">
                  &ldquo;Salud al alcance de todos&rdquo;.
                </strong>
              </p>
            </div>
          </div>

          {/* Menu 2 Layout: Left Navigation Menu + Right Highlight & Offerings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Menu 2 Buttons */}
            <div className="lg:col-span-5 bg-gradient-to-b from-amber-100/90 via-amber-50 to-amber-100/80 p-5 rounded-2xl border-2 border-amber-300 shadow-md space-y-2.5">
              <div className="flex items-center gap-2 pb-2 mb-1 border-b border-amber-300/80">
                <img
                  src={SHELO_LOGO_URL}
                  alt="Sheló NABEL"
                  className="w-8 h-8 rounded-full object-cover border border-amber-400"
                />
                <span className="font-serif font-extrabold text-sm sm:text-base text-blue-950 uppercase tracking-wide">
                  Menú Principal Sheló NABEL
                </span>
              </div>

              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full py-3 px-4 rounded-xl bg-white/95 hover:bg-amber-200/70 text-blue-950 font-extrabold text-sm border border-amber-300 shadow-xs flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <Home className="w-4 h-4 text-blue-900" />
                  <span>Inicio</span>
                </span>
                <ChevronRight className="w-4 h-4 text-amber-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('sobre-nosotros-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-3 px-4 rounded-xl bg-white/95 hover:bg-amber-200/70 text-blue-950 font-extrabold text-sm border border-amber-300 shadow-xs flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-blue-900" />
                  <span>Sobre Nosotros</span>
                </span>
                <ChevronRight className="w-4 h-4 text-amber-700" />
              </button>

              <button
                type="button"
                onClick={() => handleJumpToCategory('Todos')}
                className="w-full py-3 px-4 rounded-xl bg-white/95 hover:bg-amber-200/70 text-blue-950 font-extrabold text-sm border border-amber-300 shadow-xs flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-blue-900" />
                  <span>Línea Shelo ({products.length} Productos)</span>
                </span>
                <ChevronRight className="w-4 h-4 text-amber-700" />
              </button>

              <button
                type="button"
                onClick={onExplorePdfs}
                className="w-full py-3 px-4 rounded-xl bg-white/95 hover:bg-emerald-100/80 text-emerald-950 font-extrabold text-sm border border-emerald-300 shadow-xs flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Catálogos y Libros PDF ({pdfsCount})</span>
                </span>
                <ChevronRight className="w-4 h-4 text-emerald-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('contacto-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-3 px-4 rounded-xl bg-white/95 hover:bg-amber-200/70 text-blue-950 font-extrabold text-sm border border-amber-300 shadow-xs flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-blue-900" />
                  <span>Contacto</span>
                </span>
                <ChevronRight className="w-4 h-4 text-amber-700" />
              </button>

              <a
                href="https://wa.me/526621395110?text=Hola%20Jhosie%20Gir%C3%B3n%2C%20quiero%20informaci%C3%B3n%20sobre%20los%20productos%20Shel%C3%B3%20NABEL."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-extrabold text-sm border border-emerald-400 shadow-md flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-5 h-5 text-white fill-white/20 shrink-0" />
                  <div className="text-left leading-tight">
                    <span className="block text-xs uppercase tracking-wider text-emerald-100">
                      WhatsApp Directo
                    </span>
                    <span className="font-mono text-base font-black text-white">6621395110</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white" />
              </a>
            </div>

            {/* Right Column: Gold Callout + "Descubre lo que ofrecemos" from Menu 2 */}
            <div id="sobre-nosotros-section" className="lg:col-span-7 space-y-4">
              {/* Gold Callout Box from Menu 2 */}
              <div className="bg-gradient-to-r from-amber-200/90 via-yellow-100 to-amber-200/90 p-5 sm:p-6 rounded-2xl border-2 border-amber-400 shadow-md flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/40 border-2 border-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                  <Handshake className="w-9 h-9 text-amber-900" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="font-serif font-extrabold text-lg sm:text-xl text-blue-950 mb-1">
                    Encuentra tu bienestar total con nosotros
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    Explora nuestra página y descubre la mejor línea de productos{' '}
                    <strong>Sheló Nabel</strong>, diseñados para tu bienestar integral.
                  </p>
                </div>
              </div>

              {/* "Descubre lo que ofrecemos:" Card from Menu 2 */}
              <div className="bg-white/95 p-5 sm:p-6 rounded-2xl border-2 border-amber-300 shadow-md">
                <h3 className="font-serif font-extrabold text-lg sm:text-xl text-blue-950 mb-3 pb-2 border-b border-amber-200 flex items-center gap-2">
                  <img
                    src={SHELO_LOGO_URL}
                    alt="Sheló NABEL"
                    className="w-6 h-6 rounded-full object-cover border border-amber-400"
                  />
                  <span>Descubre lo que ofrecemos:</span>
                </h3>

                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-800">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleJumpToCategory('Todos')}
                      className="w-full text-left p-2 rounded-xl hover:bg-amber-50 transition-colors flex items-start gap-2.5 group"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-900 mt-1.5 shrink-0" />
                      <span>
                        <strong className="text-blue-950 group-hover:text-amber-700 underline-offset-2 group-hover:underline">
                          Línea Shelo:
                        </strong>{' '}
                        Catálogo completo de nutrición, belleza y bienestar.
                      </span>
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => handleJumpToCategory('Salud y Bienestar')}
                      className="w-full text-left p-2 rounded-xl hover:bg-amber-50 transition-colors flex items-start gap-2.5 group"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-900 mt-1.5 shrink-0" />
                      <span>
                        <strong className="text-blue-950 group-hover:text-amber-700 underline-offset-2 group-hover:underline">
                          Tu Bienestar:
                        </strong>{' '}
                        Nuestra misión es tu salud y calidad de vida.
                      </span>
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => handleJumpToCategory('Cuidado Facial')}
                      className="w-full text-left p-2 rounded-xl hover:bg-amber-50 transition-colors flex items-start gap-2.5 group"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-900 mt-1.5 shrink-0" />
                      <span>
                        <strong className="text-blue-950 group-hover:text-amber-700 underline-offset-2 group-hover:underline">
                          Belleza Natural:
                        </strong>{' '}
                        Cuidados para la piel y el cabello.
                      </span>
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={onExploreCatalog}
                      className="w-full text-left p-2 rounded-xl hover:bg-amber-50 transition-colors flex items-start gap-2.5 group"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-900 mt-1.5 shrink-0" />
                      <span>
                        <strong className="text-blue-950 group-hover:text-amber-700 underline-offset-2 group-hover:underline">
                          Servicios Integrales:
                        </strong>{' '}
                        Conoce todas nuestras categorías para mejorar tu salud.
                      </span>
                    </button>
                  </li>

                  <li id="contacto-section">
                    <a
                      href="https://wa.me/526621395110?text=Hola%20Jhosie%20Gir%C3%B3n%2C%20me%20comunico%20al%206621395110%20desde%20la%20p%C3%A1gina%20Shel%C3%B3%20NABEL."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left p-2 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-2.5"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong className="text-blue-950">Contacto Jhosie:</strong> Comunícate al{' '}
                        <strong className="font-mono text-emerald-800 underline">6621395110</strong>.
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Product Catalog Categories Menu developed according to the catalog */}
          <div className="mt-8 pt-6 border-t-2 border-amber-300/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={SHELO_LOGO_URL}
                  alt="Sheló NABEL"
                  className="w-8 h-8 rounded-full object-cover border border-amber-400 shadow-xs"
                />
                <div>
                  <h3 className="font-serif font-extrabold text-base sm:text-lg text-blue-950">
                    Menú Desarrollado Conforme al Catálogo de Productos Sheló NABEL
                  </h3>
                  <p className="text-xs text-slate-600">
                    Selecciona cualquier categoría del menú para ver sus productos inmediatamente:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectCategory) onSelectCategory('Todos');
                    if (onToggleStarProducts) onToggleStarProducts(true);
                    onExploreCatalog();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-xs flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Ver Productos Estrella</span>
                </button>

                <button
                  type="button"
                  onClick={onExplorePdfs}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ver {pdfsCount} PDFs</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CATALOG_CATEGORIES_MENU.map((item) => {
                const count = getCategoryCount(item.category);
                const isSelected = selectedCategory === item.category;
                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => handleJumpToCategory(item.category)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 group ${
                      isSelected
                        ? 'bg-blue-950 text-white border-amber-400 shadow-lg'
                        : 'bg-white/95 hover:bg-amber-50 text-slate-800 border-amber-200 hover:border-amber-400 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-100 text-blue-950 shrink-0">
                          {item.icon}
                        </div>
                        <span
                          className={`font-serif font-extrabold text-xs sm:text-sm leading-snug ${
                            isSelected ? 'text-amber-300' : 'text-blue-950 group-hover:text-blue-800'
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {count}
                      </span>
                    </div>

                    <p
                      className={`text-[11px] leading-snug line-clamp-2 ${
                        isSelected ? 'text-blue-100' : 'text-slate-600'
                      }`}
                    >
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
