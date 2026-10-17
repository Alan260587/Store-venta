import React, { useState, useEffect } from 'react';
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
  Lock
} from 'lucide-react';
import { PdfDocument, Product } from '../types';
import { pdfFileStore } from '../services/pdfFileStore';
import { generateDownloadablePdf } from '../utils/generateCatalogPdf';

interface PdfCardProps {
  pdf: PdfDocument;
  products?: Product[];
  isAdmin?: boolean;
  onUpdatePdf?: (pdf: PdfDocument) => void;
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

  // Client Download Key state
  const [showKeyPrompt, setShowKeyPrompt] = useState<boolean>(false);
  const [enteredKey, setEnteredKey] = useState<string>('');
  const [keyError, setKeyError] = useState<string>('');
  const [keySuccess, setKeySuccess] = useState<string>('');

  // Admin inline title & key editing state
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>(pdf.title);
  const [editedKey, setEditedKey] = useState<string>(pdf.downloadKey || 'SN-2026');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string>('');

  useEffect(() => {
    setEditedTitle(pdf.title);
    setEditedKey(pdf.downloadKey || 'SN-2026');
  }, [pdf.title, pdf.downloadKey]);

  // Strictly determined by pdf.price (0 = Gratis, 20 = $20 MXN)
  const isFree = Number(pdf.price) === 0;

  const whatsappMessage = isFree
    ? `Hola, me gustaría solicitar la clave de descarga gratuita del PDF: '${pdf.title}' (${pdf.pagesCount} páginas).`
    : `Hola, quiero comprar la descarga del PDF: '${pdf.title}' por $20 pesos.`;

  const whatsappUrl = `https://wa.me/526621395110?text=${encodeURIComponent(whatsappMessage)}`;

  const executeFileDownload = async () => {
    setIsDownloading(true);
    try {
      // 1. Check if user uploaded a real PDF file stored in IndexedDB
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

      // 2. Otherwise generate a real downloadable PDF summary on the fly
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

  const handleVerifyKeyAndDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError('');
    setKeySuccess('');

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
      setKeyError('Clave de descarga incorrecta. Verifica la clave con el administrador por WhatsApp.');
    }
  };

  const handleSaveAdminEdits = () => {
    if (!onUpdatePdf) return;
    const cleanTitle = editedTitle.trim() || pdf.title;
    const cleanKey = editedKey.trim().toUpperCase() || pdf.downloadKey || 'SN-2026';
    onUpdatePdf({
      ...pdf,
      title: cleanTitle,
      downloadKey: cleanKey
    });
    setIsEditingTitle(false);
    setSavedNotice('¡Guardado en la página!');
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const handleCopyKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pdf.downloadKey || 'SN-2026');
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden p-6 relative group ${
        isFree ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-emerald-100'
      }`}
    >
      {/* Top Banner for Free vs Paid */}
      {isFree ? (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>¡Gratis ($0 MXN)!</span>
        </div>
      ) : (
        <div className="absolute top-0 right-0 bg-slate-800 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-xs uppercase tracking-wider">
          <span>Descarga $20 MXN</span>
        </div>
      )}

      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>{pdf.category || 'Catálogo'}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>{pdf.pagesCount} páginas</span>
          </div>
        </div>

        {/* PDF Icon + Title (Editable by Admin) */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform ${
              isFree ? 'bg-emerald-600' : 'bg-teal-700'
            }`}
          >
            <FileText className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            {isAdmin && isEditingTitle ? (
              <div className="space-y-2 bg-amber-50/80 p-2.5 rounded-xl border border-amber-300">
                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase block mb-0.5">
                    Modificar Título del PDF:
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-400 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase block mb-0.5">
                    Clave de Descarga (Solo Admin):
                  </label>
                  <input
                    type="text"
                    value={editedKey}
                    onChange={(e) => setEditedKey(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs font-mono font-bold text-slate-900 uppercase"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveAdminEdits}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs"
                  >
                    Guardar en la Página
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedTitle(pdf.title);
                      setEditedKey(pdf.downloadKey || 'SN-2026');
                      setIsEditingTitle(false);
                    }}
                    className="px-2.5 py-1 bg-white text-slate-600 text-[11px] font-semibold rounded-lg border border-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-1">
                  <h3 className="font-serif font-bold text-slate-800 text-base sm:text-lg leading-snug group-hover:text-emerald-700 transition-colors">
                    {pdf.title}
                  </h3>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg shrink-0"
                      title="Modificar título o clave del PDF"
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
          <div className="mb-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{savedNotice}</span>
          </div>
        )}

        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4 font-normal">
          {pdf.description}
        </p>
      </div>

      {/* Footer / Admin Controls & Client Download Key Verification */}
      <div className="pt-4 border-t border-slate-100 mt-auto space-y-3">
        
        {/* EXCLUSIVE ADMIN BOX: Clave de Descarga (Visible ONLY to Admin) + Price & Title Controls */}
        {isAdmin && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase block leading-none">
                    Clave de Descarga (Solo Admin):
                  </span>
                  <span className="font-mono font-bold text-sm text-slate-950 tracking-wider">
                    {pdf.downloadKey || 'SN-2026'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Copiar clave para entregar al cliente"
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
                  title="Editar título o clave"
                >
                  Editar Título
                </button>
              </div>
            </div>

            {onUpdatePdf && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-amber-900 uppercase">
                  Modalidad:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdatePdf({ ...pdf, price: 0 })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      isFree
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
                    }`}
                  >
                    Gratis ($0)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdatePdf({ ...pdf, price: 20 })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      !isFree
                        ? 'bg-slate-900 text-amber-300 shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    $20 pesos
                  </button>
                  {onDeletePdf && (
                    <button
                      type="button"
                      onClick={() => onDeletePdf(pdf.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg ml-0.5"
                      title="Eliminar PDF"
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

          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <Lock className="w-3 h-3 text-amber-600" />
            <span>Descarga con Clave</span>
          </span>
        </div>

        {/* Client Key Input Prompt when downloading */}
        {showKeyPrompt ? (
          <form
            onSubmit={handleVerifyKeyAndDownload}
            className="p-3.5 rounded-xl bg-slate-50 border-2 border-emerald-500/80 space-y-2.5 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ingresa tu Clave de Descarga:</span>
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
              Escribe la clave que te entregó el Administrador para iniciar la descarga del archivo PDF.
            </p>

            {isAdmin && (
              <div className="p-2 rounded-lg bg-amber-100/80 border border-amber-300 text-[11px] text-amber-950 flex items-center justify-between">
                <span>
                  Clave Admin: <strong className="font-mono">{pdf.downloadKey || 'SN-2026'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setEnteredKey(pdf.downloadKey || 'SN-2026')}
                  className="underline font-bold text-emerald-800 hover:text-emerald-950"
                >
                  Usar clave
                </button>
              </div>
            )}

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
            {/* Button 1: Request/Buy via WhatsApp */}
            {isFree ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-200 flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Solicitar Clave Gratis por WhatsApp</span>
              </a>
            ) : (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-slate-800/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-amber-300" />
                <span>Comprar descarga por $20 MXN</span>
              </a>
            )}

            {/* Button 2: Download PDF using the Download Key */}
            <button
              type="button"
              onClick={() => {
                setShowKeyPrompt(true);
                setKeyError('');
                setKeySuccess('');
              }}
              className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isFree
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                  : 'bg-amber-100 hover:bg-amber-200 text-slate-900 border border-amber-300'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Descargar PDF (Ingresar Clave de Descarga)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
