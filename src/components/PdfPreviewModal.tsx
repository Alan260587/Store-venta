import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  BookOpen,
  LayoutGrid,
  ZoomIn
} from 'lucide-react';
import { PdfDocument, Product } from '../types';
import { pdfFileStore } from '../services/pdfFileStore';
import {
  buildFivePagePreviewBlob,
  fetchOfficialCatalogFullBlob,
  renderSingleCatalogPageFromBlob,
  PREVIEW_PAGES_LIMIT,
  RenderedPdfPage
} from '../utils/generateCatalogPdf';
import { OFFICIAL_CATALOG_ID } from '../data/initialPdfs';
import { SHELO_LOGO_URL } from './Navbar';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdf: PdfDocument;
  products: Product[];
  isAdmin?: boolean;
  initialMode?: 'preview5' | 'preview8' | 'fullscreen';
  onDownload: () => void;
  isDownloading?: boolean;
  downloadProgress?: number;
}

interface PreviewPageItem extends RenderedPdfPage {
  singlePageUrl?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdf,
  products,
  initialMode = 'preview5',
  onDownload,
  isDownloading = false,
  downloadProgress = 0
}) => {
  const normalizedInitialMode = initialMode === 'fullscreen' ? 'fullscreen' : 'preview5';
  const [viewMode, setViewMode] = useState<'preview5' | 'fullscreen'>(normalizedInitialMode);
  const [isMaximized, setIsMaximized] = useState<boolean>(normalizedInitialMode === 'fullscreen');
  const [displayFormat, setDisplayFormat] = useState<'all5' | 'single' | 'embedded'>(
    normalizedInitialMode === 'fullscreen' ? 'embedded' : 'all5'
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [renderedPages, setRenderedPages] = useState<PreviewPageItem[]>([]);

  // Full 148-page interactive reader state (works natively on Android, iOS, Tablet & Laptop without iframe cookie issues)
  const [fullCatalogBlob, setFullCatalogBlob] = useState<Blob | null>(null);
  const [fullCatalogLoadProgress, setFullCatalogLoadProgress] = useState<number>(0);
  const [isLoadingFullCatalog, setIsLoadingFullCatalog] = useState<boolean>(false);
  const [fullCatalogPageNum, setFullCatalogPageNum] = useState<number>(1);
  const [fullCatalogTotalPages, setFullCatalogTotalPages] = useState<number>(pdf.pagesCount || 148);
  const [fullCatalogPageImage, setFullCatalogPageImage] = useState<string | null>(null);
  const [isRenderingFullPage, setIsRenderingFullPage] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const initMode = initialMode === 'fullscreen' ? 'fullscreen' : 'preview5';
    setViewMode(initMode);
    setIsMaximized(initMode === 'fullscreen');
    setDisplayFormat(initMode === 'fullscreen' ? 'embedded' : 'all5');
    setCurrentPage(1);
    setFullCatalogPageNum(1);

    let active = true;
    const createdSinglePageUrls: string[] = [];

    const loadPreviewBlobs = async () => {
      setIsLoadingPdf(true);
      try {
        const uploadedBlob = await pdfFileStore.getFileBlob(pdf.id);
        if (!active) return;

        const { fullBlob, renderedPages: rawPages } = await buildFivePagePreviewBlob(
          uploadedBlob,
          pdf,
          products
        );
        if (!active) return;

        if (uploadedBlob && uploadedBlob.size > 0) {
          setFullCatalogBlob(uploadedBlob);
        } else if (pdf.id !== OFFICIAL_CATALOG_ID) {
          setFullCatalogBlob(fullBlob);
        }

        const pagesWithUrls: PreviewPageItem[] = rawPages.map((p) => {
          let singlePageUrl: string | undefined;
          if (p.singlePageBlob) {
            singlePageUrl = URL.createObjectURL(p.singlePageBlob);
            createdSinglePageUrls.push(singlePageUrl);
          }
          return {
            ...p,
            singlePageUrl
          };
        });

        setRenderedPages(pagesWithUrls);
      } catch (e) {
        console.warn('Error preparing catalog 5-page preview:', e);
      } finally {
        if (active) {
          setIsLoadingPdf(false);
        }
      }
    };

    void loadPreviewBlobs();

    return () => {
      active = false;
      for (const u of createdSinglePageUrls) {
        URL.revokeObjectURL(u);
      }
    };
  }, [isOpen, pdf, products, initialMode]);

  // Load full 148-page catalog Blob when user switches to 'embedded' (Ver Catálogo Completo)
  useEffect(() => {
    if (!isOpen || displayFormat !== 'embedded') return;
    let active = true;

    const ensureFullCatalogLoaded = async () => {
      if (fullCatalogBlob && fullCatalogBlob.size > 0) return;
      if (pdf.id !== OFFICIAL_CATALOG_ID) return;

      setIsLoadingFullCatalog(true);
      try {
        const blob = await fetchOfficialCatalogFullBlob((pct) => {
          if (active) setFullCatalogLoadProgress(pct);
        });
        if (active) {
          setFullCatalogBlob(blob);
        }
      } catch (e) {
        console.warn('Could not load full catalog blob:', e);
      } finally {
        if (active) {
          setIsLoadingFullCatalog(false);
        }
      }
    };

    void ensureFullCatalogLoaded();
    return () => {
      active = false;
    };
  }, [isOpen, displayFormat, fullCatalogBlob, pdf.id]);

  // Render the requested page (1..148) when browsing the Full Catalog
  useEffect(() => {
    if (!isOpen || displayFormat !== 'embedded') return;
    let active = true;

    // Fast path for pages 1..5 if already rendered in preview
    const previewMatch = renderedPages.find((p) => p.pageNumber === fullCatalogPageNum);
    if (previewMatch?.imageDataUrl && !fullCatalogBlob) {
      setFullCatalogPageImage(previewMatch.imageDataUrl);
      return;
    }

    if (!fullCatalogBlob) return;

    const renderPage = async () => {
      setIsRenderingFullPage(true);
      try {
        const res = await renderSingleCatalogPageFromBlob(fullCatalogBlob, fullCatalogPageNum);
        if (active && res) {
          setFullCatalogPageImage(res.imageDataUrl);
          setFullCatalogTotalPages(res.totalPages);
        }
      } finally {
        if (active) {
          setIsRenderingFullPage(false);
        }
      }
    };

    void renderPage();
    return () => {
      active = false;
    };
  }, [isOpen, displayFormat, fullCatalogBlob, fullCatalogPageNum, renderedPages]);

  if (!isOpen) return null;

  const totalPreviewCount =
    renderedPages.length > 0
      ? renderedPages.length
      : Math.min(PREVIEW_PAGES_LIMIT, Math.max(1, pdf.pagesCount || PREVIEW_PAGES_LIMIT));
  const pageNumbersList = Array.from({ length: totalPreviewCount }, (_, i) => i + 1);
  const activePageItem =
    renderedPages.find((p) => p.pageNumber === currentPage) || renderedPages[0];

  const downloadLabel = isDownloading
    ? `Descargando${downloadProgress > 0 ? ` (${downloadProgress}%)` : ''}...`
    : 'Descargar Catálogo Gratis';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div
        className={`bg-white border-2 border-amber-400 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'fixed inset-0 rounded-none w-full h-full'
            : 'rounded-3xl w-full max-w-6xl max-h-[94vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white px-4 sm:px-6 py-3.5 border-b-2 border-amber-400 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={SHELO_LOGO_URL}
              alt="Sheló NABEL"
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 bg-white shrink-0 shadow-md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {viewMode === 'fullscreen'
                    ? `Catálogo Completo (${fullCatalogTotalPages} Páginas)`
                    : `Vista Previa de ${totalPreviewCount} Páginas`}
                </span>
                <span className="bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ¡100% Gratis • Descarga Directa!
                </span>
              </div>
              <h3 className="font-serif font-extrabold text-sm sm:text-lg text-white truncate mt-0.5">
                {pdf.title}
              </h3>
            </div>
          </div>

          {/* Right Header Controls: Switch Mode, Fullscreen Toggle, Free Download, Close */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-blue-950/90 p-1 rounded-xl border border-amber-400/40">
              <button
                type="button"
                onClick={() => {
                  setViewMode('preview5');
                  setDisplayFormat('all5');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'preview5' && displayFormat !== 'embedded'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-amber-100 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Preview ({totalPreviewCount} Págs)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('fullscreen');
                  setDisplayFormat('embedded');
                  setIsMaximized(true);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'fullscreen' && displayFormat === 'embedded'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver Catálogo Completo ({fullCatalogTotalPages} Págs)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md border border-emerald-400 flex items-center gap-1.5 transition-all"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-amber-300 border border-amber-400/40"
              title={isMaximized ? 'Restaurar tamaño' : 'Pantalla completa'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

        {/* Sub-Toolbar: Real Catalog 5-Page Navigation & View Switcher */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold text-blue-950 uppercase mr-1">
              Modo de visualización:
            </span>
            <button
              type="button"
              onClick={() => {
                setViewMode('preview5');
                setDisplayFormat('all5');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                displayFormat === 'all5'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver las {totalPreviewCount} Páginas del Preview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('preview5');
                setDisplayFormat('single');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                displayFormat === 'single'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Página por Página (1 a {totalPreviewCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('fullscreen');
                setDisplayFormat('embedded');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                displayFormat === 'embedded'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Catálogo Completo ({fullCatalogTotalPages} Páginas)</span>
            </button>
          </div>

          {/* Quick 1..5 Page Number Selector */}
          {displayFormat !== 'embedded' ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-600 mr-1 hidden sm:inline">
                Ir a página del preview:
              </span>
              {pageNumbersList.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => {
                    setCurrentPage(pageNum);
                    if (displayFormat === 'all5') {
                      const el = document.getElementById(`pdf-preview-page-${pageNum}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`w-7 h-7 rounded-lg font-mono text-xs font-extrabold transition-all ${
                    currentPage === pageNum
                      ? 'bg-amber-400 text-slate-950 border-2 border-blue-950 shadow-xs'
                      : 'bg-white text-blue-950 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-950">
                Ir a página (1 - {fullCatalogTotalPages}):
              </span>
              <input
                type="number"
                min={1}
                max={fullCatalogTotalPages}
                value={fullCatalogPageNum}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setFullCatalogPageNum(Math.max(1, Math.min(fullCatalogTotalPages, val)));
                  }
                }}
                className="w-16 px-2 py-1 rounded-lg border-2 border-amber-400 bg-white text-blue-950 font-mono text-xs font-extrabold text-center"
              />
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
          {isLoadingPdf ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              <p className="text-sm font-bold text-blue-950">
                Cargando las 5 páginas de vista previa de &ldquo;{pdf.title}&rdquo;...
              </p>
            </div>
          ) : displayFormat === 'embedded' ? (
            /* Interactive 148-Page Full Catalog Viewer (works on Android, iOS, Tablet & Desktop without iframe cookie errors) */
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white px-6 py-4 border-b-4 border-amber-400 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={SHELO_LOGO_URL}
                      alt="Sheló NABEL"
                      className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 bg-white shadow-md shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="inline-block bg-emerald-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase mb-0.5">
                        Catálogo Completo • Página {fullCatalogPageNum} de {fullCatalogTotalPages}
                      </span>
                      <h4 className="font-serif font-extrabold text-base sm:text-xl text-white truncate">
                        {pdf.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFullCatalogPageNum((p) => (p > 1 ? p - 1 : fullCatalogTotalPages))
                      }
                      className="px-3 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 border border-amber-400/50 font-bold text-xs flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Anterior</span>
                    </button>
                    <span className="font-mono font-extrabold text-xs sm:text-sm text-white bg-blue-950/90 border border-amber-400/50 px-3 py-1.5 rounded-xl">
                      Pág. {fullCatalogPageNum} / {fullCatalogTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFullCatalogPageNum((p) => (p < fullCatalogTotalPages ? p + 1 : 1))
                      }
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-slate-200 flex flex-col items-center justify-center min-h-[62vh]">
                  {isLoadingFullCatalog ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                      <p className="text-sm font-extrabold text-blue-950">
                        Cargando las {fullCatalogTotalPages} páginas del Catálogo Oficial ({fullCatalogLoadProgress}%)...
                      </p>
                      <div className="w-64 h-2.5 bg-slate-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-200"
                          style={{ width: `${Math.max(8, fullCatalogLoadProgress)}%` }}
                        />
                      </div>
                    </div>
                  ) : isRenderingFullPage ? (
                    <div className="flex flex-col items-center gap-2 py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                      <p className="text-xs font-bold text-slate-700">
                        Renderizando página {fullCatalogPageNum} de {fullCatalogTotalPages}...
                      </p>
                    </div>
                  ) : fullCatalogPageImage ? (
                    <img
                      src={fullCatalogPageImage}
                      alt={`Página ${fullCatalogPageNum} de ${pdf.title}`}
                      className="max-w-full h-auto rounded-xl shadow-2xl border border-slate-300 bg-white mx-auto"
                    />
                  ) : null}
                </div>

                <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFullCatalogPageNum((p) => (p > 1 ? p - 1 : fullCatalogTotalPages))
                    }
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Página Anterior</span>
                  </button>

                  <span className="text-xs text-amber-200 font-semibold text-center">
                    {pdf.title} • Página {fullCatalogPageNum} de {fullCatalogTotalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setFullCatalogPageNum((p) => (p < fullCatalogTotalPages ? p + 1 : 1))
                    }
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
                  >
                    <span>Siguiente Página</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : displayFormat === 'single' && activePageItem ? (
            /* Single Page High-Resolution View of the Real Uploaded Catalog (Page 1..5) */
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-xl overflow-hidden">
                {/* Page Header */}
                <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white px-6 py-4 border-b-4 border-amber-400 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={SHELO_LOGO_URL}
                      alt="Sheló NABEL"
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 bg-white shadow-md shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="inline-block bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase mb-0.5">
                        Catálogo Oficial • Página {activePageItem.pageNumber} de {totalPreviewCount}
                      </span>
                      <h4 className="font-serif font-extrabold text-base sm:text-xl text-white truncate">
                        {pdf.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((p) => (p > 1 ? p - 1 : totalPreviewCount))
                      }
                      className="px-3 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 border border-amber-400/50 font-bold text-xs flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Anterior</span>
                    </button>
                    <span className="font-mono font-extrabold text-xs sm:text-sm text-white bg-blue-950/90 border border-amber-400/50 px-3 py-1.5 rounded-xl">
                      Pág. {activePageItem.pageNumber} / {totalPreviewCount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((p) => (p < totalPreviewCount ? p + 1 : 1))
                      }
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Actual Rendered Catalog Page Body */}
                <div className="p-4 sm:p-6 bg-slate-200 flex items-center justify-center min-h-[60vh]">
                  {activePageItem.imageDataUrl ? (
                    <img
                      src={activePageItem.imageDataUrl}
                      alt={`Página ${activePageItem.pageNumber} de ${pdf.title}`}
                      className="max-w-full h-auto rounded-xl shadow-2xl border border-slate-300 bg-white mx-auto"
                    />
                  ) : null}
                </div>

                {/* Page Footer & Prev/Next Controls */}
                <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => (p > 1 ? p - 1 : totalPreviewCount))
                    }
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Página Anterior</span>
                  </button>

                  <span className="text-xs text-amber-200 font-semibold text-center">
                    {pdf.title} • Vista Previa Página {activePageItem.pageNumber} de {totalPreviewCount} (Total del catálogo: {pdf.pagesCount} págs)
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => (p < totalPreviewCount ? p + 1 : 1))
                    }
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
                  >
                    <span>Siguiente Página</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* All 5 Real Pages of the Uploaded Catalog Displayed Clearly */
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs sm:text-sm font-bold text-blue-950">
                    Vista Previa de las <strong>{totalPreviewCount} primeras páginas reales</strong> del{' '}
                    <span className="underline">{pdf.title}</span> ({pdf.pagesCount} páginas totales • Descarga 100% Gratis).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{downloadLabel}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderedPages.map((page) => (
                  <div
                    key={page.pageNumber}
                    id={`pdf-preview-page-${page.pageNumber}`}
                    className="bg-white rounded-2xl border-2 border-amber-300 shadow-md overflow-hidden flex flex-col justify-between hover:shadow-xl transition-shadow"
                  >
                    {/* Real Catalog Page Header */}
                    <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white px-4 py-3 border-b-2 border-amber-400 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={SHELO_LOGO_URL}
                          alt="Sheló NABEL"
                          className="w-9 h-9 rounded-full object-cover border border-amber-400 bg-white shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block">
                            CATÁLOGO OFICIAL • PÁG. {page.pageNumber} DE {totalPreviewCount}
                          </span>
                          <h4 className="font-serif font-bold text-xs sm:text-sm text-white truncate">
                            {pdf.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(page.pageNumber);
                            setDisplayFormat('single');
                          }}
                          className="bg-blue-900/90 hover:bg-blue-800 text-amber-200 border border-amber-400/40 text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1"
                          title="Ampliar esta página"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ampliar</span>
                        </button>
                        <span className="bg-amber-400 text-slate-950 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg">
                          Pág. {page.pageNumber}/{totalPreviewCount}
                        </span>
                      </div>
                    </div>

                    {/* Real Catalog Page Image */}
                    <div
                      onClick={() => {
                        setCurrentPage(page.pageNumber);
                        setDisplayFormat('single');
                      }}
                      className="p-3 bg-slate-100 flex items-center justify-center cursor-pointer group relative min-h-[380px]"
                    >
                      {page.imageDataUrl ? (
                        <img
                          src={page.imageDataUrl}
                          alt={`Página ${page.pageNumber} de ${pdf.title}`}
                          className="w-full h-auto rounded-lg shadow-md border border-slate-200 bg-white object-contain max-h-[560px]"
                        />
                      ) : null}
                    </div>

                    {/* Slide Footer */}
                    <div className="bg-slate-900 text-amber-300 px-4 py-2 text-[10px] font-bold flex items-center justify-between">
                      <span className="truncate max-w-[65%]">{pdf.title}</span>
                      <span>Vista Previa Pág. {page.pageNumber} de {totalPreviewCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="bg-white border-t-2 border-amber-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>{pdf.title}</strong> • Vista previa de <strong>{totalPreviewCount} páginas</strong> y descarga 100% gratis.
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {displayFormat !== 'embedded' && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('fullscreen');
                  setDisplayFormat('embedded');
                  setIsMaximized(true);
                }}
                className="px-4 py-2.5 bg-blue-950 hover:bg-blue-900 text-amber-300 font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Ver las {fullCatalogTotalPages} Páginas en Pantalla</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
