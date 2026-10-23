import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  MessageCircle,
  BookOpen,
  Layers,
  CheckCircle2,
  Sparkles,
  Trash2,
  Loader2,
  Edit3,
  Unlock,
  Upload,
  Eye,
  Maximize2
} from 'lucide-react';
import { PdfDocument, Product } from '../types';
import { pdfFileStore } from '../services/pdfFileStore';
import {
  generateDownloadablePdf,
  fetchOfficialCatalogFullBlob,
  isValidPdfHeader
} from '../utils/generateCatalogPdf';
import { countPdfPages } from '../utils/pdfParser';
import { OFFICIAL_CATALOG_ID } from '../data/initialPdfs';
import { SHELO_LOGO_URL } from './Navbar';
import { PdfPreviewModal } from './PdfPreviewModal';

interface PdfCardProps {
  pdf: PdfDocument;
  products?: Product[];
  isAdmin?: boolean;
  onUpdatePdf?: (pdf: PdfDocument, options?: { silent?: boolean }) => void;
  onDeletePdf?: (id: string) => void;
}

export const PdfCard: React.FC<PdfCardProps> = ({
  pdf,
  products = [],
  isAdmin,
  onUpdatePdf,
  onDeletePdf
}) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isReplacingFile, setIsReplacingFile] = useState<boolean>(false);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  // 5-Page Preview & Full-Screen Catalog Viewer Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewInitialMode, setPreviewInitialMode] = useState<'preview5' | 'fullscreen'>('preview5');

  // Admin inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>(pdf.title);
  const [editedDescription, setEditedDescription] = useState<string>(pdf.description);
  const [savedNotice, setSavedNotice] = useState<string>('');

  useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(pdf.title);
      setEditedDescription(pdf.description);
    }
  }, [pdf.title, pdf.description, isEditingTitle]);

  const whatsappMessage = `Hola Jhosie Girón, descargué el Catálogo '${pdf.title}' (${pdf.pagesCount} páginas) y me gustaría realizar un pedido.`;
  const whatsappUrl = `https://wa.me/526621395110?text=${encodeURIComponent(whatsappMessage)}`;

  const triggerBlobSave = (blob: Blob, filename: string) => {
    const pdfBlob =
      blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  const executeFileDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(5);
    const safeFilename = `${pdf.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Catalogo_Shelo_NABEL_2026'}.pdf`;

    try {
      // 1. Check if a custom replacement PDF blob exists in IndexedDB/server
      const storedBlob = await pdfFileStore.getFileBlob(pdf.id);
      if (storedBlob && storedBlob.size > 0) {
        const headerSlice = await storedBlob.slice(0, 8).arrayBuffer();
        if (isValidPdfHeader(headerSlice)) {
          setDownloadProgress(100);
          triggerBlobSave(storedBlob, safeFilename);
          setIsDownloading(false);
          setTimeout(() => setDownloadProgress(0), 1200);
          return;
        }
      }

      // 2. For the 148-page Official Catalog (45.4 MB), assemble the verified PDF Blob in memory
      // via authenticated 8 MB chunks so Android/iOS NEVER hit the cookie-warning HTML page!
      if (pdf.id === OFFICIAL_CATALOG_ID) {
        const fullCatalogBlob = await fetchOfficialCatalogFullBlob((pct) => {
          setDownloadProgress(pct);
        });
        triggerBlobSave(fullCatalogBlob, safeFilename);
        setIsDownloading(false);
        setTimeout(() => setDownloadProgress(0), 1500);
        return;
      }

      // 3. Fallback generator for any other entry
      const generatedBlob = await generateDownloadablePdf(pdf, products);
      setDownloadProgress(100);
      triggerBlobSave(generatedBlob, safeFilename);
    } catch (err) {
      console.error('Error downloading catalog:', err);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadProgress(0), 1500);
    }
  };

  const handleOpenPreview5Pages = () => {
    setPreviewInitialMode('preview5');
    setIsPreviewOpen(true);
  };

  const handleOpenFullCatalogOnScreen = () => {
    setPreviewInitialMode('fullscreen');
    setIsPreviewOpen(true);
  };

  const applyLiveCatalogChange = (changes: Partial<PdfDocument>, silent = true) => {
    if (!onUpdatePdf) return;
    onUpdatePdf(
      {
        ...pdf,
        title: editedTitle.trim() || pdf.title,
        category: 'Catálogo Oficial',
        description: editedDescription.trim() || pdf.description,
        price: 0,
        ...changes
      },
      { silent }
    );
  };

  const handleSaveAdminEdits = () => {
    if (!onUpdatePdf) return;
    const cleanTitle = editedTitle.trim() || pdf.title;
    const cleanDesc = editedDescription.trim() || pdf.description;

    onUpdatePdf(
      {
        ...pdf,
        title: cleanTitle,
        category: 'Catálogo Oficial',
        description: cleanDesc,
        price: 0
      },
      { silent: false }
    );
    setIsEditingTitle(false);
    setSavedNotice('¡Catálogo actualizado al momento en todos los dispositivos!');
    setTimeout(() => setSavedNotice(''), 2800);
  };

  const handleReplaceCatalogFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdatePdf) return;
    e.target.value = '';
    setIsReplacingFile(true);
    try {
      const { pagesCount, fileSizeFormatted } = await countPdfPages(file);
      await pdfFileStore.saveFile(pdf.id, file);
      onUpdatePdf(
        {
          ...pdf,
          price: 0,
          pagesCount,
          fileSize: fileSizeFormatted,
          description: `Catálogo Oficial Sheló NABEL (${pagesCount} páginas • Vista previa de 5 páginas y descarga gratis).`
        },
        { silent: false }
      );
      setSavedNotice(`¡Catálogo (${pagesCount} págs) actualizado al momento!`);
      setTimeout(() => setSavedNotice(''), 3000);
    } catch {
      await pdfFileStore.saveFile(pdf.id, file);
      setSavedNotice('¡Catálogo actualizado al momento!');
      setTimeout(() => setSavedNotice(''), 3000);
    } finally {
      setIsReplacingFile(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-emerald-300 ring-2 ring-emerald-500/10 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden p-6 relative group">
        {/* Hidden input to update/replace catalog file */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept=".pdf,application/pdf,application/x-pdf,application/octet-stream"
          onChange={handleReplaceCatalogFile}
          className="hidden"
        />

        {/* Top Banner: 100% Free Catalog + 5-Page Preview */}
        <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>¡100% Gratis • Preview 5 Páginas!</span>
        </div>

        <div>
          {/* Top Badges */}
          <div className="flex items-center justify-between mb-4 mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-blue-950 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Catálogo Oficial Sheló NABEL</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>{pdf.pagesCount} páginas</span>
            </div>
          </div>

          {/* Catalog Icon + Sheló Logo Badge + Title */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <img
                src={SHELO_LOGO_URL}
                alt="Sheló NABEL"
                className="w-5 h-5 rounded-full object-cover border border-amber-400 absolute -bottom-1 -right-1 bg-white shadow-xs"
              />
            </div>

            <div className="flex-1 min-w-0">
              {isAdmin && isEditingTitle ? (
                <div className="space-y-2.5 bg-amber-50/90 p-3 rounded-xl border-2 border-amber-300">
                  <div>
                    <label className="text-[10px] font-extrabold text-amber-950 uppercase block mb-0.5">
                      Nombre del Catálogo:
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditedTitle(val);
                        if (val.trim()) {
                          applyLiveCatalogChange({ title: val.trim() }, true);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-400 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-amber-950 uppercase block mb-0.5">
                      Descripción del Catálogo:
                    </label>
                    <textarea
                      rows={2}
                      value={editedDescription}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditedDescription(val);
                        if (val.trim()) {
                          applyLiveCatalogChange({ description: val.trim() }, true);
                        }
                      }}
                      className="w-full px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveAdminEdits}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs"
                    >
                      Guardar Cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => replaceFileInputRef.current?.click()}
                      disabled={isReplacingFile}
                      className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-amber-300 text-[11px] font-bold rounded-lg flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isReplacingFile ? 'Subiendo...' : 'Reemplazar Archivo'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(false)}
                      className="px-2.5 py-1.5 bg-white text-slate-600 text-[11px] font-semibold rounded-lg border border-slate-200"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-serif font-bold text-slate-800 text-base sm:text-lg leading-snug group-hover:text-blue-900 transition-colors">
                      {pdf.title}
                    </h3>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsEditingTitle(true)}
                        className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg shrink-0"
                        title="Editar nombre o descripción del catálogo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Total del catálogo: <strong className="text-emerald-700 font-bold">{pdf.pagesCount} págs</strong>{' '}
                    {pdf.fileSize ? `• ${pdf.fileSize}` : ''}
                  </p>
                </>
              )}
            </div>
          </div>

          {savedNotice && (
            <div className="mb-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{savedNotice}</span>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3 font-normal">
            {pdf.description}
          </p>

          {/* Interactive 5-Page Preview Strip */}
          <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 border border-amber-200/90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-blue-950 uppercase flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Vista Previa de 5 Páginas del Catálogo:</span>
              </span>
              <button
                type="button"
                onClick={handleOpenPreview5Pages}
                className="text-[10px] font-extrabold text-emerald-700 hover:underline"
              >
                Ver las 5 págs →
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={handleOpenPreview5Pages}
                  className="py-1.5 rounded-lg bg-white hover:bg-blue-950 hover:text-amber-300 text-blue-950 border border-amber-300/80 font-mono text-[11px] font-bold transition-colors text-center shadow-2xs"
                  title={`Ver Página ${pNum} de 5 de la vista previa`}
                >
                  Pág. {pNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Admin Controls & 5-Page Preview + Free Download Actions */}
        <div className="pt-3 border-t border-slate-100 mt-auto space-y-3">
          {isAdmin && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <Unlock className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-emerald-900 uppercase block leading-none">
                    Catálogo 100% Gratis:
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    Vista Previa 5 Págs y Descarga Libre
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => replaceFileInputRef.current?.click()}
                  disabled={isReplacingFile}
                  className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1"
                  title="Subir o reemplazar archivo del catálogo"
                >
                  <Upload className="w-3 h-3" />
                  <span>{isReplacingFile ? 'Subiendo...' : 'Cambiar Catálogo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-slate-700 border border-amber-300 rounded-lg text-[11px] font-semibold"
                >
                  Editar
                </button>
                {onDeletePdf && (
                  <button
                    type="button"
                    onClick={() => onDeletePdf(pdf.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    title="Quitar catálogo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Free Download Status */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                Descarga del Catálogo
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>100% GRATIS</span>
              </span>
            </div>

            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 font-bold">
              <Unlock className="w-3 h-3 text-emerald-600" />
              <span>Preview 5 Págs + Descarga Gratis</span>
            </span>
          </div>

          {/* 5-Page Preview, Full-Screen View, and 1-Click Free Download */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenPreview5Pages}
                className="py-2.5 px-3 bg-amber-100 hover:bg-amber-200 text-blue-950 font-extrabold text-xs rounded-xl border border-amber-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Layers className="w-4 h-4 text-amber-700" />
                <span>Vista Previa (5 Págs)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenFullCatalogOnScreen}
                className="py-2.5 px-3 bg-blue-950 hover:bg-blue-900 text-amber-300 font-extrabold text-xs rounded-xl border border-amber-400/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Ver Catálogo Completo</span>
              </button>
            </div>

            <button
              type="button"
              onClick={executeFileDownload}
              disabled={isDownloading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Descargando Catálogo Gratis{downloadProgress > 0 ? ` (${downloadProgress}%)` : ''}...
                  </span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar Catálogo Completo Gratis</span>
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pedir productos del catálogo al WhatsApp 6621395110</span>
            </a>
          </div>
        </div>
      </div>

      {/* 5-Page Preview & Full-Screen Catalog Viewer Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdf={pdf}
        products={products}
        isAdmin={isAdmin}
        initialMode={previewInitialMode}
        onDownload={() => void executeFileDownload()}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
      />
    </>
  );
};
