import React from 'react';
import { ShoppingBag, FileText, Shield, MessageCircle, Leaf } from 'lucide-react';

interface NavbarProps {
  activeTab: 'catalog' | 'pdfs' | 'admin';
  setActiveTab: (tab: 'catalog' | 'pdfs' | 'admin') => void;
  cartCount: number;
  openCart: () => void;
  isAdminUnlocked: boolean;
  openAdminModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  openCart,
  isAdminUnlocked,
  openAdminModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm">
      {/* Top Banner */}
      <div className="bg-emerald-800 text-white text-xs sm:text-sm py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Leaf className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
        <span>Sheló NABEL — ¡La belleza a tu alcance en armonía con la naturaleza!</span>
        <span className="hidden md:inline text-emerald-200">| Envíos e informes vía WhatsApp: +52 662 139 5110</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo */}
          <button
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <span className="font-serif font-bold text-xl tracking-tighter">S</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-wide text-emerald-900">
                  Sheló
                </span>
                <span className="text-xs sm:text-sm font-light text-cyan-600 tracking-widest uppercase">
                  NABEL
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium tracking-tight">Tienda Oficial &amp; Catálogos</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2 bg-emerald-50/70 p-1.5 rounded-full border border-emerald-100">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'catalog'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/60'
              }`}
            >
              Catálogo de Productos
            </button>

            <button
              onClick={() => setActiveTab('pdfs')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'pdfs'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              Descargas y Documentos
            </button>

            <button
              onClick={() => {
                if (isAdminUnlocked) {
                  setActiveTab('admin');
                } else {
                  openAdminModal();
                }
              }}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isAdminUnlocked
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  : 'text-slate-700 hover:bg-emerald-100/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              {isAdminUnlocked ? 'Panel Admin' : 'Área Admin'}
            </button>
          </nav>

          {/* Action Buttons: Cart & WhatsApp */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://wa.me/526621395110"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors border border-emerald-200"
              title="Contacto directo WhatsApp +52 662 139 5110"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>+52 662 139 5110</span>
            </a>

            <button
              onClick={openCart}
              className="relative p-2.5 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-medium text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
              aria-label="Carrito de compras"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline font-semibold">Carrito</span>
              {cartCount > 0 && (
                <span className="bg-amber-400 text-slate-900 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Mobile Nav Tabs */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-emerald-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-full ${
              activeTab === 'catalog' ? 'bg-emerald-600 text-white' : 'text-emerald-900'
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => setActiveTab('pdfs')}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1 ${
              activeTab === 'pdfs' ? 'bg-emerald-600 text-white' : 'text-emerald-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            PDFs
          </button>
          <button
            onClick={() => {
              if (isAdminUnlocked) {
                setActiveTab('admin');
              } else {
                openAdminModal();
              }
            }}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1 ${
              activeTab === 'admin' ? 'bg-amber-600 text-white' : 'text-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </button>
        </div>

      </div>
    </header>
  );
};
