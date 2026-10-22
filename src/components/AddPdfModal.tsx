import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FolderUp,
  Sparkles,
  KeyRound,
  Save,
  Plus
} from 'lucide-react';
import { countPdfPages } from '../utils/pdfParser';
import { pdfFileStore } from '../services/pdfFileStore';
import { generateRandomDownloadKey } from '../services/dbStorage';
import { PdfDocument } from '../types';

interface AddPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPdfsCount: number;
  onAddPdf: (pdfData: Omit<PdfDocument, 'id' | 'uploadedAt'>) => { success: boolean; message: string; pdf?: PdfDocument };
  onAddPdfsBatch?: (pdfList: Array<Omit<PdfDocument, 'id' | 'uploadedAt'>>) => { success: boolean; message: string; addedPdfs: PdfDocument[] };
  onUpdatePdf?: (pdf: PdfDocument) => void;
}

interface PendingPdfItem {
  tempId: string;
  file?: File;
  title: string;
  description: string;
  category: string;
  pagesCount: number;
  price: number; // 0 for Gratis or 20 for $20 pesos
  downloadKey: string;
  fileSizeFormatted: string;
}

export const AddPdfModal: React.FC<AddPdfModalProps> = ({
  isOpen,
  onClose,
  currentPdfsCount,
  onAddPdf,
  onAddPdfsBatch,
}) => {
  const [defaultPrice, setDefaultPrice] = useState<number>(20);
  const [defaultCategory, setDefaultCategory] = useState<string>('Catálogo Oficial');

  // Pending items ready for the admin to modify title, price, and downloadKey before saving
  const [pendingItems, setPendingItems] = useState<PendingPdfItem[]>([]);
  const [recentlySaved, setRecentlySaved] = useState<PdfDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string>('');
  const [globalSuccess, setGlobalSuccess] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Manual form state
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualPages, setManualPages] = useState<string>('148');
  const [manualPrice, setManualPrice] = useState<number>(20);
  const [manualKey, setManualKey] = useState<string>(() => generateRandomDownloadKey());

  const singleInputRef = useRef<HTMLInputElement | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null);

  // Reset transient state when modal opens so it never stays stuck
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setGlobalError('');
      setGlobalSuccess('');
      setRecentlySaved([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const MAX_BATCH_LIMIT = 10;
  const MAX_TOTAL_LIMIT = 500;

  // Step 1: Load selected files into the staging list so the admin can modify titles before saving
  const handleFilesSelected = async (rawFiles: File[]) => {
    setGlobalError('');
    setGlobalSuccess('');

    if (!rawFiles || rawFiles.length === 0) return;

    let files = rawFiles;
    if (files.length > MAX_BATCH_LIMIT) {
      files = files.slice(0, MAX_BATCH_LIMIT);
      setGlobalError(`Nota: Se cargaron los primeros ${MAX_BATCH_LIMIT} archivos (máximo ${MAX_BATCH_LIMIT} por tanda).`);
    }

    if (currentPdfsCount + pendingItems.length + files.length > MAX_TOTAL_LIMIT) {
      setGlobalError(`Excede el límite máximo de ${MAX_TOTAL_LIMIT} PDFs en la base de datos.`);
      return;
    }

    setIsProcessing(true);
    const prepared: PendingPdfItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const { pagesCount, fileSizeFormatted } = await countPdfPages(file);
          const cleanTitle =
            file.name
              .replace(/\.pdf$/i, '')
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase()) || `Documento PDF ${pendingItems.length + i + 1}`;

          prepared.push({
            tempId: `pending-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`,
            file,
            title: cleanTitle,
            description: `Documento PDF (${pagesCount} páginas detectadas automáticamente).`,
            category: defaultCategory,
            pagesCount,
            price: defaultPrice,
            downloadKey: generateRandomDownloadKey(),
            fileSizeFormatted
          });
        } catch {
          const cleanTitle = file.name.replace(/\.pdf$/i, '') || `Documento PDF ${pendingItems.length + i + 1}`;
          prepared.push({
            tempId: `pending-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`,
            file,
            title: cleanTitle,
            description: 'Documento PDF oficial.',
            category: defaultCategory,
            pagesCount: 1,
            price: defaultPrice,
            downloadKey: generateRandomDownloadKey(),
            fileSizeFormatted: '1.0 MB'
          });
        }
      }

      if (prepared.length > 0) {
        setPendingItems((prev) => [...prepared, ...prev]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePending = (tempId: string, changes: Partial<PendingPdfItem>) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...changes } : item))
    );
  };

  const handleRemovePending = (tempId: string) => {
    setPendingItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Save a single pending item immediately to Page, Firebase, and Cloud Server
  const handleSaveSinglePending = async (item: PendingPdfItem) => {
    setGlobalError('');
    setGlobalSuccess('');

    const finalTitle = item.title.trim() || 'Documento PDF';
    const finalPages = Math.max(1, Math.min(1500, Number(item.pagesCount) || 1));
    const finalKey = (item.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();

    const result = onAddPdf({
      title: finalTitle,
      description: item.description || `Catálogo / Documento PDF (${finalPages} páginas).`,
      pagesCount: finalPages,
      price: Number(item.price) === 0 ? 0 : 20,
      downloadKey: finalKey,
      fileSize: item.fileSizeFormatted,
      category: item.category
    });

    if (result.success && result.pdf) {
      const createdPdf = result.pdf;
      setPendingItems((prev) => prev.filter((p) => p.tempId !== item.tempId));
      setRecentlySaved((prev) => [createdPdf, ...prev]);
      setGlobalSuccess(
        `¡PDF "${createdPdf.title}" guardado y subido automáticamente a la Página, a Firebase y a la Nube (Laptop, Android, iOS y Tablet)!`
      );
      if (item.file) {
        await pdfFileStore.saveFile(createdPdf.id, item.file);
      }
    } else {
      setGlobalError(result.message);
    }
  };

  // Step 2: Save ALL pending items atomically to the Page, Firebase, and Cloud Server on clicking Guardar!
  const handleSaveAllToPage = async () => {
    setGlobalError('');
    setGlobalSuccess('');

    if (pendingItems.length === 0) {
      setGlobalError('Primero selecciona al menos 1 archivo PDF arriba.');
      return;
    }

    const currentPending = [...pendingItems];
    const payloads = currentPending.map((item, idx) => {
      const finalPages = Math.max(1, Math.min(1500, Number(item.pagesCount) || 1));
      const finalTitle = item.title.trim() || `Documento PDF ${idx + 1}`;
      const finalKey = (item.downloadKey || generateRandomDownloadKey()).trim().toUpperCase();

      return {
        title: finalTitle,
        description: item.description || `Catálogo / Documento PDF (${finalPages} páginas).`,
        pagesCount: finalPages,
        price: Number(item.price) === 0 ? 0 : 20,
        downloadKey: finalKey,
        fileSize: item.fileSizeFormatted,
        category: item.category
      };
    });

    if (onAddPdfsBatch) {
      const batchResult = onAddPdfsBatch(payloads);
      if (batchResult.success && batchResult.addedPdfs.length > 0) {
        setRecentlySaved((prev) => [...batchResult.addedPdfs, ...prev]);
        setPendingItems([]);
        setGlobalSuccess(
          batchResult.addedPdfs.length === 1
            ? '¡1 PDF guardado y subido automáticamente a la Página, a Firebase y a la Nube (Laptop, Android, iOS y Tablet)!'
            : `¡${batchResult.addedPdfs.length} PDFs guardados y subidos automáticamente a la Página, a Firebase y a la Nube (Laptop, Android, iOS y Tablet)!`
        );
        await Promise.allSettled(
          batchResult.addedPdfs.map((savedPdf, index) => {
            const sourceFile = currentPending[index]?.file;
            return sourceFile ? pdfFileStore.saveFile(savedPdf.id, sourceFile) : Promise.resolve();
          })
        );
      } else {
        setGlobalError(batchResult.message);
      }
      return;
    }

    // Fallback sequential save
    const newlySaved: PdfDocument[] = [];
    const uploadPromises: Array<Promise<void>> = [];
    for (let i = 0; i < payloads.length; i++) {
      const res = onAddPdf(payloads[i]);
      if (res.success && res.pdf) {
        newlySaved.push(res.pdf);
        const f = currentPending[i]?.file;
        if (f) {
          uploadPromises.push(pdfFileStore.saveFile(res.pdf.id, f));
        }
      }
    }

    if (newlySaved.length > 0) {
      setRecentlySaved((prev) => [...newlySaved, ...prev]);
      setPendingItems([]);
      setGlobalSuccess(
        `¡${newlySaved.length} PDF(s) guardados y subidos automáticamente a la Página, a Firebase y a la Nube!`
      );
      await Promise.allSettled(uploadPromises);
    }
  };

  // Manual addition
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    if (!manualTitle.trim()) {
      setGlobalError('Ingresa el título del PDF.');
      return;
    }

    const pagesNum = Math.max(1, Math.min(1500, parseInt(manualPages, 10) || 1));
    const cleanKey = (manualKey || generateRandomDownloadKey()).trim().toUpperCase();

    const result = onAddPdf({
      title: manualTitle.trim(),
      description: `Catálogo / Documento PDF (${pagesNum} páginas).`,
      pagesCount: pagesNum,
      price: manualPrice,
      downloadKey: cleanKey,
      fileSize: `${(pagesNum * 0.25).toFixed(1)} MB`,
      category: defaultCategory
    });

    if (result.success && result.pdf) {
      setRecentlySaved((prev) => [result.pdf!, ...prev]);
      setGlobalSuccess(`¡PDF "${result.pdf.title}" guardado en la página con Clave: ${result.pdf.downloadKey}!`);
      setManualTitle('');
      setManualKey(generateRandomDownloadKey());
    } else {
      setGlobalError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-emerald-100 z-10 my-8 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-xl text-slate-900">Subir y Configurar Archivos PDF</h3>
            <p className="text-xs text-slate-500">
              Sube tus PDFs de <strong>1 en 1</strong> o <strong>hasta 10 a la vez</strong>, modifica su título, elige <strong>Gratis ($0) o $20 pesos</strong> y guárdalos en la página.
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {globalError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-medium">{globalError}</span>
          </div>
        )}

        {globalSuccess && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span className="font-bold">{globalSuccess}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] shrink-0"
            >
              Ver en la Página
            </button>
          </div>
        )}

        {/* STEP 1: Default Price & Category */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1.5">
                1. Precio inicial para los archivos a seleccionar:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDefaultPrice(0)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                    defaultPrice === 0
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gratis ($0 MXN)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultPrice(20)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                    defaultPrice === 20
                      ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>$20 Pesos MXN</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1.5">
                Categoría del Documento:
              </label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Catálogo Oficial">Catálogo Oficial</option>
                <option value="Precios y Negocio">Precios y Negocio</option>
                <option value="Guía de Salud">Guía de Salud</option>
                <option value="Afiliación">Afiliación</option>
                <option value="Temporada">Temporada</option>
              </select>
            </div>
          </div>
        </div>

        {/* STEP 2: Native File Picker Buttons (Inputs stay permanently mounted so multiple/sequential selections never fail) */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const copiedFiles = Array.from(e.dataTransfer.files);
              void handleFilesSelected(copiedFiles);
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all mb-5 ${
            isDragging ? 'border-emerald-500 bg-emerald-100/60' : 'border-emerald-300 bg-emerald-50/40'
          }`}
        >
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            2. Selecciona tus archivos PDF (puedes agregar varios seguidos):
          </p>

          {/* Hidden permanent file inputs */}
          <input
            ref={singleInputRef}
            type="file"
            accept=".pdf,application/pdf,application/x-pdf,application/octet-stream"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const copied = Array.from(e.target.files);
                e.target.value = '';
                void handleFilesSelected(copied);
              }
            }}
            className="hidden"
          />

          <input
            ref={batchInputRef}
            type="file"
            accept=".pdf,application/pdf,application/x-pdf,application/octet-stream"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const copied = Array.from(e.target.files);
                e.target.value = '';
                void handleFilesSelected(copied);
              }
            }}
            className="hidden"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => singleInputRef.current?.click()}
              className="cursor-pointer py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1 active:scale-98"
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileText className="w-5 h-5 text-amber-300" />
                <span>+ Seleccionar 1 PDF (De 1 en 1)</span>
              </div>
              <span className="text-[11px] text-emerald-100">
                Haz clic aquí para añadir otro PDF
              </span>
            </button>

            <button
              type="button"
              onClick={() => batchInputRef.current?.click()}
              className="cursor-pointer py-3.5 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1 active:scale-98"
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <FolderUp className="w-5 h-5 text-amber-300" />
                <span>+ Seleccionar hasta 10 PDFs</span>
              </div>
              <span className="text-[11px] text-teal-100">
                Subida múltiple por lote a la vez
              </span>
            </button>
          </div>

          {isProcessing && (
            <div className="mt-3 py-2 flex items-center justify-center gap-2 text-emerald-800 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Procesando archivo(s) PDF...</span>
            </div>
          )}
        </div>

        {/* STEP 3: Staging Area — Modify Title, Price, and Download Key before saving to page! */}
        {pendingItems.length > 0 && (
          <div className="mb-6 bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Modifica el Título, Precio y Clave antes de Guardar ({pendingItems.length} {pendingItems.length === 1 ? 'archivo listo' : 'archivos listos'}):
                </h4>
                <p className="text-[11px] text-slate-600">
                  Puedes seguir agregando más PDFs con los botones de arriba o presionar <strong>"Guardar en la Página"</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingItems([])}
                className="text-xs text-red-600 hover:underline font-semibold shrink-0"
              >
                Limpiar lista
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {pendingItems.map((item, idx) => {
                const isFree = Number(item.price) === 0;
                return (
                  <div
                    key={item.tempId}
                    className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-3 text-xs relative"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemovePending(item.tempId)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-red-600 p-1"
                      title="Quitar archivo"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pr-6">
                      <div className="sm:col-span-7">
                        <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                          Título del PDF #{idx + 1} (Modificable):
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdatePending(item.tempId, { title: e.target.value })}
                          placeholder="Escribe el título del PDF..."
                          className="w-full px-3 py-2 rounded-lg border-2 border-emerald-400 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        {!isFree ? (
                          <>
                            <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1 flex items-center gap-1">
                              <KeyRound className="w-3 h-3" />
                              <span>Clave de Descarga ($20 • Control Admin):</span>
                            </label>
                            <input
                              type="text"
                              value={item.downloadKey}
                              onChange={(e) => handleUpdatePending(item.tempId, { downloadKey: e.target.value.toUpperCase() })}
                              className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/50 font-mono font-bold text-slate-900 uppercase text-xs sm:text-sm"
                            />
                          </>
                        ) : (
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                              Acceso Producto Gratuito:
                            </span>
                            <div className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Descarga Libre (No ocupa clave)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600">Páginas:</span>
                        <input
                          type="number"
                          min="1"
                          max="1500"
                          value={item.pagesCount}
                          onChange={(e) => handleUpdatePending(item.tempId, { pagesCount: parseInt(e.target.value, 10) || 1 })}
                          className="w-20 px-2 py-1 rounded border border-slate-200 font-mono font-bold text-emerald-800 text-xs"
                        />
                        <span className="text-[11px] text-slate-400">({item.fileSizeFormatted})</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-600 mr-1">Modalidad:</span>
                        <button
                          type="button"
                          onClick={() => handleUpdatePending(item.tempId, { price: 0 })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                            isFree
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'
                          }`}
                        >
                          Gratis (Sin Clave)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdatePending(item.tempId, { price: 20 })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                            !isFree
                              ? 'bg-slate-900 text-amber-300 shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          $20 pesos (Con Clave)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveSinglePending(item)}
                          className="ml-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar éste</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void handleSaveAllToPage()}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <Save className="w-5 h-5 text-amber-300" />
              <span>
                Guardar {pendingItems.length === 1 ? 'este PDF' : `todos los ${pendingItems.length} PDFs`} (Sube Automático a la Página, Firebase y Nube)
              </span>
            </button>
          </div>
        )}

        {/* Recently Saved PDFs in this session */}
        {recentlySaved.length > 0 && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>PDFs guardados en la página en esta sesión ({recentlySaved.length}):</span>
              </span>
              <button
                type="button"
                onClick={() => singleInputRef.current?.click()}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subir otro PDF</span>
              </button>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {recentlySaved.map((pdf) => {
                const isFreeSaved = Number(pdf.price) === 0;
                return (
                  <div
                    key={pdf.id}
                    className="bg-white px-3 py-2 rounded-xl border border-emerald-200 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-800 truncate">{pdf.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isFreeSaved ? (
                        <span className="font-mono text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                          Clave: {pdf.downloadKey}
                        </span>
                      ) : (
                        <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          Sin Clave (Descarga Libre)
                        </span>
                      )}
                      <span className="font-bold text-emerald-700">
                        {isFreeSaved ? 'Gratis ($0)' : '$20 MXN'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional Manual Registration */}
        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            O registra un PDF manualmente escribiendo su título y modalidad:
          </h4>
          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Título del PDF</label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Ej. Catálogo Sheló Verano"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Páginas</label>
              <input
                type="number"
                min="1"
                max="1500"
                value={manualPages}
                onChange={(e) => setManualPages(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Modalidad</label>
              <select
                value={manualPrice}
                onChange={(e) => setManualPrice(Number(e.target.value))}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
              >
                <option value={0}>Gratis (Sin Clave)</option>
                <option value={20}>$20 pesos (Con Clave)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              {manualPrice > 0 ? (
                <>
                  <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Clave ($20)</label>
                  <input
                    type="text"
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-2 rounded-xl border border-amber-300 bg-amber-50/40 text-xs font-mono font-bold uppercase"
                  />
                </>
              ) : (
                <div className="px-2.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-bold text-center">
                  Sin Clave
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
