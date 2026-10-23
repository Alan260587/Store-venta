import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  FileText,
  Shield,
  MessageCircle,
  Users,
  CheckCircle2,
  Menu,
  X,
  Home,
  Info,
  Sparkles,
  Phone,
  HeartPulse,
  Smile,
  Scissors,
  Droplets,
  Baby,
  BookOpen,
  Star,
  ChevronRight,
  Layers,
  Search
} from 'lucide-react';
import { MultiUserPresence, PdfDocument, Product, ProductCategory } from '../types';

export const SHELO_LOGO_URL = `${import.meta.env.BASE_URL}assets/aistudio/shelon_logo_182b5079.jpeg`;

interface NavbarProps {
  activeTab: 'catalog' | 'pdfs' | 'admin';
  setActiveTab: (tab: 'catalog' | 'pdfs' | 'admin') => void;
  cartCount: number;
  openCart: () => void;
  isAdminUnlocked: boolean;
  openAdminModal: () => void;
  presence?: MultiUserPresence;
  totalProductsCount?: number;
  totalPdfsCount?: number;
  products?: Product[];
  pdfs?: PdfDocument[];
  selectedCategory?: ProductCategory;
  onSelectCategory?: (category: ProductCategory) => void;
  onlyStarProducts?: boolean;
  onToggleStarProducts?: (onlyStar: boolean) => void;
  onNavigateSection?: (sectionId: string) => void;
  onQuickSearchCatalog?: (term: string) => void;
  onAddToCartFromMenu?: (product: Product) => void;
}

