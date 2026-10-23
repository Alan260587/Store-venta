import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, Star, Sparkles, Tag, Edit3, Trash2, Check, Palette, Camera, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { compressProductImageFile } from '../utils/imageCompressor';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, selectedColor?: string) => void;
  isAdmin?: boolean;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isAdmin,
  onUpdateProduct,
  onDeleteProduct
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<string>(
    product.availableColors && product.availableColors.length > 0
      ? product.availableColors[0].name
      : ''
  );
  const [addedAnimation, setAddedAnimation] = useState<boolean>(false);
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [tempPrice, setTempPrice] = useState<string>(String(product.price));
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTempPrice(String(product.price));
  }, [product.price]);

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAdd = () => {
    const colorToUse =
      product.availableColors && product.availableColors.length > 0
        ? selectedColor || product.availableColors[0].name
        : undefined;
    onAddToCart(product, quantity, colorToUse);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  const handleSavePrice = () => {
    const cleaned = String(tempPrice).replace(/[^0-9.]/g, '');
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val > 0 && onUpdateProduct) {
      if (val !== product.price) {
        onUpdateProduct({
          ...product,
          price: val
        });
      }
    } else {
      setTempPrice(String(product.price));
    }
    setIsEditingPrice(false);
  };

  // Allows uploading/changing the product photo directly from the user's device and syncing to all visitors
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file || !onUpdateProduct) return;

    setIsUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressProductImageFile(file);
      onUpdateProduct({
        ...product,
        image: compressedDataUrl
      });
    } catch (err) {
      console.error('Error al procesar la imagen del producto:', err);
    } finally {
      inputEl.value = '';
      setIsUploadingPhoto(false);
    }
  };

  const activeColorObj = product.availableColors?.find(c => c.name === selectedColor);

  return (
    <div className="group bg-white rounded-2xl border border-emerald-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* Hidden input for custom product photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handlePhotoUpload(e)}
        className="hidden"
      />

      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
        {product.isStarProduct && (
          <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
            <Star className="w-3 h-3 fill-slate-900" />
            Producto Estrella
          </span>
        )}
        {product.isNew && (
          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Nuevo
          </span>
        )}
      </div>

      {/* Clave Code Tag */}
      <div className="absolute top-3 right-3 z-10 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border border-slate-700/50 flex items-center gap-1 shadow-sm">
        <Tag className="w-3 h-3 text-emerald-400" />
        <span>Clave: {product.clave}</span>
      </div>

      {/* Admin Fast Actions Overlay (Change Photo, Edit Price, Delete) */}
      {isAdmin && (
        <div className="absolute top-12 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-amber-300">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="px-2 py-1 text-emerald-800 hover:text-emerald-950 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 text-[10px] font-bold border border-emerald-200"
            title="Cambiar foto del producto desde tu galería"
          >
            {isUploadingPhoto ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>Foto</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditingPrice(true)}
            className="p-1.5 text-slate-600 hover:text-amber-600 rounded-lg hover:bg-amber-50"
            title="Editar precio (Admin)"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {onDeleteProduct && (
            <button
              type="button"
              onClick={() => onDeleteProduct(product.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
              title="Borrar artículo (Admin)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Product Image Container */}
      <div className="relative h-56 sm:h-60 bg-slate-50 overflow-hidden flex items-center justify-center p-3">
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80';
          }}
        />
        {isUploadingPhoto && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="bg-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold text-emerald-800">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Guardando foto...</span>
            </div>
          </div>
        )}
        {activeColorObj && (
          <div className="absolute bottom-2.5 right-3 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-sm border border-slate-200 flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
            <span
              className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
              style={{ backgroundColor: activeColorObj.hex }}
            />
            <span>Color: {activeColorObj.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
            <span>{product.category}</span>
            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-medium border border-emerald-100">
              {product.size}
            </span>
          </div>

          <h3 className="font-serif font-bold text-slate-800 text-base sm:text-lg leading-snug mb-2 group-hover:text-emerald-700 transition-colors">
            {product.name}
          </h3>

          <p className="text-xs text-slate-600 line-clamp-2 font-normal leading-relaxed mb-3">
            {product.description}
          </p>

          {/* Interactive Color Selector when product has availableColors */}
          {product.availableColors && product.availableColors.length > 0 && (
            <div className="mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Escoge el color:</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-800">
                  {selectedColor}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {product.availableColors.map((colorOpt) => {
                  const isSelected = selectedColor === colorOpt.name;
                  return (
                    <button
                      key={colorOpt.name}
                      type="button"
                      onClick={() => setSelectedColor(colorOpt.name)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
                        isSelected
                          ? 'bg-white border-emerald-600 text-slate-900 shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                        style={{ backgroundColor: colorOpt.hex }}
                      />
                      <span className="truncate">{colorOpt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Price and Cart controls */}
        <div className="pt-3 border-t border-slate-100 mt-auto">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-xs text-slate-500 font-medium">Precio Unitario</span>
            <div className="flex items-baseline gap-1">
              {isEditingPrice ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSavePrice();
                      } else if (e.key === 'Escape') {
                        setTempPrice(String(product.price));
                        setIsEditingPrice(false);
                      }
                    }}
                    onBlur={handleSavePrice}
                    className="w-20 px-1.5 py-0.5 border-2 border-amber-500 rounded text-sm font-bold font-mono focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSavePrice();
                    }}
                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    title="Guardar precio"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span
                  onClick={() => {
                    if (isAdmin) setIsEditingPrice(true);
                  }}
                  className={`text-xl sm:text-2xl font-bold text-emerald-700 font-mono ${
                    isAdmin ? 'cursor-pointer hover:underline' : ''
                  }`}
                  title={isAdmin ? 'Haz clic para editar el precio' : undefined}
                >
                  ${product.price}
                </span>
              )}
              <span className="text-xs font-bold text-slate-500">MXN</span>
            </div>
          </div>

          {/* Quantity Selector + Add Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                onClick={handleDecrement}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 active:scale-95 transition-all shadow-2xs"
                title="Disminuir cantidad"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-bold font-mono text-slate-800">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 active:scale-95 transition-all shadow-2xs"
                title="Aumentar cantidad"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleAdd}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                addedAnimation
                  ? 'bg-emerald-800 text-white scale-98'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{addedAnimation ? '¡Agregado!' : 'Agregar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
