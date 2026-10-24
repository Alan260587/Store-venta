import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  BookOpen,
  Package,
  Plus,
  Trash2,
  Lock,
  Search,
  Layers,
  RefreshCw,
  Sparkles,
  Upload,
  CheckCircle2,
  Loader2,
  Edit3,
  Save,
  X,
  Download,
  Eye,
  Camera
} from 'lucide-react';
import { Product, PdfDocument, MultiUserPresence } from '../types';
import { countPdfPages } from '../utils/pdfParser';
import { pdfFileStore } from '../services/pdfFileStore';
import {
  generateDownloadablePdf,
  fetchOfficialCatalogFullBlob,
  isValidPdfHeader
} from '../utils/generateCatalogPdf';
import { OFFICIAL_CATALOG_ID } from '../data/initialPdfs';
import { SHELO_LOGO_URL } from './Navbar';
import { PdfPreviewModal } from './PdfPreviewModal';
import { compressProductImageFile } from '../utils/imageCompressor';

interface AdminPanelProps {
  products: Product[];
  pdfs: PdfDocument[];
  presence?: MultiUserPresence;
  onOpenAddProduct: () => void;
  onOpenAddPdf: () => void;
  onAddPdfDirect?: (pdfData: Omit<PdfDocument, 'id' | 'uploadedAt'>) => { success: boolean; message: string; pdf?: PdfDocument };
  onAddPdfsBatch?: (pdfList: Array<Omit<PdfDocument, 'id' | 'uploadedAt'>>) => { success: boolean; message: string; addedPdfs: PdfDocument[] };
  onDeleteProduct: (id: string) => void;
  onDeletePdf: (id: string) => void;
  onUpdatePdf: (pdf: PdfDocument, options?: { silent?: boolean }) => void;
  onUpdateProduct: (product: Product) => void;
  onSaveAllNow?: () => Promise<void>;
  onLockAdmin: () => void;
  onResetDefaults: () => void;
}

