import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  MessageCircle,
  BookOpen,
  Layers,
  CheckCircle2,
  Sparkles,
  Trash2,
  Loader2,
  KeyRound,
  Copy,
  Check,
  Edit3,
  AlertCircle,
  Lock,
  Unlock,
  ShieldCheck,
  Upload,
  Eye,
  Maximize2
} from 'lucide-react';
import { PdfDocument, Product } from '../types';
import { pdfFileStore } from '../services/pdfFileStore';
import { generateDownloadablePdf } from '../utils/generateCatalogPdf';
import { countPdfPages } from '../utils/pdfParser';
import { INITIAL_PDFS } from '../data/initialPdfs';
import { SHELO_LOGO_URL } from './Navbar';
import { PdfPreviewModal } from './PdfPreviewModal';

const DEFAULT_PDF_IDS = new Set(INITIAL_PDFS.map((p) => p.id));

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
  const [isReplacingFile, setIsReplacingFile] = useState<boolean>(false);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  // 8-Page Preview & Full-Screen PDF Viewer Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewInitialMode, setPreviewInitialMode] = useState<'preview8' | 'fullscreen'>('preview8');

  // Client Download Key state (ONLY used for $20 MXN PDFs when user is NOT admin)
  const [showKeyPrompt, setShowKeyPrompt] = useState<boolean>(false);
  const [enteredKey, setEnteredKey] = useState<string>('');
  const [keyError, setKeyError] = useState<string>('');
  const [keySuccess, setKeySuccess] = useState<string>('');

  // Admin inline editing state (updates both AL MOMENTO on every change and when clicking Guardar)
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>(pdf.title);
  const [editedCategory, setEditedCategory] = useState<string>(pdf.category || 'Catálogo Oficial');
  const [editedDescription, setEditedDescription] = useState<string>(pdf.description);
  const [editedKey, setEditedKey] = useState<string>(pdf.downloadKey || 'SN-2026');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string>('');

  const isDefaultPdf = DEFAULT_PDF_IDS.has(pdf.id);

  useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(pdf.title);
      setEditedCategory(pdf.category || 'Catálogo Oficial');
      setEditedDescription(pdf.description);
      setEditedKey(pdf.downloadKey || 'SN-2026');
    }
  }, [pdf.title, pdf.category, pdf.description, pdf.downloadKey, isEditingTitle]);

  // Strictly determined by pdf.price (0 = Gratis sin clave, 20 = $20 MXN con clave controlada por Admin)
  const isFree = Number(pdf.price) === 0;

  // Close key prompt automatically if switched to free or if admin logs in
  useEffect(() => {
    if (isFree || isAdmin) {
      setShowKeyPrompt(false);
    }
  }, [isFree, isAdmin]);

  const whatsappMessage = isFree
    ? `Hola Jhosie Girón, descargué el PDF gratuito: '${pdf.title}' (${pdf.pagesCount} páginas) y me gustaría pedir informes.`
    : `Hola Jhosie Girón, quiero comprar la descarga del PDF: '${pdf.title}' por $20 pesos para recibir mi clave de descarga.`;

  const whatsappUrl = `https://wa.me/526621395110?text=${encodeURIComponent(whatsappMessage)}`;

  const executeFileDownload = async () => {
    setIsDownloading(true);
    try {
      // 1. Check if user uploaded a real PDF file stored in IndexedDB / Server / Firebase
      const storedBlobUrl = await pdfFileStore.getFileUrl(pdf.id);
      if (storedBlobUrl) {
        const link = document.createElement('a');
        link.href = storedBlobUrl;
        link.download = `${pdf.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(storedBlobUrl), 10000);
        setIsDownloading(false);
        return;
      }

      // 2. Otherwise generate a real 8-page downloadable PDF with Sheló NABEL logo on the fly
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
      console.error('Error downloading PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenPreview8Pages = () => {
    setPreviewInitialMode('preview8');
    setIsPreviewOpen(true);
  };

  const handleOpenFullPdfOnScreen = () => {
    setPreviewInitialMode('fullscreen');
    setIsPreviewOpen(true);
  };

  const handleVerifyKeyAndDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError('');
    setKeySuccess('');

    if (isAdmin || isFree) {
      await executeFileDownload();
      return;
    }

    const cleanEntered = enteredKey.trim().toUpperCase();
    const expectedKey = (pdf.downloadKey || 'SN-2026').trim().toUpperCase();

    if (!cleanEntered) {
      setKeyError('Ingresa la clave de descarga que te entregó el administrador.');
      return;
    }

    if (cleanEntered === expectedKey) {
      setKeySuccess('¡Clave verificada correctamente! Iniciando descarga del PDF...');
      await executeFileDownload();
      setTimeout(() => {
        setKeySuccess('');
        setEnteredKey('');
        setShowKeyPrompt(false);
      }, 2200);
    } else {
      setKeyError('Clave de descarga incorrecta. Solicita tu clave al administrador por WhatsApp.');
    }
  };

  // Immediate real-time update ("al momento") whenever Admin modifies any field
  const applyLivePdfChange = (changes: Partial<PdfDocument>, silent = true) => {
    if (!onUpdatePdf) return;
    onUpdatePdf(
      {
        ...pdf,
        title: editedTitle.trim() || pdf.title,
        category: editedCategory.trim() || pdf.category || 'Catálogo Oficial',
        description: editedDescription.trim() || pdf.description,
        downloadKey: editedKey.trim().toUpperCase() || pdf.downloadKey || 'SN-2026',
        ...changes
      },
      { silent }
    );
  };

  // Explicit Save ("cuando se guarde")
  const handleSaveAdminEdits = () => {
    if (!onUpdatePdf) return;
    const cleanTitle = editedTitle.trim() || pdf.title;
    const cleanCategory = editedCategory.trim() || pdf.category || 'Catálogo Oficial';
    const cleanDesc = editedDescription.trim() || pdf.description;
    const cleanKey = editedKey.trim().toUpperCase() || pdf.downloadKey || 'SN-2026';

    onUpdatePdf(
      {
        ...pdf,
        title: cleanTitle,
        category: cleanCategory,
        description: cleanDesc,
        downloadKey: cleanKey
      },
      { silent: false }
    );
    setIsEditingTitle(false);
    setSavedNotice('¡Actualizado al momento en la página, Firebase y Nube!');
    setTimeout(() => setSavedNotice(''), 2800);
  };

  // Allow Admin to replace/upload the binary PDF file of any card with immediate update
  const handleReplacePdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          pagesCount,
          fileSize: fileSizeFormatted,
          description: `Documento PDF actualizado (${pagesCount} páginas detectadas automáticamente).`
        },
        { silent: false }
      );
      setSavedNotice(`¡Archivo PDF (${pagesCount} págs) actualizado al momento!`);
      setTimeout(() => setSavedNotice(''), 3000);
    } catch {
      await pdfFileStore.saveFile(pdf.id, file);
      setSavedNotice('¡Archivo PDF actualizado al momento!');
      setTimeout(() => setSavedNotice(''), 3000);
    } finally {
      setIsReplacingFile(false);
    }
  };

  const handleCopyKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pdf.downloadKey || 'SN-2026');
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <>
      <div
        className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden p-6 relative group ${
          isFree ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-amber-200'
        }`}
      >
        {/* Hidden input to update/replace PDF binary file */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept=".pdf,application/pdf,application/x-pdf,application/octet-stream"
          onChange={handleReplacePdfFile}
          className="hidden"
        />

        {/* Top Banner for Free vs Paid */}
        {isFree ? (
          <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>¡Gratis ($0 MXN) • Descarga y Lectura Libre!</span>
          </div>
        ) : (
          <div className="absolute top-0 right-0 bg-blue-950 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-xs uppercase tracking-wider flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-amber-300" />
            <span>$20 MXN • Vista Previa 8 Págs</span>
          </div>
        )}

        <div>
          {/* Top Badges */}
          <div className="flex items-center justify-between mb-4 mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-blue-950 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>{pdf.category || 'Catálogo Oficial'}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>{pdf.pagesCount} páginas</span>
            </div>
          </div>

          {/* PDF Icon + Sheló Logo Badge + Title (Editable by Admin with live update) */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className="relative shrink-0">
              <div
                className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform ${
                  isFree ? 'bg-emerald-600' : 'bg-blue-900'
                }`}
              >
                <FileText className="w-6 h-6" />
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
                      Título del PDF (Se actualiza al momento y al guardar):
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditedTitle(val);
                        if (val.trim()) {
                          applyLivePdfChange({ title: val.trim() }, true);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-400 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-amber-950 uppercase block mb-0.5">
                      Categoría del Catálogo:
                    </label>
                    <select
                      value={editedCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditedCategory(val);
                        applyLivePdfChange({ category: val }, true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-bold text-slate-900"
                    >
                      <option value="Catálogo Oficial">Catálogo Oficial</option>
                      <option value="Salud y Bienestar">Salud y Bienestar</option>
                      <option value="Cuidado Facial">Cuidado Facial</option>
                      <option value="Cuidado Capilar">Cuidado Capilar</option>
                      <option value="Cuidado Corporal">Cuidado Corporal</option>
                      <option value="Cosméticos y Aromas">Cosméticos y Aromas</option>
                      <option value="Línea Infantil">Línea Infantil</option>
                      <option value="Escolar y Accesorios">Escolar y Accesorios</option>
                      <option value="Precios y Negocio">Precios y Negocio</option>
                      <option value="Guía de Salud">Guía de Salud</option>
                      <option value="Afiliación">Afiliación</option>
                      <option value="Temporada">Temporada</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-amber-950 uppercase block mb-0.5">
                      Descripción:
                    </label>
                    <textarea
                      rows={2}
                      value={editedDescription}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditedDescription(val);
                        if (val.trim()) {
                          applyLivePdfChange({ description: val.trim() }, true);
                        }
                      }}
                      className="w-full px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 resize-none"
                    />
                  </div>

                  {!isFree && (
                    <div>
                      <label className="text-[10px] font-extrabold text-amber-950 uppercase block mb-0.5">
                        Clave de Descarga ($20 MXN - Control Admin):
                      </label>
                      <input
                        type="text"
                        value={editedKey}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setEditedKey(val);
                          if (val.trim()) {
                            applyLivePdfChange({ downloadKey: val.trim() }, true);
                          }
                        }}
                        className="w-full px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveAdminEdits}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs"
                    >
                      Guardar en la Página
                    </button>
                    <button
                      type="button"
                      onClick={() => replaceFileInputRef.current?.click()}
                      disabled={isReplacingFile}
                      className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-amber-300 text-[11px] font-bold rounded-lg flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isReplacingFile ? 'Subiendo...' : 'Actualizar Archivo PDF'}</span>
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
                        title="Modificar título, categoría o clave del PDF al momento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Páginas detectadas: <strong className="text-emerald-700 font-bold">{pdf.pagesCount} págs</strong>{' '}
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

          {/* Interactive 8-Page Mini Preview Strip inside each PDF Card */}
          <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 border border-amber-200/90">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold text-blue-950 uppercase flex items-center gap-1">
                <Eye className="w-3 h-3 text-amber-600" />
                <span>Vista Previa de 8 Páginas Disponible:</span>
              </span>
              <button
                type="button"
                onClick={handleOpenPreview8Pages}
                className="text-[10px] font-extrabold text-emerald-700 hover:underline"
              >
                Ver las 8 págs →
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={handleOpenPreview8Pages}
                  className="py-1 rounded bg-white hover:bg-blue-950 hover:text-amber-300 text-blue-950 border border-amber-300/80 font-mono text-[10px] font-bold transition-colors text-center shadow-2xs"
                  title={`Ver Página ${pNum} de 8 de la vista previa`}
                >
                  P.{pNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Admin Controls & Download + Preview Actions */}
        <div className="pt-3 border-t border-slate-100 mt-auto space-y-3">
          {isAdmin && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2.5 shadow-2xs">
              {!isFree ? (
                <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-amber-900 uppercase block leading-none">
                        Clave de Descarga ($20 MXN • Control Admin):
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-900 tracking-wider">
                        {pdf.downloadKey || 'SN-2026'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="Copiar clave para entregar al cliente que compre el PDF de $20"
                    >
                      {copiedKey ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Clave</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="px-2 py-1 bg-white hover:bg-amber-100 text-slate-700 border border-amber-300 rounded-lg text-[11px] font-semibold"
                      title="Editar título, categoría o clave"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Unlock className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-emerald-900 uppercase block leading-none">
                        Producto Gratuito ($0 MXN):
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        Descarga y Lectura Libre (No ocupa clave)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-slate-700 border border-amber-300 rounded-lg text-[11px] font-semibold"
                    title="Editar título o categoría del PDF"
                  >
                    Editar PDF
                  </button>
                </div>
              )}

              {onUpdatePdf && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-amber-900 uppercase">
                    Modalidad al momento:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdatePdf({ ...pdf, price: 0 }, { silent: false })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        isFree
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
                      }`}
                    >
                      Gratis (Sin Clave)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdatePdf({ ...pdf, price: 20 }, { silent: false })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        !isFree
                          ? 'bg-slate-900 text-amber-300 shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      $20 (Con Clave)
                    </button>
                    {onDeletePdf && !isDefaultPdf && (
                      <button
                        type="button"
                        onClick={() => onDeletePdf(pdf.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg ml-0.5"
                        title="Eliminar PDF subido"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cost Summary */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                Costo de Descarga
              </span>
              {isFree ? (
                <span className="text-lg font-bold font-mono text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>GRATIS ($0 MXN)</span>
                </span>
              ) : (
                <span className="text-xl font-bold font-mono text-slate-800">$20 MXN</span>
              )}
            </div>

            {isFree ? (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 font-bold">
                <Unlock className="w-3 h-3 text-emerald-600" />
                <span>Abrir en Pantalla y Descarga Libre</span>
              </span>
            ) : isAdmin ? (
              <span className="text-[11px] text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Admin Conectado: Sin Clave</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Descarga con Clave ($20 MXN)</span>
              </span>
            )}
          </div>

          {/* Preview (8 Pages), Open PDF on Screen (Free or Admin), and Download Actions */}
          {isAdmin ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreview8Pages}
                  className="py-2.5 px-3 bg-amber-100 hover:bg-amber-200 text-blue-950 font-extrabold text-xs rounded-xl border border-amber-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Layers className="w-4 h-4 text-amber-700" />
                  <span>Vista Previa (8 Págs)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenFullPdfOnScreen}
                  className="py-2.5 px-3 bg-blue-950 hover:bg-blue-900 text-amber-300 font-extrabold text-xs rounded-xl border border-amber-400/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Abrir PDF en Pantalla</span>
                </button>
              </div>

              <button
                type="button"
                onClick={executeFileDownload}
                disabled={isDownloading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Descargando PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      Descargar PDF Directo ({isFree ? 'Gratis $0' : '$20 MXN'} • Admin Sin Clave)
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : isFree ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreview8Pages}
                  className="py-2.5 px-3 bg-amber-100 hover:bg-amber-200 text-blue-950 font-extrabold text-xs rounded-xl border border-amber-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Layers className="w-4 h-4 text-amber-700" />
                  <span>Vista Previa (8 Págs)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenFullPdfOnScreen}
                  className="py-2.5 px-3 bg-blue-950 hover:bg-blue-900 text-amber-300 font-extrabold text-xs rounded-xl border border-amber-400/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Abrir PDF en Pantalla</span>
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
                    <span>Descargando PDF Gratis...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF Gratis (Sin Clave)</span>
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
                <span>Consultar sobre este catálogo al 6621395110</span>
              </a>
            </div>
          ) : showKeyPrompt ? (
            <form
              onSubmit={handleVerifyKeyAndDownload}
              className="p-3.5 rounded-xl bg-slate-50 border-2 border-emerald-500/80 space-y-2.5 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ingresa tu Clave de Descarga ($20 MXN):</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowKeyPrompt(false);
                    setKeyError('');
                    setKeySuccess('');
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Cerrar
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                Escribe la clave que te entregó el Administrador tras tu compra de $20 pesos para descargar el PDF.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={enteredKey}
                  onChange={(e) => {
                    setEnteredKey(e.target.value.toUpperCase());
                    if (keyError) setKeyError('');
                  }}
                  placeholder="Ej. SN-2026"
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isDownloading}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 shrink-0 transition-all"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Descargar</span>
                </button>
              </div>

              {keyError && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span>{keyError}</span>
                </div>
              )}

              {keySuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>{keySuccess}</span>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenPreview8Pages}
                className="w-full py-2.5 px-4 bg-amber-100 hover:bg-amber-200 text-blue-950 font-extrabold text-xs rounded-xl border border-amber-300 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Eye className="w-4 h-4 text-amber-700" />
                <span>Ver Vista Previa de 8 Páginas del PDF</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-blue-950 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-amber-300" />
                <span>Comprar descarga por $20 MXN</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setShowKeyPrompt(true);
                  setKeyError('');
                  setKeySuccess('');
                }}
                className="w-full py-2.5 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300"
              >
                <KeyRound className="w-4 h-4" />
                <span>Descargar PDF (Ingresar Clave de Descarga)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 8-Page Preview & Full-Screen On-Page PDF Viewer Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdf={pdf}
        products={products}
        isAdmin={isAdmin}
        initialMode={previewInitialMode}
        onDownload={() => void executeFileDownload()}
        isDownloading={isDownloading}
      />
    </>
  );
};
