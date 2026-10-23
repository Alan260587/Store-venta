import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Save,
  Upload
} from 'lucide-react';
import { countPdfPages } from '../utils/pdfParser';
import { pdfFileStore } from '../services/pdfFileStore';
import { PdfDocument } from '../types';

interface AddPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPdfsCount: number;
  onAddPdf: (pdfData: Omit<PdfDocument, 'id' | 'uploadedAt'>) => { success: boolean; message: string; pdf?: PdfDocument };
  onAddPdfsBatch?: (pdfList: Array<Omit<PdfDocument, 'id' | 'uploadedAt'>>) => { success: boolean; message: string; addedPdfs: PdfDocument[] };
  onUpdatePdf?: (pdf: PdfDocument) => void;
}

interface PendingCatalogItem {
  tempId: string;
  file?: File;
  title: string;
  description: string;
  pagesCount: number;
  fileSizeFormatted: string;
}

export const AddPdfModal: React.FC<AddPdfModalProps> = ({
  isOpen,
  onClose,
  onAddPdf,
  onAddPdfsBatch
}) => {
  const [pendingItems, setPendingItems] = useState<PendingCatalogItem[]>([]);
  const [recentlySaved, setRecentlySaved] = useState<PdfDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string>('');
  const [globalSuccess, setGlobalSuccess] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const singleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setGlobalError('');
      setGlobalSuccess('');
      setRecentlySaved([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFilesSelected = async (rawFiles: File[]) => {
    setGlobalError('');
    setGlobalSuccess('');

    if (!rawFiles || rawFiles.length === 0) return;

    setIsProcessing(true);
    const prepared: PendingCatalogItem[] = [];

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
            tempId: `pending-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`,
            file,
            title: cleanTitle,
            description: `Catálogo Oficial Sheló NABEL (${pagesCount} páginas • Vista previa de 5 páginas y descarga 100% gratis).`,
            pagesCount,
            fileSizeFormatted
          });
        } catch {
          const cleanTitle = file.name.replace(/\.pdf$/i, '') || 'Catálogo Oficial Sheló NABEL';
          prepared.push({
            tempId: `pending-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`,
            file,
            title: cleanTitle,
            description: 'Catálogo Oficial Sheló NABEL (Vista previa de 5 páginas y descarga 100% gratis).',
            pagesCount: 1,
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

  const handleUpdatePending = (tempId: string, changes: Partial<PendingCatalogItem>) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...changes } : item))
    );
  };

  const handleRemovePending = (tempId: string) => {
    setPendingItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleSaveAllToPage = async () => {
    setGlobalError('');
    setGlobalSuccess('');

    if (pendingItems.length === 0) {
      setGlobalError('Primero selecciona el archivo de tu Catálogo arriba.');
      return;
    }

    const currentPending = [...pendingItems];
    const payloads = currentPending.map((item) => {
      const finalPages = Math.max(1, Math.min(2000, Number(item.pagesCount) || 1));
      const finalTitle = item.title.trim() || 'Catálogo Oficial Sheló NABEL';

      return {
        title: finalTitle,
        description:
          item.description ||
          `Catálogo Oficial Sheló NABEL (${finalPages} páginas • Vista previa de 5 páginas y descarga gratis).`,
        pagesCount: finalPages,
        price: 0,
        downloadKey: 'GRATIS',
        fileSize: item.fileSizeFormatted,
        category: 'Catálogo Oficial'
      };
    });

    if (onAddPdfsBatch) {
      const batchResult = onAddPdfsBatch(payloads);
      if (batchResult.success && batchResult.addedPdfs.length > 0) {
        setRecentlySaved((prev) => [...batchResult.addedPdfs, ...prev]);
        setPendingItems([]);
        setGlobalSuccess(
          '¡Catálogo guardado con éxito! Ya está disponible con su Vista Previa de 5 Páginas y Descarga 100% Gratis en todos los dispositivos.'
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
        '¡Catálogo guardado con éxito! Ya está disponible con Vista Previa de 5 Páginas y Descarga Gratis.'
      );
      await Promise.allSettled(uploadPromises);
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
          <img
            src={`${import.meta.env.BASE_URL}assets/aistudio/shelon_logo_182b5079.jpeg`}
            alt="Sheló NABEL"
            className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0 bg-white"
          />
          <div>
            <h3 className="font-serif font-bold text-xl text-slate-900">
              Subir Catálogo Oficial para Descargar Gratis
            </h3>
            <p className="text-xs text-slate-500">
              Sube tu catálogo para que todos los visitantes puedan ver el{' '}
              <strong>preview de 5 páginas</strong> y <strong>descargarlo completo 100% gratis</strong>.
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
              Ver Catálogo en la Página
            </button>
          </div>
        )}

        {/* Free & 5-Page Preview Badge */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-emerald-950">
              Modalidad automática: <strong>Vista Previa de 5 Páginas + Descarga Completa 100% Gratis</strong>
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold shrink-0">
            GRATIS
          </span>
        </div>

        {/* File Picker */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const copiedFiles = Array.from(e.dataTransfer.files);
              void handleFilesSelected(copiedFiles);
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all mb-5 ${
            isDragging ? 'border-emerald-500 bg-emerald-100/60' : 'border-emerald-300 bg-emerald-50/40'
          }`}
        >
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Selecciona el archivo de tu Catálogo Oficial:
          </p>

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

          <button
            type="button"
            onClick={() => singleInputRef.current?.click()}
            className="cursor-pointer w-full py-4 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1 active:scale-98"
          >
            <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
              <Upload className="w-5 h-5 text-amber-300" />
              <span>Seleccionar Archivo del Catálogo</span>
            </div>
            <span className="text-[11px] text-emerald-100">
              Se generará automáticamente su Vista Previa de 5 Páginas y Descarga Gratis
            </span>
          </button>

          {isProcessing && (
            <div className="mt-3 py-2 flex items-center justify-center gap-2 text-emerald-800 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Preparando catálogo y detectando páginas...</span>
            </div>
          )}
        </div>

        {/* Pending Catalog Item to Save */}
        {pendingItems.length > 0 && (
          <div className="mb-6 bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Confirma el Nombre del Catálogo antes de Guardar:
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPendingItems([])}
                className="text-xs text-red-600 hover:underline font-semibold shrink-0"
              >
                Quitar
              </button>
            </div>

            <div className="space-y-3">
              {pendingItems.map((item) => (
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

                  <div className="pr-6">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                      Nombre del Catálogo:
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdatePending(item.tempId, { title: e.target.value })}
                      placeholder="Ej. Catálogo Oficial Sheló NABEL 2026"
                      className="w-full px-3 py-2 rounded-lg border-2 border-emerald-400 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-700">
                        {item.pagesCount} páginas totales ({item.fileSizeFormatted})
                      </span>
                    </div>

                    <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
                      Vista Previa 5 Págs • Descarga 100% Gratis
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleSaveAllToPage()}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <Save className="w-5 h-5 text-amber-300" />
              <span>
                Guardar Catálogo Oficial Gratis (Con Preview de 5 Páginas)
              </span>
            </button>
          </div>
        )}

        {/* Recently Saved Catalog in this session */}
        {recentlySaved.length > 0 && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Catálogo publicado en la página:</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {recentlySaved.map((pdf) => (
                <div
                  key={pdf.id}
                  className="bg-white px-3 py-2 rounded-xl border border-emerald-200 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-800 truncate">{pdf.title}</span>
                  <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded font-bold">
                    Preview 5 Págs • Gratis
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