interface StagedInlineCatalog {
  tempId: string;
  file: File;
  title: string;
  pagesCount: number;
  fileSizeFormatted: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  pdfs,
  presence,
  onOpenAddProduct,
  onOpenAddPdf,
  onAddPdfDirect,
  onAddPdfsBatch,
  onDeleteProduct,
  onDeletePdf,
  onUpdatePdf,
  onUpdateProduct,
  onSaveAllNow,
  onLockAdmin,
  onResetDefaults
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'products'>('catalog');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [rowPriceDrafts, setRowPriceDrafts] = useState<Record<string, string>>({});
  const [savedProductRowId, setSavedProductRowId] = useState<string | null>(null);
  const [uploadingPhotoProductId, setUploadingPhotoProductId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [isSavingAllNow, setIsSavingAllNow] = useState<boolean>(false);
  const [saveAllStatusMsg, setSaveAllStatusMsg] = useState<string>('');
  const [previewPdf, setPreviewPdf] = useState<PdfDocument | null>(null);
  const [previewMode, setPreviewMode] = useState<'preview5' | 'fullscreen'>('preview5');

  // Inline editing for existing Catalog title
  const [editingPdfId, setEditingPdfId] = useState<string | null>(null);
  const [editingPdfTitle, setEditingPdfTitle] = useState<string>('');

  // Direct inline upload & staging state in Admin Panel
  const [stagedCatalogs, setStagedCatalogs] = useState<StagedInlineCatalog[]>([]);
  const [isUploadingInline, setIsUploadingInline] = useState<boolean>(false);
  const [inlineUploadMsg, setInlineUploadMsg] = useState<string>('');

  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const productPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const activeProductForPhotoRef = useRef<Product | null>(null);

  const filteredCatalogs = pdfs.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGlobalSaveAllClick = async () => {
    setIsSavingAllNow(true);
    setSaveAllStatusMsg('');
    try {
      if (onSaveAllNow) {
        await onSaveAllNow();
      }
      setSaveAllStatusMsg(
        '¡Guardado instantáneo completado! Todas las fotos, precios, productos y catálogos ya están sincronizados en todos los celulares, computadoras, páginas y proyectos.'
      );
      setTimeout(() => setSaveAllStatusMsg(''), 5000);
    } finally {
      setIsSavingAllNow(false);
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const pdfBlob =
      blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleDirectDownloadCatalog = async (pdf: PdfDocument) => {
    setDownloadingPdfId(pdf.id);
    const safeFilename = `${pdf.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Catalogo_Shelo_NABEL_2026'}.pdf`;
    try {
      const storedBlob = await pdfFileStore.getFileBlob(pdf.id);
      if (storedBlob && storedBlob.size > 0) {
        const headerSlice = await storedBlob.slice(0, 8).arrayBuffer();
        if (isValidPdfHeader(headerSlice)) {
          triggerBlobDownload(storedBlob, safeFilename);
          return;
        }
      }

      if (pdf.id === OFFICIAL_CATALOG_ID) {
        const fullBlob = await fetchOfficialCatalogFullBlob();
        triggerBlobDownload(fullBlob, safeFilename);
        return;
      }

      const generatedBlob = await generateDownloadablePdf(pdf, products);
      triggerBlobDownload(generatedBlob, safeFilename);
    } catch (err) {
      console.error('Error downloading catalog:', err);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleStartEditCatalog = (pdf: PdfDocument) => {
    setEditingPdfId(pdf.id);
    setEditingPdfTitle(pdf.title);
  };

  const handleSaveEditCatalog = (pdf: PdfDocument) => {
    const cleanTitle = editingPdfTitle.trim() || pdf.title;
    onUpdatePdf({
      ...pdf,
      title: cleanTitle,
      price: 0,
      downloadKey: 'GRATIS'
    });
    setEditingPdfId(null);
    setInlineUploadMsg(`¡Se guardó el nombre "${cleanTitle}" (Gratis • Preview 5 Págs) en la página!`);
    setTimeout(() => setInlineUploadMsg(''), 4000);
  };

  const handleInlineFilesSelect = async (rawFiles: File[]) => {
    if (rawFiles.length === 0) return;

    setIsUploadingInline(true);
    setInlineUploadMsg('');
    const prepared: StagedInlineCatalog[] = [];

    try {
      for (let i = 0; i < rawFiles.length; i++) {
        const file = rawFiles[i];
        try {
          const { pagesCount, fileSizeFormatted } = await countPdfPages(file);
          const cleanTitle =
            file.name
              .replace(/\.pdf$/i, '')
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Catálogo Oficial Sheló NABEL';

          prepared.push({
            tempId: `staged-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`,
            file,
            title: cleanTitle,
            pagesCount,
            fileSizeFormatted
          });
        } catch {
          const cleanTitle = file.name.replace(/\.pdf$/i, '') || 'Catálogo Oficial Sheló NABEL';
          prepared.push({
            tempId: `staged-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`,
            file,
            title: cleanTitle,
            pagesCount: 1,
            fileSizeFormatted: '1.0 MB'
          });
        }
      }

      if (prepared.length > 0) {
        setStagedCatalogs((prev) => [...prepared, ...prev]);
      }
    } finally {
      setIsUploadingInline(false);
    }
  };

  const handleUpdateStaged = (tempId: string, changes: Partial<StagedInlineCatalog>) => {
    setStagedCatalogs((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...changes } : item))
    );
  };

  const handleSaveStagedCatalogs = async () => {
    if (stagedCatalogs.length === 0) return;
    setIsSyncingCloud(true);

    try {
      const currentStaged = [...stagedCatalogs];
      const payloads = currentStaged.map((item) => {
        const finalTitle = item.title.trim() || 'Catálogo Oficial Sheló NABEL';
        return {
          title: finalTitle,
          description: `Catálogo Oficial Sheló NABEL (${item.pagesCount} páginas • Vista previa de 5 páginas y descarga 100% gratis).`,
          pagesCount: item.pagesCount,
          price: 0,
          downloadKey: 'GRATIS',
          fileSize: item.fileSizeFormatted,
          category: 'Catálogo Oficial'
        };
      });

      if (onAddPdfsBatch) {
        const batchRes = onAddPdfsBatch(payloads);
        if (batchRes.success && batchRes.addedPdfs.length > 0) {
          setStagedCatalogs([]);
          setInlineUploadMsg(
            '¡Catálogo Oficial guardado y subido automáticamente! Ya tiene su Vista Previa de 5 Páginas y Descarga 100% Gratis activa.'
          );
          await Promise.allSettled(
            batchRes.addedPdfs.map((savedPdf, index) => {
              const sourceFile = currentStaged[index]?.file;
              return sourceFile ? pdfFileStore.saveFile(savedPdf.id, sourceFile) : Promise.resolve();
            })
          );
        }
        return;
      }

      if (!onAddPdfDirect) return;
      const uploadPromises: Array<Promise<void>> = [];
      for (let i = 0; i < payloads.length; i++) {
        const res = onAddPdfDirect(payloads[i]);
        if (res.success && res.pdf) {
          uploadPromises.push(pdfFileStore.saveFile(res.pdf.id, currentStaged[i].file));
        }
      }
      setStagedCatalogs([]);
      setInlineUploadMsg(
        '¡Catálogo Oficial guardado y subido automáticamente con Vista Previa de 5 Páginas y Descarga Gratis!'
      );
      await Promise.allSettled(uploadPromises);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleStartEditPrice = (product: Product) => {
    setEditingProductId(product.id);
    setEditingPrice(String(product.price));
  };

  const handleSavePrice = (product: Product) => {
    const draftVal =
      rowPriceDrafts[product.id] ??
      (editingProductId === product.id ? editingPrice : String(product.price));
    const cleaned = String(draftVal).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    const finalPrice = !isNaN(num) && num > 0 ? num : product.price;
    onUpdateProduct({
      ...product,
      price: finalPrice
    });
    setEditingProductId(null);
    setSavedProductRowId(product.id);
    setTimeout(() => {
      setSavedProductRowId((prev) => (prev === product.id ? null : prev));
    }, 2400);
  };

  const handleTriggerProductPhotoUpload = (product: Product) => {
    activeProductForPhotoRef.current = product;
    productPhotoInputRef.current?.click();
  };

  const handleProductPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    const targetProd = activeProductForPhotoRef.current;
    if (!file || !targetProd) return;

    setUploadingPhotoProductId(targetProd.id);
    try {
      const compressedDataUrl = await compressProductImageFile(file);
      const draftVal = rowPriceDrafts[targetProd.id];
      const cleaned = draftVal !== undefined ? String(draftVal).replace(/[^0-9.]/g, '') : '';
      const num = parseFloat(cleaned);
      const finalPrice = !isNaN(num) && num > 0 ? num : targetProd.price;

      onUpdateProduct({
        ...targetProd,
        price: finalPrice,
        image: compressedDataUrl
      });
      setSavedProductRowId(targetProd.id);
      setTimeout(() => {
        setSavedProductRowId((prev) => (prev === targetProd.id ? null : prev));
      }, 2400);
    } catch (err) {
      console.error('Error al subir foto del producto en AdminPanel:', err);
    } finally {
      inputEl.value = '';
      setUploadingPhotoProductId(null);
      activeProductForPhotoRef.current = null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Admin Header with Sheló NABEL Logo */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 mb-6 shadow-xl border-2 border-amber-400/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={SHELO_LOGO_URL}
            alt="Sheló NABEL Jhosie Girón"
            className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-lg shrink-0 bg-white"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif font-bold text-2xl text-white">
                Panel de Administración Sheló NABEL
              </h2>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Admin Activo</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {presence?.totalOnline || 1} aparatos conectados
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Guardado automático al instante + Apartado de Guardar en todos los celulares, computadoras, páginas y proyectos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => void handleGlobalSaveAllClick()}
            disabled={isSavingAllNow}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {isSavingAllNow ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <Save className="w-4 h-4 text-amber-300" />
            )}
            <span>Guardar Todo Ahora</span>
          </button>

          <button
            type="button"
            onClick={onResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Restablecer productos predeterminados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>

          <button
            type="button"
            onClick={onLockAdmin}
            className="px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto lg:ml-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Apartado de Guardado Instantáneo en Todos los Aparatos, Páginas, Proyectos y Celulares */}
      <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-amber-50 rounded-3xl p-5 sm:p-6 mb-8 shadow-md border-2 border-amber-400">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700 text-white text-[11px] font-extrabold uppercase tracking-wide">
              <Save className="w-3.5 h-3.5 text-amber-300" />
              <span>Apartado de Guardar • Guardado Automático Instantáneo Activo</span>
            </div>
            <h3 className="font-serif font-bold text-slate-900 text-base sm:text-lg">
              Sincronización en todos los celulares, computadoras, páginas y proyectos al instante
            </h3>
            <p className="text-xs text-slate-700">
              Cada foto o precio que cambias se guarda automáticamente al instante. También puedes presionar el botón <strong>Guardar</strong> aquí o en cada producto para confirmar y enviar a todos los dispositivos en tiempo real.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void handleGlobalSaveAllClick()}
              disabled={isSavingAllNow}
              className="px-5 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              {isSavingAllNow ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <Save className="w-4 h-4 text-amber-300" />
              )}
              <span>
                {isSavingAllNow
                  ? 'Guardando en todos los aparatos...'
                  : 'Guardar Cambios en Todos los Celulares y Páginas'}
              </span>
            </button>
          </div>
        </div>

        {saveAllStatusMsg && (
          <div className="mt-4 p-3 bg-emerald-700 text-white rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{saveAllStatusMsg}</span>
          </div>
        )}
      </div>

      {/* Direct Quick Upload Box for the Free Catalog */}
      <div className="bg-emerald-900 text-white rounded-3xl p-6 mb-8 shadow-lg border border-emerald-700">
        <input
          ref={singleFileInputRef}
          type="file"
          accept=".pdf,application/pdf,application/x-pdf,application/octet-stream"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const copied = Array.from(e.target.files);
              e.target.value = '';
              void handleInlineFilesSelect(copied);
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Catálogo Oficial • Vista Previa de 5 Páginas y Descarga 100% Gratis</span>
            </div>
            <h3 className="font-serif font-bold text-lg sm:text-xl">
              Sube el Catálogo Oficial para que tus clientes vean el preview de 5 páginas y lo descarguen gratis:
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => singleFileInputRef.current?.click()}
              className="cursor-pointer px-5 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Upload className="w-4 h-4 text-slate-950" />
              <span>+ Subir Catálogo Oficial Gratis</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddPdf}
              className="px-4 py-3.5 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs rounded-2xl border border-emerald-600"
            >
              Abrir Ventana de Subida
            </button>
          </div>
        </div>

