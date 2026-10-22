import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Eye,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  Loader2,
  BookOpen,
  LayoutGrid
} from 'lucide-react';
import { PdfDocument, Product } from '../types';
import { pdfFileStore } from '../services/pdfFileStore';
import {
  buildEightPagePreviewBlob,
  buildEightPreviewPagesData,
  PreviewPageSlide
} from '../utils/generateCatalogPdf';
import { SHELO_LOGO_URL } from './Navbar';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdf: PdfDocument;
  products: Product[];
  isAdmin?: boolean;
  initialMode?: 'preview8' | 'fullscreen';
  onDownload: () => void;
  isDownloading?: boolean;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdf,
  products,
  isAdmin = false,
  initialMode = 'preview8',
  onDownload,
  isDownloading = false
}) => {
  const isFree = Number(pdf.price) === 0;
  const canOpenFullPdf = isFree || isAdmin;

  const [viewMode, setViewMode] = useState<'preview8' | 'fullscreen'>(initialMode);
  const [isMaximized, setIsMaximized] = useState<boolean>(initialMode === 'fullscreen');
  const [displayFormat, setDisplayFormat] = useState<'all8' | 'single' | 'embedded'>('all8');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [fullBlobUrl, setFullBlobUrl] = useState<string | null>(null);
  const [hasCustomUploadedPdf, setHasCustomUploadedPdf] = useState<boolean>(false);

  const slides: PreviewPageSlide[] = buildEightPreviewPagesData(pdf, products);

  useEffect(() => {
    if (!isOpen) return;
    setViewMode(initialMode);
    setIsMaximized(initialMode === 'fullscreen');
    setDisplayFormat(initialMode === 'fullscreen' ? 'embedded' : 'all8');
    setCurrentPage(1);

    let active = true;
    let createdPreviewUrl: string | null = null;
    let createdFullUrl: string | null = null;

    const loadBlobs = async () => {
      setIsLoadingPdf(true);
      try {
        const uploadedBlob = await pdfFileStore.getFileBlob(pdf.id);
        if (!active) return;

        setHasCustomUploadedPdf(Boolean(uploadedBlob && uploadedBlob.size > 0));
        const { previewBlob, fullBlob } = await buildEightPagePreviewBlob(
          uploadedBlob,
          pdf,
          products
        );
        if (!active) return;

        createdPreviewUrl = URL.createObjectURL(previewBlob);
        createdFullUrl = URL.createObjectURL(fullBlob);
        setPreviewBlobUrl(createdPreviewUrl);
        setFullBlobUrl(createdFullUrl);
      } catch (e) {
        console.warn('Error preparing PDF preview:', e);
      } finally {
        if (active) {
          setIsLoadingPdf(false);
        }
      }
    };

    void loadBlobs();

    return () => {
      active = false;
      if (createdPreviewUrl) URL.revokeObjectURL(createdPreviewUrl);
      if (createdFullUrl) URL.revokeObjectURL(createdFullUrl);
    };
  }, [isOpen, pdf, products, initialMode]);

  if (!isOpen) return null;

  const activeSlide = slides.find((s) => s.pageNumber === currentPage) || slides[0];
  const activePdfUrl =
    viewMode === 'fullscreen' && canOpenFullPdf
      ? fullBlobUrl || previewBlobUrl
      : previewBlobUrl;

  const whatsappBuyUrl = `https://wa.me/526621395110?text=${encodeURIComponent(
    `Hola Jhosie Girón, vi la vista previa de 8 páginas del PDF '${pdf.title}' y quiero adquirir mi clave de descarga por $20 MXN.`
  )}`;

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
                  {viewMode === 'fullscreen' && canOpenFullPdf
                    ? 'PDF Abierto en Pantalla'
                    : 'Vista Previa de 8 Páginas'}
                </span>
                {isFree ? (
                  <span className="bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Gratis ($0 MXN) • Acceso Completo
                  </span>
                ) : isAdmin ? (
                  <span className="bg-amber-500/30 border border-amber-300/50 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Modo Admin Activo • Acceso Completo</span>
                  </span>
                ) : (
                  <span className="bg-blue-950/80 border border-amber-400/40 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Muestra de 8 Páginas • Completo por $20 MXN
                  </span>
                )}
              </div>
              <h3 className="font-serif font-extrabold text-sm sm:text-lg text-white truncate mt-0.5">
                {pdf.title}
              </h3>
            </div>
          </div>

          {/* Right Header Controls: Switch Mode, Fullscreen Toggle, Download, Close */}
          <div className="flex items-center gap-2 flex-wrap">
            {canOpenFullPdf && (
              <div className="flex items-center bg-blue-950/90 p-1 rounded-xl border border-amber-400/40">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('preview8');
                    setDisplayFormat('all8');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'preview8' && displayFormat !== 'embedded'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-amber-100 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Vista Previa (8 Págs)</span>
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
                  <span>Abrir PDF en Pantalla</span>
                </button>
              </div>
            )}

            {canOpenFullPdf && (
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
                <span>Descargar PDF</span>
              </button>
            )}

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

        {/* Sub-Toolbar: 8-Page Navigation & View Switcher */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold text-blue-950 uppercase mr-1">
              Modo de visualización:
            </span>
            <button
              type="button"
              onClick={() => setDisplayFormat('all8')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                displayFormat === 'all8'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver las 8 Páginas Seguidas</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayFormat('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                displayFormat === 'single'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Página por Página (1 a 8)</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayFormat('embedded')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                displayFormat === 'embedded'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {canOpenFullPdf
                  ? 'Visor de Archivo PDF en Pantalla'
                  : 'Visor PDF (8 Páginas de Muestra)'}
              </span>
            </button>
          </div>

          {/* Quick 1..8 Page Number Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600 mr-1 hidden sm:inline">
              Ir a página:
            </span>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => {
                  setCurrentPage(pageNum);
                  if (displayFormat === 'all8') {
                    const el = document.getElementById(`pdf-preview-page-${pageNum}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else if (displayFormat === 'embedded') {
                    setDisplayFormat('single');
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
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
          {isLoadingPdf ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              <p className="text-sm font-bold text-blue-950">
                Preparando vista previa de 8 páginas del PDF...
              </p>
            </div>
          ) : displayFormat === 'embedded' && activePdfUrl ? (
            <div className="flex flex-col h-full min-h-[68vh] gap-4">
              <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-lg overflow-hidden flex-1 min-h-[65vh] flex flex-col">
                <div className="bg-blue-950 text-amber-200 px-4 py-2 text-xs font-bold flex items-center justify-between">
                  <span>
                    {canOpenFullPdf
                      ? `Visor PDF en Pantalla • ${pdf.title} (${hasCustomUploadedPdf ? `${pdf.pagesCount} págs` : '8 páginas'})`
                      : `Vista Previa PDF (Primeras 8 Páginas) • ${pdf.title}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDisplayFormat('all8')}
                    className="text-amber-300 hover:underline text-[11px]"
                  >
                    Ver también en formato de 8 tarjetas ilustradas
                  </button>
                </div>
                <iframe
                  src={`${activePdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  title={pdf.title}
                  className="w-full flex-1 min-h-[62vh] border-0 bg-slate-800"
                />
              </div>
            </div>
          ) : displayFormat === 'single' ? (
            /* Single Page Interactive View (Page 1..8) */
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-xl overflow-hidden">
                {/* Page Header with Official Sheló NABEL Logo */}
                <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white p-6 border-b-4 border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={SHELO_LOGO_URL}
                      alt="Sheló NABEL"
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 bg-white shadow-md shrink-0"
                    />
                    <div>
                      <span className="inline-block bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase mb-1">
                        {activeSlide.badge}
                      </span>
                      <h4 className="font-serif font-extrabold text-lg sm:text-2xl text-white">
                        {activeSlide.heading}
                      </h4>
                      <p className="text-xs text-amber-100 mt-0.5">{activeSlide.subheading}</p>
                    </div>
                  </div>

                  <div className="bg-blue-950/90 border border-amber-400/50 px-4 py-2 rounded-2xl text-center shrink-0">
                    <span className="text-[10px] uppercase text-amber-300 font-bold block">
                      Vista Previa
                    </span>
                    <span className="font-mono font-extrabold text-base text-white">
                      Página {activeSlide.pageNumber} / 8
                    </span>
                  </div>
                </div>

                {/* Page Body */}
                <div className="p-6 sm:p-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeSlide.highlights.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div>
                          <span className="text-[10px] font-mono font-extrabold bg-blue-950 text-amber-300 px-2 py-0.5 rounded">
                            Clave: {item.code}
                          </span>
                          <h5 className="font-serif font-bold text-slate-900 text-sm sm:text-base mt-1.5">
                            {item.name}
                          </h5>
                          <p className="text-xs text-slate-600 mt-0.5">{item.detail}</p>
                        </div>
                        <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                          {item.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Page Footer & Prev/Next Controls */}
                <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => (p > 1 ? p - 1 : 8))}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Página Anterior</span>
                  </button>

                  <span className="text-xs text-amber-200 font-semibold text-center">
                    {activeSlide.footerNote}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => (p < 8 ? p + 1 : 1))}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
                  >
                    <span>Siguiente Página</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* All 8 Pages Displayed Continuously so the user sees all 8 pages clearly */
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs sm:text-sm font-bold text-blue-950">
                    Estás viendo las <strong>8 Páginas de Vista Previa</strong> de{' '}
                    <span className="underline">{pdf.title}</span> ({pdf.pagesCount} páginas totales).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisplayFormat('embedded')}
                  className="px-3.5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 font-extrabold text-xs shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Abrir en Visor PDF Nativo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {slides.map((slide) => (
                  <div
                    key={slide.pageNumber}
                    id={`pdf-preview-page-${slide.pageNumber}`}
                    className="bg-white rounded-2xl border-2 border-amber-300 shadow-md overflow-hidden flex flex-col justify-between hover:shadow-xl transition-shadow"
                  >
                    {/* Slide Header */}
                    <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white p-4 border-b-2 border-amber-400 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={SHELO_LOGO_URL}
                          alt="Sheló NABEL"
                          className="w-10 h-10 rounded-full object-cover border border-amber-400 bg-white shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block">
                            {slide.badge}
                          </span>
                          <h4 className="font-serif font-bold text-sm text-white truncate">
                            {slide.heading}
                          </h4>
                        </div>
                      </div>

                      <span className="bg-amber-400 text-slate-950 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg shrink-0">
                        Pág. {slide.pageNumber}/8
                      </span>
                    </div>

                    {/* Slide Content */}
                    <div className="p-4 space-y-2.5 flex-1">
                      <p className="text-[11px] text-slate-600 font-medium border-b border-amber-100 pb-2">
                        {slide.subheading}
                      </p>

                      <div className="space-y-2">
                        {slide.highlights.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-blue-950 block truncate">
                                [{item.code}] {item.name}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {item.detail}
                              </span>
                            </div>
                            <span className="font-mono font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0 text-[11px]">
                              {item.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Slide Footer */}
                    <div className="bg-slate-900 text-amber-300 px-4 py-2 text-[10px] font-bold flex items-center justify-between">
                      <span>Sheló NABEL • Jhosie Girón</span>
                      <span>Página {slide.pageNumber} de 8</span>
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
              <strong>{pdf.title}</strong> • Vista previa de <strong>8 páginas</strong> disponible en pantalla.
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {canOpenFullPdf ? (
              <>
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
                    <span>Abrir PDF en Pantalla Completa</span>
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
                  <span>
                    Descargar PDF {isFree ? 'Gratis (Sin Clave)' : 'Directo (Modo Admin)'}
                  </span>
                </button>
              </>
            ) : (
              <a
                href={whatsappBuyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-amber-300" />
                <span>Comprar PDF Completo por $20 MXN al WhatsApp 6621395110</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
