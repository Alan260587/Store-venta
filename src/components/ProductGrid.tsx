import React, { useState, useMemo } from 'react';
import { Search, Filter, Star, Sparkles, X } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number, selectedColor?: string) => void;
  isAdmin?: boolean;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (id: string) => void;
}

const CATEGORIES: ProductCategory[] = [
  'Todos',
  'Escolar y Accesorios',
  'Cuidado Facial',
  'Salud y Bienestar',
  'Cuidado Capilar',
  'Cuidado Corporal',
  'Línea Infantil',
  'Cosméticos y Aromas',
];

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart,
  isAdmin,
  onUpdateProduct,
  onDeleteProduct
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('Todos');
  const [onlyStarProducts, setOnlyStarProducts] = useState<boolean>(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStar = !onlyStarProducts || p.isStarProduct;

      return matchesCategory && matchesSearch && matchesStar;
    });
  }, [products, selectedCategory, searchTerm, onlyStarProducts]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Search and Quick Filters Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-emerald-100 shadow-sm mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por artículo, clave (ej: 1701), o ingrediente..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-slate-800 placeholder:text-slate-400 transition-all"
            />
            {searchTerm && (
              <button
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
              onClick={() => setOnlyStarProducts(!onlyStarProducts)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all border ${
                onlyStarProducts
                  ? 'bg-amber-400 text-slate-900 border-amber-500 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Star className={`w-4 h-4 ${onlyStarProducts ? 'fill-slate-900' : ''}`} />
              <span>Solo Productos Estrella</span>
            </button>
          </div>

        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" /> Categorías:
          </span>
          {CATEGORIES.map((cat) => {
            const count =
              cat === 'Todos'
                ? products.length
                : products.filter((p) => p.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-100/80 hover:text-emerald-900'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedCategory === cat
                      ? 'bg-emerald-900/60 text-emerald-100'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Header & Results Count */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <span>Catálogo de Ventas Shelo NABEL</span>
            {selectedCategory !== 'Todos' && (
              <span className="text-emerald-700 font-sans text-sm font-medium">
                — {selectedCategory}
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Selecciona la cantidad de tus artículos y agrégalos al carrito para enviar tu pedido directo a WhatsApp.
          </p>
        </div>

        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200 shrink-0">
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
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 my-8 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">No se encontraron artículos</h3>
          <p className="text-xs text-slate-500 mb-6">
            Intenta cambiar el término de búsqueda o selecciona otra categoría.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('Todos');
              setOnlyStarProducts(false);
            }}
            className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Ver todos los artículos
          </button>
        </div>
      )}

    </section>
  );
};