        {isUploadingInline && (
          <div className="mt-4 px-4 py-3 bg-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-bold">
            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            <span>Preparando el Catálogo seleccionado...</span>
          </div>
        )}

        {/* Inline Staging Editor */}
        {stagedCatalogs.length > 0 && (
          <div className="mt-6 bg-white text-slate-900 rounded-2xl p-5 border-2 border-amber-400 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Confirma el Nombre del Catálogo antes de Guardarlo:
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setStagedCatalogs([])}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-3">
              {stagedCatalogs.map((item) => (
                <div
                  key={item.tempId}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                >
                  <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                      Nombre del Catálogo:
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateStaged(item.tempId, { title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border-2 border-emerald-500 bg-white font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <div className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item.pagesCount} págs • Preview 5 Págs • 100% Gratis</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setStagedCatalogs((prev) => prev.filter((p) => p.tempId !== item.tempId))
                      }
                      className="p-2 text-slate-400 hover:text-red-600"
                      title="Quitar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleSaveStagedCatalogs()}
              disabled={isSyncingCloud}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSyncingCloud ? (
                <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
              ) : (
                <Save className="w-5 h-5 text-amber-300" />
              )}
              <span>
                {isSyncingCloud
                  ? 'Subiendo Catálogo Oficial a todos los dispositivos...'
                  : 'Guardar Catálogo Oficial Gratis (Vista Previa de 5 Páginas)'}
              </span>
            </button>
          </div>
        )}

        {inlineUploadMsg && (
          <div className="mt-4 p-3 bg-emerald-700/80 border border-emerald-500 rounded-xl flex items-center gap-2 text-xs font-bold text-white">
            <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{inlineUploadMsg}</span>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveTab('catalog');
              setSearchTerm('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'catalog'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Catálogo para Descargar Gratis ({pdfs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('products');
              setSearchTerm('');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'products'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Productos de la Tienda ({products.length})</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Free Catalog Management */}
        {activeTab === 'catalog' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Catálogo Oficial para Descargar Gratis y Vista Previa de 5 Páginas
                </h3>
                <p className="text-xs text-slate-500">
                  El catálogo subido aquí tiene <strong>Vista Previa de 5 Páginas</strong> y{' '}
                  <strong>Descarga Completa 100% Gratis</strong> para todos los visitantes.
                </p>
              </div>
            </div>

            {filteredCatalogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                      <th className="py-3 px-4">Nombre del Catálogo</th>
                      <th className="py-3 px-4">Páginas Totales</th>
                      <th className="py-3 px-4">Vista Previa y Descarga</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCatalogs.map((pdf) => {
                      const isEditing = editingPdfId === pdf.id;

                      return (
                        <tr key={pdf.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingPdfTitle}
                                  onChange={(e) => setEditingPdfTitle(e.target.value)}
                                  className="w-full max-w-xs px-2.5 py-1.5 border-2 border-emerald-500 rounded-lg text-xs font-bold"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCatalog(pdf)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPdfId(null)}
                                  className="px-2 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px]"
                                >
                                  Cerrar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div>
                                  <span>{pdf.title}</span>
                                  <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                                    Catálogo Oficial • {pdf.fileSize || ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCatalog(pdf)}
                                  className="p-1 text-slate-400 hover:text-emerald-700 rounded hover:bg-emerald-50"
                                  title="Editar nombre del catálogo"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                              <Layers className="w-3 h-3 text-emerald-600" />
                              {pdf.pagesCount} págs
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Preview de 5 Páginas • Descarga 100% Gratis</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewMode('preview5');
                                  setPreviewPdf(pdf);
                                }}
                                className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-blue-950 font-bold text-[11px] rounded-lg border border-amber-300 flex items-center gap-1 transition-all"
                              >
                                <Layers className="w-3.5 h-3.5 text-amber-700" />
                                <span>Preview (5 Págs)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewMode('fullscreen');
                                  setPreviewPdf(pdf);
                                }}
                                className="px-2.5 py-1.5 bg-blue-950 hover:bg-blue-900 text-amber-300 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Completo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDirectDownloadCatalog(pdf)}
                                disabled={downloadingPdfId === pdf.id}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                              >
                                {downloadingPdfId === pdf.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span>Descargar Gratis</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePdf(pdf.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Quitar catálogo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs space-y-3">
                <p>Aún no has subido el Catálogo Oficial. Usa el botón de arriba para subirlo gratis.</p>
                <button
                  type="button"
                  onClick={() => singleFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl inline-flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Catálogo Oficial Gratis</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Products Management */}
        {activeTab === 'products' && (
          <div className="p-6">
            <input
              ref={productPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleProductPhotoFileChange(e)}
              className="hidden"
            />
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Listado de Productos en Catálogo ({filteredProducts.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Cambia la foto o el precio y presiona <strong>Guardar</strong> (también cuenta con guardado automático instantáneo en todos los celulares y páginas).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleGlobalSaveAllClick()}
                  disabled={isSavingAllNow}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>Guardar Todo</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAddProduct}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Nuevo Artículo</span>
                </button>
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4">Clave</th>
                      <th className="py-3 px-4">Precio (MXN)</th>
                      <th className="py-3 px-4">Tamaño</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4 text-right">Apartado de Guardar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((prod) => {
                      const currentDraftPrice = rowPriceDrafts[prod.id] ?? String(prod.price);
                      const isRowJustSaved = savedProductRowId === prod.id;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleTriggerProductPhotoUpload(prod)}
                              className="relative group/thumb w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center"
                              title="Haz clic para cambiar la foto de este producto"
                            >
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-contain"
                              />
                              <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <Camera className="w-4 h-4 text-white" />
                              </span>
                            </button>
                            <div>
                              <span>{prod.name}</span>
                              {prod.isStarProduct && (
                                <span className="ml-2 text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                                  Estrella
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{prod.clave}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={currentDraftPrice}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRowPriceDrafts((prev) => ({ ...prev, [prod.id]: val }));
                                  setEditingProductId(prod.id);
                                  setEditingPrice(val);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSavePrice(prod);
                                  }
                                }}
                                onBlur={() => {
                                  if (
                                    rowPriceDrafts[prod.id] !== undefined &&
                                    parseFloat(rowPriceDrafts[prod.id]) !== prod.price
                                  ) {
                                    handleSavePrice(prod);
                                  }
                                }}
                                className="w-20 px-2 py-1 border border-emerald-300 focus:border-emerald-600 rounded-lg text-xs font-bold bg-white text-slate-900 focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500">MXN</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">{prod.size}</td>
                          <td className="py-3.5 px-4 font-medium">{prod.category}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => handleTriggerProductPhotoUpload(prod)}
                                disabled={uploadingPhotoProductId === prod.id}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                                title="Subir o cambiar foto del producto"
                              >
                                {uploadingPhotoProductId === prod.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                ) : (
                                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                                )}
                                <span>Foto</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSavePrice(prod)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all ${
                                  isRowJustSaved
                                    ? 'bg-emerald-800 text-amber-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                                title="Guardar cambios de este producto en todos los celulares y páginas"
                              >
                                {isRowJustSaved ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                                    <span>¡Guardado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Guardar</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteProduct(prod.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Borrar artículo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No hay productos en catálogo coincidentes.
              </div>
            )}
          </div>
        )}
      </div>

      {previewPdf && (
        <PdfPreviewModal
          isOpen={Boolean(previewPdf)}
          onClose={() => setPreviewPdf(null)}
          pdf={previewPdf}
          products={products}
          isAdmin={true}
          initialMode={previewMode}
          onDownload={() => void handleDirectDownloadCatalog(previewPdf)}
          isDownloading={downloadingPdfId === previewPdf.id}
        />
      )}
    </div>
  );
};
