import React, { useState, useMemo } from 'react';
import { Search, Filter, Star, Sparkles, X } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { ProductCard } from './ProductCard';
import { SHELO_LOGO_URL } from './Navbar';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number, selectedColor?: string) => void;
  isAdmin?: boolean;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (id: string) => void;
  selectedCategory?: ProductCategory;
  onSelectCategory?: (category: ProductCategory) => void;
  onlyStarProducts?: boolean;
  onToggleStarProducts?: (onlyStar: boolean) => void;
  externalSearchTerm?: string;
  onSearchTermChange?: (term: string) => void;
}

const CATEGORIES: ProductCategory[] = [
  'Todos',
  'Salud y Bienestar',
  'Cuidado Facial',
  'Cuidado Capilar',
  'Cuidado Corporal',
  'Cosméticos y Aromas',
  'Línea Infantil',
  'Escolar y Accesorios'
];

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart,
  isAdmin,
  onUpdateProduct,
  onDeleteProduct,
  selectedCategory: externalCategory,
  onSelectCategory,
  onlyStarProducts: externalOnlyStar,
  onToggleStarProducts,
  externalSearchTerm,
  onSearchTermChange
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState<string>('');
  const [internalCategory, setInternalCategory] = useState<ProductCategory>('Todos');
  const [internalOnlyStar, setInternalOnlyStar] = useState<boolean>(false);

  const searchTerm = externalSearchTerm ?? internalSearchTerm;
  const setSearchTerm = onSearchTermChange ?? setInternalSearchTerm;

  const selectedCategory = externalCategory ?? internalCategory;
  const setSelectedCategory = onSelectCategory ?? setInternalCategory;

  const onlyStarProducts = externalOnlyStar ?? internalOnlyStar;
  const setOnlyStarProducts = onToggleStarProducts ?? setInternalOnlyStar;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStar = !onlyStarProducts || p.isStarProduct;

      return matchesCategory && matchesSearch && matchesStar;
    });
  }, [products, selectedCategory, searchTerm, onlyStarProducts]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search and Quick Filters Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-200 shadow-sm mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el catálogo por artículo, categoría, clave (ej: S1701) o ingrediente..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-amber-200 bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent text-sm text-slate-800 placeholder:text-slate-400 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Star products filter toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyStarProducts(!onlyStarProducts)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all border ${
                onlyStarProducts
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                  : 'bg-amber-50/70 text-blue-950 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Star className={`w-4 h-4 ${onlyStarProducts ? 'fill-slate-950' : 'text-amber-600'}`} />
              <span>Solo Productos Estrella</span>
            </button>
          </div>
        </div>

        {/* Category Chips developed according to the Catalog */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-3 border-t border-amber-100">
          <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-600" /> Categorías del Catálogo:
          </span>
          {CATEGORIES.map((cat) => {
            const count =
              cat === 'Todos'
                ? products.length
                : products.filter((p) => p.category === cat).length;

            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-blue-950 text-white border-amber-400 shadow-sm'
                    : 'bg-amber-50/80 text-slate-800 border-amber-200 hover:bg-amber-100 hover:text-blue-950'
                }`}
              >
                <span>{cat === 'Todos' ? 'Línea Shelo (Todos)' : cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-amber-200/80 text-amber-950'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Header with Sheló NABEL Logo & Results Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white p-4 sm:p-5 rounded-2xl border border-amber-400/50 shadow-md">
        <div className="flex items-center gap-3.5">
          <img
            src={SHELO_LOGO_URL}
            alt="Sheló NABEL Jhosie Girón"
            className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0 bg-white"
          />
          <div>
            <h2 className="text-lg sm:text-2xl font-serif font-extrabold text-white flex flex-wrap items-center gap-2">
              <span>Catálogo de Productos Sheló NABEL</span>
              {selectedCategory !== 'Todos' && (
                <span className="bg-amber-400 text-slate-950 font-sans text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  {selectedCategory}
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 mt-0.5">
              Jhosie Girón • Salud al alcance de todos • Pedidos directos al WhatsApp{' '}
              <strong className="font-mono text-amber-300">6621395110</strong>
            </p>
          </div>
        </div>

        <span className="text-xs font-extrabold bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-full border border-amber-300 shrink-0 self-start sm:self-center shadow-xs">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'artículo' : 'artículos'}
        </span>
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              isAdmin={isAdmin}
              onUpdateProduct={onUpdateProduct}
              onDeleteProduct={onDeleteProduct}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-amber-200 my-8 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">No se encontraron artículos</h3>
          <p className="text-xs text-slate-500 mb-6">
            Intenta cambiar el término de búsqueda o selecciona otra categoría del menú.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('Todos');
              setOnlyStarProducts(false);
            }}
            className="px-5 py-2.5 bg-blue-900 text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors"
          >
            Ver todos los artículos del catálogo
          </button>
        </div>
      )}
    </section>
  );
};
