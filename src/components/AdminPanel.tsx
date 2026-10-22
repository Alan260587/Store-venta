import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  FileText,
  Package,
  Plus,
  Trash2,
  Lock,
  Search,
  Layers,
  RefreshCw,
  Sparkles,
  Upload,
  FolderUp,
  CheckCircle2,
  Loader2,
  KeyRound,
  Copy,
  Check,
  Edit3,
  Save,
  X,
  BookOpen,
  Download,
  Eye,
  MessageCircle,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { Product, PdfDocument, MultiUserPresence } from '../types';
import { countPdfPages } from '../utils/pdfParser';
import { pdfFileStore } from '../services/pdfFileStore';
import { dbStorage, generateRandomDownloadKey } from '../services/dbStorage';
import { auth, signInWithGoogleCloud } from '../firebase';
import { generateAdminManualPdf } from '../utils/generateManualPdf';
import { generateDownloadablePdf } from '../utils/generateCatalogPdf';

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
  onUpdatePdf: (pdf: PdfDocument) => void;
  onUpdateProduct: (product: Product) => void;
  onLockAdmin: () => void;
  onResetDefaults: () => void;
}

interface StagedInlinePdf {
  tempId: string;
  file: File;
  title: string;
  pagesCount: number;
  price: number;
  downloadKey: string;
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
  onLockAdmin,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'pdfs' | 'products' | 'manual'>('pdfs');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [isDownloadingManual, setIsDownloadingManual] = useState<boolean>(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  // Inline editing for existing PDFs in the table (Title & Download Key)
  const [editingPdfId, setEditingPdfId] = useState<string | null>(null);
  const [editingPdfTitle, setEditingPdfTitle] = useState<string>('');
  const [editingPdfKey, setEditingPdfKey] = useState<string>('');
  const [copiedPdfId, setCopiedPdfId] = useState<string | null>(null);

  // Direct inline upload & staging state in Admin Panel so titles can be modified before saving
  const [quickUploadPrice, setQuickUploadPrice] = useState<number>(20);
  const [stagedPdfs, setStagedPdfs] = useState<StagedInlinePdf[]>([]);
  const [isUploadingInline, setIsUploadingInline] = useState<boolean>(false);
  const [inlineUploadMsg, setInlineUploadMsg] = useState<string>('');

  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_PDF_LIMIT = 500;
  const pdfUsagePercent = Math.min(Math.round((pdfs.length / MAX_PDF_LIMIT) * 100), 100);

  const filteredPdfs = pdfs.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.downloadKey && p.downloadKey.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadManualPdf = async () => {
    setIsDownloadingManual(true);
    try {
      const blob = await generateAdminManualPdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Instructivo_Uso_App_Shelo_NABEL.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error('Error generating manual PDF:', e);
    } finally {
      setIsDownloadingManual(false);
    }
  };

  // Direct 1-click download for connected Admin (no download key required for $20 or Gratis PDFs)
  const handleDirectAdminDownloadPdf = async (pdf: PdfDocument) => {
    setDownloadingPdfId(pdf.id);
    try {
      const storedBlobUrl = await pdfFileStore.getFileUrl(pdf.id);
      if (storedBlobUrl) {
        const link = document.createElement('a');
        link.href = storedBlobUrl;
        link.download = `${pdf.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(storedBlobUrl), 10000);
        return;
      }

      const generatedBlob = await generateDownloadablePdf(pdf, products);
      const url = URL.createObjectURL(generatedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdf.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Error downloading PDF as admin:', err);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleSetPdfPrice = (pdf: PdfDocument, newPrice: number) => {
    onUpdatePdf({
      ...pdf,
      price: newPrice
    });
  };

  const handleStartEditPdf = (pdf: PdfDocument) => {
    setEditingPdfId(pdf.id);
    setEditingPdfTitle(pdf.title);
    setEditingPdfKey(pdf.downloadKey || 'SN-2026');
  };

  const handleSaveEditPdf = (pdf: PdfDocument) => {
    const cleanTitle = editingPdfTitle.trim() || pdf.title;
    const cleanKey = editingPdfKey.trim().toUpperCase() || pdf.downloadKey || 'SN-2026';
    onUpdatePdf({
      ...pdf,
      title: cleanTitle,
      downloadKey: cleanKey
    });
    setEditingPdfId(null);
    setInlineUploadMsg(
      Number(pdf.price) === 0
        ? `¡Se guardó el título "${cleanTitle}" (Gratis Sin Clave) en la página!`
        : `¡Se guardó el título "${cleanTitle}" y clave "${cleanKey}" ($20 MXN) en la página!`
    );
    setTimeout(() => setInlineUploadMsg(''), 4000);
  };

  const handleCopyDownloadKey = (pdf: PdfDocument) => {
    const key = pdf.downloadKey || 'SN-2026';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key);
      setCopiedPdfId(pdf.id);
      setTimeout(() => setCopiedPdfId(null), 2000);
    }
  };

  // Step 1: Prepare selected files so the admin can modify their titles before saving to the page
  const handleInlineFilesSelect = async (rawFiles: File[]) => {
    const files = rawFiles.slice(0, 10);
    if (files.length === 0) return;

    setIsUploadingInline(true);
    setInlineUploadMsg('');
    const prepared: StagedInlinePdf[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const { pagesCount, fileSizeFormatted } = await countPdfPages(file);
          const cleanTitle =
            file.name
              .replace(/\.pdf$/i, '')
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase()) || `Documento PDF ${stagedPdfs.length + i + 1}`;

          prepared.push({
            tempId: `staged-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`,
            file,
            title: cleanTitle,
            pagesCount,
            price: quickUploadPrice,
            downloadKey: generateRandomDownloadKey(),
            fileSizeFormatted
          });
        } catch {
          const cleanTitle = file.name.replace(/\.pdf$/i, '') || `Documento PDF ${stagedPdfs.length + i + 1}`;
          prepared.push({
            tempId: `staged-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`,
            file,
            title: cleanTitle,
            pagesCount: 1,
            price: quickUploadPrice,
            downloadKey: generateRandomDownloadKey(),
            fileSizeFormatted: '1.0 MB'
          });
        }
      }

      if (prepared.length > 0) {
        setStagedPdfs((prev) => [...prepared, ...prev]);
      }
    } finally {
      setIsUploadingInline(false);
    }
  };

  const handleUpdateStaged = (tempId: string, changes: Partial<StagedInlinePdf>) => {
    setStagedPdfs((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...changes } : item))
    );
  };

  // Save a single staged PDF immediately
  const handleSaveSingleStaged = (item: StagedInlinePdf) => {
    if (!onAddPdfDirect) return;
    const finalTitle = item.title.trim() || 'Documento PDF';
    const finalKey = (item.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();

    const res = onAddPdfDirect({
      title: finalTitle,
      description: `Documento PDF (${item.pagesCount} páginas detectadas automáticamente).`,
      pagesCount: item.pagesCount,
      price: Number(item.price) === 0 ? 0 : 20,
      downloadKey: finalKey,
      fileSize: item.fileSizeFormatted,
      category: 'Catálogo Oficial'
    });

    if (res.success && res.pdf) {
      const createdPdf = res.pdf;
      void pdfFileStore.saveFile(createdPdf.id, item.file);
      setStagedPdfs((prev) => prev.filter((p) => p.tempId !== item.tempId));
      setInlineUploadMsg(`¡PDF "${createdPdf.title}" guardado en la página (Clave: ${createdPdf.downloadKey})!`);
    }
  };

  // Step 2: Save all staged PDFs atomically to the page
  const handleSaveStagedPdfs = () => {
    if (stagedPdfs.length === 0) return;

    const payloads = stagedPdfs.map((item, idx) => {
      const finalTitle = item.title.trim() || `Documento PDF ${idx + 1}`;
      const finalKey = (item.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();
      return {
        title: finalTitle,
        description: `Documento PDF (${item.pagesCount} páginas detectadas automáticamente).`,
        pagesCount: item.pagesCount,
        price: Number(item.price) === 0 ? 0 : 20,
        downloadKey: finalKey,
        fileSize: item.fileSizeFormatted,
        category: 'Catálogo Oficial'
      };
    });

    if (onAddPdfsBatch) {
      const batchRes = onAddPdfsBatch(payloads);
      if (batchRes.success && batchRes.addedPdfs.length > 0) {
        batchRes.addedPdfs.forEach((savedPdf, index) => {
          const sourceFile = stagedPdfs[index]?.file;
          if (sourceFile) {
            void pdfFileStore.saveFile(savedPdf.id, sourceFile);
          }
        });
        const count = batchRes.addedPdfs.length;
        setStagedPdfs([]);
        setInlineUploadMsg(
          count === 1
            ? '¡1 PDF guardado con su título y clave de descarga en la página! Puedes subir más archivos.'
            : `¡Se guardaron los ${count} archivos PDF con sus títulos y claves en la página!`
        );
      }
      return;
    }

    if (!onAddPdfDirect) return;
    let savedCount = 0;
    for (let i = 0; i < payloads.length; i++) {
      const res = onAddPdfDirect(payloads[i]);
      if (res.success && res.pdf) {
        void pdfFileStore.saveFile(res.pdf.id, stagedPdfs[i].file);
        savedCount++;
      }
    }
    setStagedPdfs([]);
    if (savedCount > 0) {
      setInlineUploadMsg(`¡Se guardaron ${savedCount} PDF(s) en la página!`);
    }
  };

  const handleStartEditPrice = (product: Product) => {
    setEditingProductId(product.id);
    setEditingPrice(String(product.price));
  };

  const handleSavePrice = (product: Product) => {
    const num = parseFloat(editingPrice);
    if (!isNaN(num) && num > 0) {
      onUpdateProduct({
        ...product,
        price: num
      });
    }
    setEditingProductId(null);
  };

  const handleSyncAllDevicesNow = async () => {
    setIsSyncingCloud(true);
    try {
      await dbStorage.syncWithServer();
      if (!auth.currentUser) {
        const user = await signInWithGoogleCloud();
        if (user) {
          await dbStorage.syncAllToFirestoreCloud();
        }
      } else {
        await dbStorage.syncAllToFirestoreCloud();
      }
      setInlineUploadMsg(
        '¡Sincronización completa! Todos los productos y PDFs de tu Laptop, Celular Android e iOS están unificados en esta misma página y en Firebase.'
      );
      setTimeout(() => setInlineUploadMsg(''), 5000);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif font-bold text-2xl text-white">Panel de Administración Total</h2>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border border-amber-500/30">
                Clave **** Activa
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Multiusuario: {presence?.totalOnline || 1} en línea ({presence?.clientsOnline ?? 0} clientes normales)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sube de 1 a 10 PDFs a la vez, <strong>modifica sus títulos al guardar</strong>, consulta las <strong>Claves de Descarga</strong> y descarga el <strong>Instructivo en PDF</strong>. Todo se sincroniza en la misma página (Laptop, Celular e iOS) y tu sesión se cierra automáticamente al cerrar la página.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => void handleSyncAllDevicesNow()}
            disabled={isSyncingCloud}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Sincronizar todos los productos y PDFs de Laptop, Celular e iOS en la misma página y en Firebase"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Sincronizando...' : 'Sincronizar Nube (Laptop/Celular/iOS)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ver Instructivo</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadManualPdf}
            disabled={isDownloadingManual}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            {isDownloadingManual ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar Instructivo PDF</span>
          </button>

          <button
            type="button"
            onClick={onResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Restablecer base de datos inicial"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restablecer</span>
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

      {/* Direct Quick Upload Box inside Admin Panel */}
      <div className="bg-emerald-900 text-white rounded-3xl p-6 mb-8 shadow-lg border border-emerald-700">
        {/* Permanently mounted hidden file inputs so consecutive or multi-file selections never fail */}
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

        <input
          ref={batchFileInputRef}
          type="file"
          accept=".pdf,application/pdf,application/x-pdf,application/octet-stream"
          multiple
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
              <Upload className="w-3.5 h-3.5" />
              <span>Subida de PDFs (De 1 en 1 o hasta 10 archivos a la vez)</span>
            </div>
            <h3 className="font-serif font-bold text-lg sm:text-xl">
              Selecciona tus archivos PDF para modificar su título antes de guardarlos en la página:
            </h3>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs text-emerald-200 font-semibold">Precio inicial:</span>
              <button
                type="button"
                onClick={() => setQuickUploadPrice(0)}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  quickUploadPrice === 0
                    ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                    : 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gratis ($0 MXN)</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickUploadPrice(20)}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  quickUploadPrice === 20
                    ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                    : 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
                }`}
              >
                <span>$20 Pesos MXN</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => singleFileInputRef.current?.click()}
              className="cursor-pointer px-5 py-3.5 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>+ Subir 1 PDF</span>
            </button>

            <button
              type="button"
              onClick={() => batchFileInputRef.current?.click()}
              className="cursor-pointer px-5 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <FolderUp className="w-4 h-4 text-slate-950" />
              <span>+ Subir hasta 10 PDFs</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddPdf}
              className="px-4 py-3.5 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs rounded-2xl border border-emerald-600"
            >
              Abrir Ventana Completa
            </button>
          </div>
        </div>

        {isUploadingInline && (
          <div className="mt-4 px-4 py-3 bg-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-bold">
            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            <span>Preparando archivos PDF seleccionados...</span>
          </div>
        )}

        {/* Inline Staging Editor: Modify PDF Titles, Price & Download Key before saving! */}
        {stagedPdfs.length > 0 && (
          <div className="mt-6 bg-white text-slate-900 rounded-2xl p-5 border-2 border-amber-400 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Modifica el Título, Precio y Clave antes de Guardar ({stagedPdfs.length} {stagedPdfs.length === 1 ? 'PDF listo' : 'PDFs listos'}):
                </h4>
                <p className="text-xs text-slate-500">
                  Puedes seguir añadiendo más archivos con los botones de arriba o presionar <strong>"Guardar en la Página"</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStagedPdfs([])}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Limpiar lista
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {stagedPdfs.map((item, idx) => (
                <div
                  key={item.tempId}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                >
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                      Título del PDF #{idx + 1} (Modificable):
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateStaged(item.tempId, { title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border-2 border-emerald-500 bg-white font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-3">
                    {Number(item.price) > 0 ? (
                      <>
                        <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                          Clave Descarga ($20 • Control Admin):
                        </label>
                        <input
                          type="text"
                          value={item.downloadKey}
                          onChange={(e) => handleUpdateStaged(item.tempId, { downloadKey: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/50 font-mono font-bold text-xs text-slate-900 uppercase"
                        />
                      </>
                    ) : (
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                          Acceso Gratuito:
                        </span>
                        <div className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Sin Clave (Descarga Libre)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateStaged(item.tempId, { price: 0 })}
                      className={`flex-1 py-2 px-2 rounded-lg font-bold text-xs ${
                        Number(item.price) === 0
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      Gratis (Sin Clave)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStaged(item.tempId, { price: 20 })}
                      className={`flex-1 py-2 px-2 rounded-lg font-bold text-xs ${
                        Number(item.price) > 0
                          ? 'bg-slate-900 text-amber-300'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      $20 (Con Clave)
                    </button>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleSaveSingleStaged(item)}
                      className="px-2.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                      title="Guardar este PDF"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStagedPdfs(prev => prev.filter(p => p.tempId !== item.tempId))}
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
              onClick={handleSaveStagedPdfs}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-5 h-5 text-amber-300" />
              <span>
                Guardar {stagedPdfs.length === 1 ? 'este PDF' : `todos los ${stagedPdfs.length} PDFs`} con sus Títulos en la Página
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

      {/* Metrics Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* PDF Metric Widget with Progress Bar */}
        <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Almacenamiento PDF</h3>
                <p className="text-[11px] text-slate-500">Hasta 500 archivos</p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {pdfs.length} / {MAX_PDF_LIMIT}
            </span>
          </div>

          <div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${pdfUsagePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Product Catalog Metric Widget */}
        <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-900">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold font-mono text-slate-900">{products.length}</span>
              <h3 className="font-bold text-slate-800 text-xs">Artículos Activos</h3>
              <p className="text-[11px] text-slate-500">Sheló NABEL + Escolares</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar</span>
          </button>
        </div>

        {/* Instructivo Manual Download Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 border border-slate-700 shadow-sm flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 block">
              Guía Exclusiva Admin
            </span>
            <h3 className="font-bold text-sm text-white">Instructivo de la App en PDF</h3>
            <p className="text-[11px] text-slate-300">
              Vistas Admin/Cliente y mensajes
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadManualPdf}
            disabled={isDownloadingManual}
            className="px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 shrink-0 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
        </div>

      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setActiveTab('pdfs'); setSearchTerm(''); }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'pdfs'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Gestión de PDFs y Claves ($20) ({pdfs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('products'); setSearchTerm(''); }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'products'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Gestión de Productos ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'manual'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📘 Instructivo de Uso y Flujo (Descargar PDF)</span>
          </button>

          {activeTab !== 'manual' && (
            <div className="ml-auto relative hidden sm:block w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por título o clave..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
          )}
        </div>

        {/* Tab 1: PDF Management */}
        {activeTab === 'pdfs' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Control de PDFs: Gratis (Sin Clave) y $20 Pesos (Con Clave Controlada por Admin) ({filteredPdfs.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Los productos <strong>Gratis ($0) no ocupan clave de descarga</strong>. Los productos de <strong>$20 pesos tienen Clave de Descarga bajo tu control</strong>. Como Administrador conectado, puedes <strong>descargar tanto los de $20 pesos como los gratuitos sin necesidad de clave</strong>.
                </p>
              </div>
            </div>

            {filteredPdfs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                      <th className="py-3 px-4">Título del PDF (Modificable)</th>
                      <th className="py-3 px-4">Control de Clave (Solo en $20 MXN)</th>
                      <th className="py-3 px-4">Páginas</th>
                      <th className="py-3 px-4">Modalidad (Gratis o $20)</th>
                      <th className="py-3 px-4 text-right">Descarga Admin y Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPdfs.map((pdf) => {
                      const isFree = Number(pdf.price) === 0;
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
                                {isFree && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditPdf(pdf)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPdfId(null)}
                                      className="px-2 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px]"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div>
                                  <span>{pdf.title}</span>
                                  <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                                    {pdf.category || 'Catálogo'} • {pdf.fileSize || 'PDF'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPdf(pdf)}
                                  className="p-1 text-slate-400 hover:text-emerald-700 rounded hover:bg-emerald-50"
                                  title="Modificar título del PDF"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {isFree ? (
                              <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Sin Clave (Gratis • Descarga Libre)</span>
                              </div>
                            ) : isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingPdfKey}
                                  onChange={(e) => setEditingPdfKey(e.target.value.toUpperCase())}
                                  className="w-28 px-2.5 py-1.5 border-2 border-amber-400 rounded-lg font-mono text-xs font-bold uppercase"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditPdf(pdf)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPdfId(null)}
                                  className="px-2 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px]"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl">
                                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                                <span className="font-mono font-bold text-slate-900 tracking-wider">
                                  {pdf.downloadKey || 'SN-2026'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyDownloadKey(pdf)}
                                  className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1"
                                  title="Copiar clave para entregar al cliente de $20 pesos"
                                >
                                  {copiedPdfId === pdf.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-700">Copiada</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copiar</span>
                                    </>
                                  )}
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
                            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                              <button
                                type="button"
                                onClick={() => handleSetPdfPrice(pdf, 0)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                                  isFree
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-white'
                                }`}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Gratis (Sin Clave)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetPdfPrice(pdf, 20)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                  !isFree
                                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                                    : 'text-slate-600 hover:bg-white'
                                }`}
                              >
                                $20 (Con Clave)
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleDirectAdminDownloadPdf(pdf)}
                                disabled={downloadingPdfId === pdf.id}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                                title="Descargar directamente sin necesidad de clave (Modo Admin)"
                              >
                                {downloadingPdfId === pdf.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span>Descargar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditPdf(pdf)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 rounded hover:bg-emerald-50"
                                title={isFree ? 'Editar título' : 'Editar título y clave'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePdf(pdf.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Borrar PDF"
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
                No hay PDFs registrados que coincidan con el filtro.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Products Management */}
        {activeTab === 'products' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base">
                Listado de Productos en Catálogo ({filteredProducts.length})
              </h3>
              <button
                type="button"
                onClick={onOpenAddProduct}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nuevo Artículo</span>
              </button>
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
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-200 shrink-0"
                          />
                          <div>
                            <span>{prod.name}</span>
                            {prod.isStarProduct && (
                              <span className="ml-2 text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">Estrella</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{prod.clave}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                          {editingProductId === prod.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editingPrice}
                                onChange={(e) => setEditingPrice(e.target.value)}
                                className="w-16 px-1.5 py-0.5 border border-emerald-500 rounded text-xs"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePrice(prod)}
                                className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px]"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEditPrice(prod)}
                              className="hover:underline flex items-center gap-1 group/price"
                              title="Haz clic para editar precio"
                            >
                              <span>${prod.price} MXN</span>
                              <span className="opacity-0 group-hover/price:opacity-100 text-[10px] text-slate-400">✎</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{prod.size}</td>
                        <td className="py-3.5 px-4 font-medium">{prod.category}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(prod.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Borrar artículo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
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

        {/* Tab 3: INSTRUCTIVO COMPLETO DE USO Y FUNCIONAMIENTO (CON DESCARGA PDF) */}
        {activeTab === 'manual' && (
          <div className="p-6 sm:p-8 space-y-8 bg-slate-50/40">
            
            {/* Top Banner inside Manual Tab with PDF Download Button */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-bold uppercase">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Instructivo Oficial para el Administrador</span>
                </div>
                <h3 className="font-serif font-bold text-xl sm:text-2xl">
                  Manual de Funcionamiento: Vistas y Mensajes de la App
                </h3>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  Consulta aquí cómo se usa la aplicación paso a paso, qué elementos ve únicamente el Administrador, qué ve el Cliente, y exactamente qué mensajes recibe cada uno en WhatsApp y al descargar un PDF.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadManualPdf}
                disabled={isDownloadingManual}
                className="px-5 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-2 shrink-0 transition-all active:scale-95"
              >
                {isDownloadingManual ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>Descargar Instructivo en PDF</span>
              </button>
            </div>

            {/* PART 1: LO QUE VE EL ADMINISTRADOR VS LO QUE VE EL CLIENTE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Lo que ve el ADMINISTRADOR */}
              <div className="bg-white rounded-2xl p-6 border-2 border-amber-300 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-amber-100 pb-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                      Con Clave Secreta (****) Activa
                    </span>
                    <h4 className="font-serif font-bold text-lg text-slate-900">
                      1. Lo que ve y controla el ADMINISTRADOR
                    </h4>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <Download className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Descarga Directa Sin Clave cuando estás Conectado:</strong> Como Administrador conectado, <strong>no necesitas clave de descarga</strong>; puedes descargar con un solo clic tanto los productos de <strong>$20 pesos</strong> como los <strong>gratuitos ($0)</strong>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Control de Clave en Productos de $20 Pesos:</strong> Únicamente los PDFs de <strong>$20 pesos</strong> tienen la opción de <strong>Clave de Descarga</strong> controlada por el Administrador (ej. <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900">SN-1012</code>) con botón para copiarla o editarla. Los productos <strong>Gratuitos ($0) no ocupan clave</strong>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Edit3 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Control Total de Modalidad (Gratis o $20):</strong> El Administrador puede cambiar cualquier PDF en cualquier momento entre <strong>Gratis (Sin Clave)</strong> y <strong>$20 pesos (Con Clave)</strong>, así como modificar su título.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Package className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Edición del Catálogo de Productos:</strong> En cada producto ve el botón de <strong>cámara (📷)</strong> para cambiar la foto desde su galería, lápiz (✎) para editar el precio y bote de basura para eliminar, además de poder agregar nuevos artículos.
                    </div>
                  </li>
                </ul>
              </div>

              {/* Lo que ve el CLIENTE */}
              <div className="bg-white rounded-2xl p-6 border-2 border-emerald-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-emerald-100 pb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Vista Pública de la Tienda
                    </span>
                    <h4 className="font-serif font-bold text-lg text-slate-900">
                      2. Lo que ve el CLIENTE
                    </h4>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Catálogo de Productos y Colores:</strong> Ve todos los productos Sheló NABEL y los útiles escolares: <strong>Folders Escolares ($25)</strong> con selector para elegir color (<em>Morado, Amarillo, Naranja o Azul</em>), <strong>Tijeras Westcott ($35)</strong> y <strong>Crayones Crayola 24 ($40)</strong>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Productos Gratuitos ($0 MXN) Sin Clave:</strong> En los PDFs gratuitos, el cliente ve el botón <strong>"Descargar PDF Gratis (Sin Clave)"</strong> y descarga el archivo directamente sin que le pida clave.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Productos de $20 Pesos Con Clave:</strong> En los PDFs de $20 MXN, el cliente NO ve la clave en pantalla; cuando presiona <strong>"Descargar PDF (Ingresar Clave de Descarga)"</strong>, se le abre el recuadro para escribir la clave que le entrega el Administrador tras su compra.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Clave de Admin Oculta con Asteriscos:</strong> Si el cliente abre "Área Admin", únicamente ve <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">Clave requerida: ****</code> sin revelar jamás la contraseña.
                    </div>
                  </li>
                </ul>
              </div>

            </div>

            {/* PART 2: LO QUE LE LLEGA AL ADMINISTRADOR Y LO QUE LE LLEGA AL CLIENTE */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2.5 rounded-xl bg-teal-100 text-teal-900">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-lg text-slate-900">
                    3. Lo que le llega al Administrador y lo que le llega al Cliente
                  </h4>
                  <p className="text-xs text-slate-500">
                    Así funcionan los mensajes reales en WhatsApp (+52 662 139 5110) y la entrega de Claves de Descarga en productos de $20 pesos:
                  </p>
                </div>
              </div>

              {/* Caso 1: Descarga de PDF de $20 MXN con Clave */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                  Caso A: Cuando un Cliente compra un PDF de $20 MXN (Con Clave controlada por Admin)
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Paso 1 */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                      <span>Paso 1: Lo que le llega al Administrador</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-xs text-slate-600">
                      El cliente pulsa "Comprar descarga por $20 MXN" y <strong>al Administrador le llega a su WhatsApp (+52 662 139 5110)</strong> este mensaje:
                    </p>
                    <div className="p-3 rounded-lg bg-emerald-950 text-emerald-100 font-mono text-[11px] leading-relaxed">
                      "Hola, quiero comprar la descarga del PDF: 'Lista de Precios Mayoreo y Ganancias 2026' por $20 pesos para recibir mi clave de descarga."
                    </div>
                  </div>

                  {/* Paso 2 */}
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <span className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1">
                      <span>Paso 2: Lo que le llega al Cliente</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-xs text-slate-600">
                      El Administrador mira la <strong>Clave de Descarga ($20 MXN)</strong> en el PDF (ej. <code className="font-bold">SN-1012</code>), la copia y <strong>le envía al Cliente</strong>:
                    </p>
                    <div className="p-3 rounded-lg bg-white border border-amber-300 text-slate-800 font-mono text-[11px] leading-relaxed">
                      "¡Hola! Gracias por tu compra. Tu Clave de Descarga para el PDF es: <strong>SN-1012</strong>. Ingrésala en la página para descargarlo."
                    </div>
                  </div>

                  {/* Paso 3 */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Paso 3: Descarga del Archivo al Cliente</span>
                    </span>
                    <p className="text-xs text-slate-600">
                      El Cliente presiona <strong>"Descargar PDF (Ingresar Clave de Descarga)"</strong>, escribe <code className="font-bold">SN-1012</code> y <strong>al Cliente le llega inmediatamente el archivo PDF descargado</strong>. (En los PDFs Gratuitos de $0, la descarga es directa sin clave).
                    </p>
                    <div className="p-2.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] text-center">
                      ✓ ¡Clave verificada! Descargando PDF...
                    </div>
                  </div>
                </div>
              </div>

              {/* Caso 2: Compra de Productos */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h5 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg inline-block">
                  Caso B: Cuando un Cliente compra Artículos del Catálogo desde el Carrito
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase block">
                      Lo que le llega al Administrador en WhatsApp (+52 662 139 5110):
                    </span>
                    <div className="p-3 rounded-lg bg-emerald-950 text-emerald-100 font-mono text-[11px] leading-relaxed whitespace-pre-line">
                      {`Hola, me gustaría comprar los siguientes artículos de Shelo NABEL:
- 2x Baba de Caracol Crema Facial (Clave S1701) - $298 MXN
- 2x Folders Escolares (Color: Azul) (Clave ESC-01) - $50 MXN
- 1x Tijeras Westcott (Clave ESC-02) - $35 MXN
- 1x Crayones Crayola 24 (Clave ESC-03) - $40 MXN
Total: $423 MXN`}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 uppercase block mb-1">
                        Lo que recibe el Cliente:
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        El Cliente ve su resumen completo con cantidades, colores elegidos (en el caso de los Folders Escolares) y el total exacto en pesos mexicanos (MXN), y recibe la atención directa del Administrador en su chat de WhatsApp para coordinar la entrega.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadManualPdf}
                      disabled={isDownloadingManual}
                      className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar este Instructivo Completo en PDF</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