const CATALOG_MENU_CATEGORIES: Array<{
  category: ProductCategory;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}> = [
  {
    category: 'Todos',
    label: 'Línea Shelo (Catálogo Completo)',
    subtitle: 'Todos los productos de nutrición, belleza y bienestar',
    icon: <Sparkles className="w-4 h-4 text-amber-500" />
  },
  {
    category: 'Salud y Bienestar',
    label: 'Salud y Bienestar (Nutrición)',
    subtitle: 'Melena de León, NAD Colágeno, Rhodiola, Magnesio, Complejo B',
    icon: <HeartPulse className="w-4 h-4 text-emerald-600" />
  },
  {
    category: 'Cuidado Facial',
    label: 'Cuidado Facial (Belleza Natural)',
    subtitle: 'Baba de Caracol, Agua Termal, Sueros Hialurónico y Centella',
    icon: <Smile className="w-4 h-4 text-teal-600" />
  },
  {
    category: 'Cuidado Capilar',
    label: 'Cuidado Capilar',
    subtitle: 'Shampoo Cola de Caballo, Bergamota con Minoxidil, Cebolla',
    icon: <Scissors className="w-4 h-4 text-cyan-600" />
  },
  {
    category: 'Cuidado Corporal',
    label: 'Cuidado Corporal',
    subtitle: 'Hielo Mineral, Therapygel, Crema Corporal, Leche de Burra',
    icon: <Droplets className="w-4 h-4 text-blue-600" />
  },
  {
    category: 'Cosméticos y Aromas',
    label: 'Cosméticos y Aromas',
    subtitle: 'Barras Multiusos Labios y Mejillas Cereza y Durazno',
    icon: <Sparkles className="w-4 h-4 text-rose-500" />
  },
  {
    category: 'Línea Infantil',
    label: 'Línea Infantil',
    subtitle: 'Vita Niños Suplemento con vitaminas y minerales',
    icon: <Baby className="w-4 h-4 text-amber-600" />
  },
  {
    category: 'Escolar y Accesorios',
    label: 'Escolar y Accesorios',
    subtitle: 'Folders Escolares, Tijeras Westcott y Crayones Crayola 24',
    icon: <BookOpen className="w-4 h-4 text-indigo-600" />
  }
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  openCart,
  isAdminUnlocked,
  openAdminModal,
  presence,
  totalProductsCount = 0,
  totalPdfsCount = 0,
  products = [],
  pdfs = [],
  selectedCategory = 'Todos',
  onSelectCategory,
  onlyStarProducts = false,
  onToggleStarProducts,
  onNavigateSection,
  onQuickSearchCatalog,
  onAddToCartFromMenu
}) => {
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState<boolean>(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState<string>('');
  const totalOnline = presence?.totalOnline || 1;

  const getCategoryCount = (cat: ProductCategory) => {
    if (cat === 'Todos') return products.length || totalProductsCount;
    return products.filter((p) => p.category === cat).length;
  };

  // Live Quick Search results inside the dropdown menu
  const quickSearchResults = useMemo(() => {
    const q = menuSearchTerm.trim().toLowerCase();
    if (!q) return { matchedProducts: [], matchedPdfs: [] };

    const matchedProducts = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.clave.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
      .slice(0, 6);

    const matchedPdfs = pdfs
      .filter(
        (pdf) =>
          pdf.title.toLowerCase().includes(q) ||
          (pdf.category && pdf.category.toLowerCase().includes(q)) ||
          pdf.description.toLowerCase().includes(q)
      )
      .slice(0, 4);

    return { matchedProducts, matchedPdfs };
  }, [menuSearchTerm, products, pdfs]);

  const handleCategoryClick = (cat: ProductCategory) => {
    setActiveTab('catalog');
    if (onToggleStarProducts) onToggleStarProducts(false);
    if (onSelectCategory) onSelectCategory(cat);
    if (onQuickSearchCatalog) onQuickSearchCatalog('');
    setIsMenuDrawerOpen(false);
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleStarFilterClick = () => {
    setActiveTab('catalog');
    if (onSelectCategory) onSelectCategory('Todos');
    if (onToggleStarProducts) onToggleStarProducts(!onlyStarProducts);
    setIsMenuDrawerOpen(false);
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleSectionJump = (sectionId: string) => {
    setActiveTab('catalog');
    setIsMenuDrawerOpen(false);
    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  };

  const handleApplyQuickSearchToCatalog = (termToSearch: string) => {
    setActiveTab('catalog');
    if (onSelectCategory) onSelectCategory('Todos');
    if (onToggleStarProducts) onToggleStarProducts(false);
    if (onQuickSearchCatalog) onQuickSearchCatalog(termToSearch);
    setIsMenuDrawerOpen(false);
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-md">
      {/* Top Status & Brand Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white text-xs py-1.5 px-4 text-center font-medium flex flex-wrap items-center justify-center gap-2 sm:gap-3 border-b border-amber-400/40">
        <div className="flex items-center gap-2">
          <img
            src={SHELO_LOGO_URL}
            alt="Sheló NABEL Logo"
            className="w-5 h-5 rounded-full object-cover border border-amber-300 shadow-xs"
          />
          <span className="font-semibold text-amber-200">
            Sheló NABEL • Jhosie Girón — &ldquo;Salud al alcance de todos&rdquo;
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/90 border border-amber-400/40 text-[11px] text-amber-100 font-semibold">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>
            {totalProductsCount} Productos • Catálogo Oficial Gratis (Preview 5 Págs)
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-[11px] text-emerald-100 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Users className="w-3 h-3 text-emerald-300" />
          <span>
            {totalOnline} {totalOnline === 1 ? 'aparato conectado' : 'aparatos conectados'}
          </span>
        </span>
      </div>

      {/* Main Header Row styled after Menu 2 reference image */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24 gap-2">
          {/* Left: Hamburger Menu Button (=) + Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              type="button"
              onClick={() => setIsMenuDrawerOpen(!isMenuDrawerOpen)}
              className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-gradient-to-b from-amber-100 to-amber-200/90 hover:from-amber-200 hover:to-amber-300 text-blue-950 border-2 border-amber-400 shadow-sm flex items-center gap-2 transition-all active:scale-95"
              title="Abrir Menú del Catálogo y Buscador Rápido"
              aria-label="Abrir Menú"
            >
              {isMenuDrawerOpen ? (
                <X className="w-6 h-6 text-blue-950" />
              ) : (
                <Menu className="w-6 h-6 text-blue-950" />
              )}
              <span className="hidden sm:inline font-bold text-xs uppercase tracking-wider text-blue-950">
                Menú
              </span>
            </button>

            {/* Official Sheló NABEL Circular Logo Image */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('catalog');
                if (onSelectCategory) onSelectCategory('Todos');
                if (onQuickSearchCatalog) onQuickSearchCatalog('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 group text-left focus:outline-none"
            >
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 shadow-lg group-hover:scale-105 transition-transform shrink-0">
                <img
                  src={SHELO_LOGO_URL}
                  alt="Sheló NABEL Jhosie Girón Logo"
                  className="w-full h-full rounded-full object-cover bg-white"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-lg sm:text-2xl font-extrabold tracking-tight text-blue-950">
                    Sheló <span className="text-sky-600">NABEL</span>
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-800 font-bold tracking-tight">
                  Jhosie Girón • 6621395110
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold hidden sm:block">
                  Nutrición • Belleza • Salud • Bienestar • Calidad de Vida
                </p>
              </div>
            </button>
          </div>

          {/* Center Navigation (Menu 2 items) */}
          <nav className="hidden xl:flex items-center gap-1.5 bg-amber-50/90 p-1.5 rounded-2xl border border-amber-200 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('catalog');
                if (onSelectCategory) onSelectCategory('Todos');
                if (onQuickSearchCatalog) onQuickSearchCatalog('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'catalog' && selectedCategory === 'Todos'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-blue-950 hover:bg-amber-200/60'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionJump('sobre-nosotros-section')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-950 hover:bg-amber-200/60 transition-all flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-blue-700" />
              <span>Sobre Nosotros</span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryClick('Todos')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-950 hover:bg-amber-200/60 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Línea Shelo ({totalProductsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pdfs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pdfs'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-900 hover:bg-emerald-100/80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Descargar Catálogo Gratis</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionJump('contacto-section')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-950 hover:bg-amber-200/60 transition-all flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Contacto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isAdminUnlocked) {
                  setActiveTab('admin');
                } else {
                  openAdminModal();
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isAdminUnlocked
                  ? 'bg-amber-200 text-amber-950 hover:bg-amber-300'
                  : 'text-slate-700 hover:bg-amber-200/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdminUnlocked ? 'Admin Activo' : 'Admin (****)'}</span>
            </button>
          </nav>

          {/* Right Action Buttons: WhatsApp 6621395110 & Cart */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <a
              href="https://wa.me/526621395110?text=Hola%20Jhosie%20Gir%C3%B3n%2C%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20del%20cat%C3%A1logo%20Shel%C3%B3%20NABEL."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all border border-emerald-400"
              title="WhatsApp Directo Jhosie Girón 6621395110"
            >
              <MessageCircle className="w-4 h-4 text-amber-300 fill-amber-300/20 shrink-0" />
              <span className="hidden md:inline">WhatsApp:</span>
              <span className="font-mono tracking-tight">6621395110</span>
            </a>

            <button
              type="button"
              onClick={openCart}
              className="relative p-2.5 sm:px-4 sm:py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md border border-amber-400/60 transition-all active:scale-95"
              aria-label="Carrito de compras"
            >
              <ShoppingBag className="w-5 h-5 text-amber-300" />
              <span className="hidden sm:inline">Carrito</span>
              {cartCount > 0 && (
                <span className="bg-amber-400 text-slate-950 font-extrabold text-xs w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Product Catalog Quick Category Menu Strip (Always visible under header) */}
        <div className="py-2 border-t border-amber-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 shrink-0 flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-700" />
            <span>Menú Catálogo:</span>
          </span>

          {CATALOG_MENU_CATEGORIES.map((item) => {
            const count = getCategoryCount(item.category);
            const isActive =
              activeTab === 'catalog' && !onlyStarProducts && selectedCategory === item.category;
            return (
              <button
                key={item.category}
                type="button"
                onClick={() => handleCategoryClick(item.category)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                  isActive
                    ? 'bg-blue-900 text-white border-amber-400 shadow-xs'
                    : 'bg-amber-50/70 text-slate-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>{item.category === 'Todos' ? 'Línea Shelo (Todos)' : item.category}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-200/80 text-amber-950'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleStarFilterClick}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              activeTab === 'catalog' && onlyStarProducts
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
            <span>Productos Estrella</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdfs')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
              activeTab === 'pdfs'
                ? 'bg-emerald-700 text-white border-emerald-500 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Descargar Catálogo Gratis</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isAdminUnlocked) {
                setActiveTab('admin');
              } else {
                openAdminModal();
              }
            }}
            className={`xl:hidden px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-slate-950 border-amber-600'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin (****)</span>
          </button>
        </div>
      </div>

      {/* Full Interactive Menu 2 Drawer / Dropdown when clicking Menú (=) */}
      {isMenuDrawerOpen && (
        <div
          className="fixed inset-0 top-[116px] sm:top-[132px] z-50 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsMenuDrawerOpen(false)}
        >
          <div
            className="max-w-4xl mx-auto bg-gradient-to-b from-amber-50 via-white to-amber-50/90 border-b-4 border-amber-400 shadow-2xl rounded-b-3xl p-5 sm:p-7 max-h-[82vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header with Sheló NABEL Logo */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-amber-200">
              <div className="flex items-center gap-4">
                <img
                  src={SHELO_LOGO_URL}
                  alt="Sheló NABEL Jhosie Girón"
                  className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-md bg-white shrink-0"
                />
                <div>
                  <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-blue-950">
                    Bienvenidos a nuestro sitio web
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700">
                    Conoce nuestros productos y servicios de nutrición, belleza y bienestar.{' '}
                    <strong className="text-blue-900">&ldquo;Salud al alcance de todos&rdquo;.</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 self-end sm:self-center shrink-0"
              >
                <X className="w-4 h-4" />
                <span>Cerrar Menú</span>
              </button>
            </div>

            {/* BUSCADOR RÁPIDO DENTRO DEL MENÚ DESPLEGABLE (=) */}
            <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white border-2 border-amber-400/70 shadow-md">
              <label className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-2">
                <Search className="w-4 h-4 text-amber-400" />
                <span>Buscador Rápido en el Menú (Productos, Claves S1701 o Catálogo):</span>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && menuSearchTerm.trim()) {
                        handleApplyQuickSearchToCatalog(menuSearchTerm.trim());
                      }
                    }}
                    placeholder="Escribe el nombre del producto, clave (ej. S1701) o ingrediente..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    autoFocus
                  />
                  {menuSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setMenuSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {menuSearchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => handleApplyQuickSearchToCatalog(menuSearchTerm.trim())}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shrink-0 shadow-xs transition-all"
                  >
                    Ver en el Catálogo →
                  </button>
                )}
              </div>

              {/* Instant Live Results inside the Dropdown Menu */}
              {menuSearchTerm.trim() !== '' && (
                <div className="mt-3 bg-white text-slate-800 rounded-xl p-3 border border-amber-300 space-y-3 max-h-64 overflow-y-auto">
                  {quickSearchResults.matchedProducts.length === 0 &&
                  quickSearchResults.matchedPdfs.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-500">
                      No se encontraron productos con &ldquo;{menuSearchTerm}&rdquo;.
                    </div>
                  ) : (
                    <>
                      {quickSearchResults.matchedProducts.length > 0 && (
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-950 block mb-1.5">
                            Productos Encontrados ({quickSearchResults.matchedProducts.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {quickSearchResults.matchedProducts.map((prod) => (
                              <div
                                key={prod.id}
                                className="p-2 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200 flex items-center justify-between gap-2 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleApplyQuickSearchToCatalog(prod.name)}
                                  className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                                >
                                  <img
                                    src={prod.image}
                                    alt={prod.name}
                                    className="w-10 h-10 rounded-lg object-contain bg-white border border-amber-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-blue-950 block truncate">
                                      {prod.name}
                                    </span>
                                    <span className="text-[10px] text-slate-600 font-mono block">
                                      Clave: {prod.clave} •{' '}
                                      <strong className="text-emerald-700">${prod.price} MXN</strong>
                                    </span>
                                  </div>
                                </button>

                                {onAddToCartFromMenu && (
                                  <button
                                    type="button"
                                    onClick={() => onAddToCartFromMenu(prod)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shrink-0"
                                    title="Agregar al carrito"
                                  >
                                    + Carrito
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {quickSearchResults.matchedPdfs.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block mb-1.5">
                            Catálogo Oficial para Descargar Gratis:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {quickSearchResults.matchedPdfs.map((pdf) => (
                              <button
                                key={pdf.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab('pdfs');
                                  setIsMenuDrawerOpen(false);
                                }}
                                className="p-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-between gap-2 text-left transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-slate-900 block truncate">
                                      {pdf.title}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {pdf.pagesCount} págs • Preview 5 págs
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 bg-emerald-600 text-white">
                                  Gratis
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column: Menu 2 Principal Navigation */}
              <div className="lg:col-span-5 space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Menú Principal Sheló NABEL</span>
                </h4>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('catalog');
                    if (onSelectCategory) onSelectCategory('Todos');
                    if (onQuickSearchCatalog) onQuickSearchCatalog('');
                    setIsMenuDrawerOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white hover:bg-amber-100/80 border border-amber-200 shadow-2xs flex items-center justify-between text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-blue-900" />
                    <div>
                      <span className="font-bold text-sm text-blue-950 block">Inicio</span>
                      <span className="text-[11px] text-slate-500">Portada principal y bienvenida</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSectionJump('sobre-nosotros-section')}
                  className="w-full px-4 py-3 rounded-xl bg-white hover:bg-amber-100/80 border border-amber-200 shadow-2xs flex items-center justify-between text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-blue-900" />
                    <div>
                      <span className="font-bold text-sm text-blue-950 block">Sobre Nosotros</span>
                      <span className="text-[11px] text-slate-500">Nuestra misión es tu salud y calidad de vida</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCategoryClick('Todos')}
                  className="w-full px-4 py-3 rounded-xl bg-white hover:bg-amber-100/80 border border-amber-200 shadow-2xs flex items-center justify-between text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="font-bold text-sm text-blue-950 block">
                        Línea Shelo ({totalProductsCount} Productos)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Catálogo completo de nutrición, belleza y bienestar
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pdfs');
                    setIsMenuDrawerOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs flex items-center justify-between text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-emerald-700" />
                    <div>
                      <span className="font-bold text-sm text-emerald-950 block">
                        Descargar Catálogo Oficial Gratis
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Vista previa de 5 páginas y descarga 100% gratis
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-700" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSectionJump('contacto-section')}
                  className="w-full px-4 py-3 rounded-xl bg-white hover:bg-amber-100/80 border border-amber-200 shadow-2xs flex items-center justify-between text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-900" />
                    <div>
                      <span className="font-bold text-sm text-blue-950 block">Contacto</span>
                      <span className="text-[11px] text-slate-500">Atención personalizada Jhosie Girón</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600" />
                </button>

                <a
                  href="https://wa.me/526621395110?text=Hola%20Jhosie%20Gir%C3%B3n%2C%20me%20comunico%20desde%20el%20men%C3%BA%20de%20la%20p%C3%A1gina%20Shel%C3%B3%20NABEL."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-amber-300" />
                    <div>
                      <span className="font-extrabold text-sm block">WhatsApp Directo</span>
                      <span className="text-xs font-mono text-amber-200 font-bold">6621395110</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white" />
                </a>
              </div>

              {/* Right Column: Product Catalog Categories Menu */}
              <div className="lg:col-span-7">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-950 mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-800" />
                  <span>Categorías del Catálogo de Productos Sheló NABEL</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATALOG_MENU_CATEGORIES.map((catItem) => {
                    const count = getCategoryCount(catItem.category);
                    const isSelected = selectedCategory === catItem.category && activeTab === 'catalog';
                    return (
                      <button
                        key={catItem.category}
                        type="button"
                        onClick={() => handleCategoryClick(catItem.category)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-950 text-white border-amber-400 shadow-md'
                            : 'bg-white hover:bg-amber-50 text-slate-800 border-amber-200/90 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-amber-100/80 shrink-0 mt-0.5">
                            {catItem.icon}
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`font-bold text-xs block truncate ${
                                isSelected ? 'text-amber-300' : 'text-blue-950'
                              }`}
                            >
                              {catItem.label}
                            </span>
                            <span
                              className={`text-[11px] line-clamp-2 leading-snug ${
                                isSelected ? 'text-blue-100' : 'text-slate-500'
                              }`}
                            >
                              {catItem.subtitle}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
