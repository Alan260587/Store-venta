import React, { useState } from 'react';
import { Search, FileText, CheckCircle2, Gift, Upload, Sparkles, KeyRound, BookOpen, Download } from 'lucide-react';
import { PdfDocument, Product } from '../types';
import { PdfCard } from './PdfCard';
import { generateAdminManualPdf } from '../utils/generateManualPdf';

interface PdfStoreProps {
  pdfs: PdfDocument[];
  products?: Product[];
  isAdmin?: boolean;
  onUpdatePdf?: (pdf: PdfDocument) => void;
  onDeletePdf?: (id: string) => void;
  onOpenAddPdf?: () => void;
}

export const PdfStore: React.FC<PdfStoreProps> = ({
  pdfs,
  products = [],
  isAdmin,
  onUpdatePdf,
  onDeletePdf,
  onOpenAddPdf
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'paid'>('all');
  const [isDownloadingGuide, setIsDownloadingGuide] = useState<boolean>(false);

  const handleDownloadGuide = async () => {
    setIsDownloadingGuide(true);
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
      console.error('Error downloading guide:', e);
    } finally {
      setIsDownloadingGuide(false);
    }
  };

  const filteredPdfs = pdfs.filter((pdf) => {
    const matchesSearch =
      pdf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pdf.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pdf.category && pdf.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const isFree = Number(pdf.price) === 0;
    const matchesPrice =
      filterType === 'all' ||
      (filterType === 'free' && isFree) ||
      (filterType === 'paid' && !isFree);

    return matchesSearch && matchesPrice;
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-xl border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/80 border border-emerald-500/30 text-emerald-200 text-xs font-semibold mb-4">
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              <span>Catálogo Sheló NABEL Gratuito &amp; Tienda de Descargas PDF</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white mb-3">
              Catálogos y Documentos en PDF
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100 font-light leading-relaxed mb-6">
              Los documentos <strong>Gratis ($0 MXN)</strong> tienen <strong>descarga directa inmediata sin necesidad de clave</strong>. Los documentos especializados de <strong>$20 pesos MXN</strong> cuentan con <strong>Clave de Descarga controlada por el Administrador</strong> (quien te la entrega al adquirirlo por WhatsApp). Si estás conectado como <strong>Administrador</strong>, puedes descargar tanto los de $20 pesos como los gratuitos directamente sin clave.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-200">
              <div className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span className="font-bold text-white">Gratis ($0): Descarga Directa Sin Clave</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-500/30">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>$20 MXN: Con Clave controlada por Admin</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Admin Conectado: Descarga Todo Sin Clave</span>
              </div>
            </div>
          </div>

          {onOpenAddPdf && (
            <div className="shrink-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={onOpenAddPdf}
                className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Upload className="w-5 h-5 text-slate-950" />
                <span>+ Subir Archivos PDF</span>
              </button>
              <span className="text-[11px] text-emerald-100 text-center font-medium">
                {isAdmin ? 'Modo Admin Activo • Sube y edita títulos' : 'Requiere Clave Admin (****)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Admin Notice Banner + Instructivo PDF Download if Admin is active */}
      {isAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Vista de Administrador Activa:</span> En cada tarjeta de abajo puedes ver la <strong>Clave de Descarga exclusiva</strong> para entregársela al cliente, además de poder <strong>modificar el título del PDF</strong> y cambiar entre <strong>Gratis ($0) o $20 pesos</strong>.
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadGuide}
            disabled={isDownloadingGuide}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 shrink-0 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <Download className="w-4 h-4" />
            <span>{isDownloadingGuide ? 'Generando PDF...' : 'Descargar Instructivo de Uso (PDF)'}</span>
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título de catálogo o categoría..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm text-slate-800"
          />
        </div>

        {/* Filter Chips: Todos / Gratis / $20 MXN */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos ({pdfs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('free')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'free'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gratis $0 ({pdfs.filter(p => Number(p.price) === 0).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('paid')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === 'paid'
                ? 'bg-slate-900 text-amber-300 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            De Pago $20 ({pdfs.filter(p => Number(p.price) > 0).length})
          </button>
        </div>
      </div>

      {/* PDF Cards Grid */}
      {filteredPdfs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPdfs.map((pdf) => (
            <PdfCard
              key={pdf.id}
              pdf={pdf}
              products={products}
              isAdmin={isAdmin}
              onUpdatePdf={onUpdatePdf}
              onDeletePdf={onDeletePdf}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto my-8">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800 mb-1">No hay catálogos PDF coincidentes</h3>
          <p className="text-xs text-slate-500 mb-4">Intenta con otra palabra clave o cambia el filtro.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
            }}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg"
          >
            Ver todos los PDFs
          </button>
        </div>
      )}

    </section>
  );
};
