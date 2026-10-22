import React, { useState, useRef } from 'react';
import { X, Plus, Image as ImageIcon, Tag, DollarSign, Package, AlertCircle, Upload, CheckCircle2 } from 'lucide-react';
import { Product, ProductCategory } from '../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (productData: Omit<Product, 'id'>) => void;
}

const CATEGORIES: ProductCategory[] = [
  'Cuidado Facial',
  'Salud y Bienestar',
  'Cuidado Capilar',
  'Cuidado Corporal',
  'Línea Infantil',
  'Escolar y Accesorios',
  'Cosméticos y Aromas'
];

const PRESET_IMAGES = [
  { label: 'Cuidado Facial', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80' },
  { label: 'Suplemento / Frasco', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80' },
  { label: 'Cuidado Capilar / Shampoo', url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Crema Corporal', url: 'https://images.unsplash.com/photo-1608248597379-24233777f722?auto=format&fit=crop&w=600&q=80' },
  { label: 'Artículos Escolares', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80' }
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [name, setName] = useState<string>('');
  const [clave, setClave] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [size, setSize] = useState<string>('100 ml');
  const [category, setCategory] = useState<ProductCategory>('Cuidado Facial');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>(PRESET_IMAGES[0].url);
  const [isStarProduct, setIsStarProduct] = useState<boolean>(false);
  const [isNew, setIsNew] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [uploadedPhotoName, setUploadedPhotoName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadedPhotoName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 520;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX_DIM) {
          h = Math.round((h * MAX_DIM) / w);
          w = MAX_DIM;
        } else if (h >= w && h > MAX_DIM) {
          w = Math.round((w * MAX_DIM) / h);
          h = MAX_DIM;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setImageUrl(compressedDataUrl);
        }
      };
      if (typeof ev.target?.result === 'string') {
        img.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setName('');
    setClave('');
    setPrice('');
    setSize('100 ml');
    setCategory('Cuidado Facial');
    setDescription('');
    setImageUrl(PRESET_IMAGES[0].url);
    setIsStarProduct(false);
    setIsNew(true);
    setError('');
    setUploadedPhotoName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clave.trim() || !price) {
      setError('Por favor completa el nombre, clave y precio del artículo.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Ingresa un precio válido en MXN.');
      return;
    }

    onAddProduct({
      name: name.trim(),
      clave: clave.trim().toUpperCase(),
      price: priceNum,
      size: size.trim() || '1 pza',
      category,
      description: description.trim() || 'Producto de alta calidad de la línea Sheló NABEL.',
      image: imageUrl || PRESET_IMAGES[0].url,
      isStarProduct,
      isNew
    });

    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-emerald-100 z-10 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <img
            src="/assets/aistudio/shelon_logo_182b5079.jpeg"
            alt="Sheló NABEL"
            className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0 bg-white"
          />
          <div>
            <h3 className="font-serif font-bold text-xl text-slate-900">Agregar Nuevo Artículo Sheló NABEL</h3>
            <p className="text-xs text-slate-500">
              Al guardar, la página se actualiza automáticamente mostrando tu producto en el catálogo
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Producto</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Baba de Caracol Crema"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Clave (Código)</label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="Ej. S1701"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Precio (MXN)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="149"
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tamaño / Formato</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Ej. 100 ml, 250 g, 1 pza"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre beneficios, activos o ingredientes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Fotografía del Producto (Sube desde tu dispositivo o usa URL)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Subir Foto de Galería</span>
              </button>
              {uploadedPhotoName && (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{uploadedPhotoName}</span>
                </span>
              )}
            </div>

            <div className="relative mb-2">
              <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-500">
              <span className="shrink-0 font-semibold">Preajustes:</span>
              {PRESET_IMAGES.map((img) => (
                <button
                  key={img.label}
                  type="button"
                  onClick={() => {
                    setImageUrl(img.url);
                    setUploadedPhotoName('');
                  }}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 shrink-0"
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isStarProduct}
                onChange={(e) => setIsStarProduct(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Producto Estrella</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Lanzamiento / Nuevo</span>
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Producto y Actualizar Página</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
