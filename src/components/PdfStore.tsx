import React from 'react';
import {
  BookOpen,
  Plus,
  Shield,
  Sparkles,
  CheckCircle2,
  Eye,
  Download,
  Upload,
  MessageCircle
} from 'lucide-react';
import { PdfDocument, Product } from '../types';
import { PdfCard } from './PdfCard';
import { SHELO_LOGO_URL } from './Navbar';

interface PdfStoreProps {
  pdfs: PdfDocument[];
  products?: Product[];
  isAdmin: boolean;
  onOpenAddPdf: () => void;
  onOpenAdminLogin: () => void;
  onUpdatePdf: (pdf: PdfDocument, options?: { silent?: boolean }) => void;
  onDeletePdf: (id: string) => void;
}

export const PdfStore: React.FC<PdfStoreProps> = ({
  pdfs,
  products = [],
  isAdmin,
  onOpenAddPdf,
  onOpenAdminLogin,
  onUpdatePdf,
  onDeletePdf
}) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Banner with Official Sheló NABEL Logo */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-8 relative overflow-hidden border-2 border-amber-400">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 max-w-3xl text-center sm:text-left">
            <img
              src={SHELO_LOGO_URL}
              alt="Sheló NABEL Jhosie Girón"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-3 border-amber-400 shadow-xl bg-white shrink-0"
            />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Vista Previa de 5 Páginas • Descarga Completa 100% Gratis</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-serif font-extrabold tracking-tight mb-2">
                Catálogo Oficial Sheló NABEL para Descargar Gratis
              </h2>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed font-light">
                Visualiza la <strong>vista previa de 5 páginas</strong> del catálogo oficial en pantalla y{' '}
                <strong>descárgalo completo totalmente gratis</strong> en tu computadora, celular Android, iPhone o Tablet.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 shrink-0">
            {isAdmin ? (
              <button
                type="button"
                onClick={onOpenAddPdf}
                className="px-6 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>+ Subir Catálogo para Descargar Gratis</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-amber-300/40 font-semibold text-xs sm:text-sm rounded-2xl backdrop-blur-xs flex items-center gap-2 transition-all"
              >
                <Shield className="w-4 h-4 text-amber-300" />
                <span>Subir Catálogo (Admin ****)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Notice Bar */}
      <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs sm:text-sm text-blue-950 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Catálogo Oficial 100% Gratuito:</strong> Puedes ver la{' '}
            <strong className="text-blue-900">Vista Previa de 5 Páginas</strong> y{' '}
            <strong className="text-emerald-700">Descargar el Catálogo Completo Gratis</strong> con un solo clic.
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold shrink-0 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300">
          <Eye className="w-4 h-4 text-emerald-700" />
          <span>Preview de 5 Páginas + Descarga Gratis</span>
        </div>
      </div>

      {/* Catalog Cards Grid */}
      {pdfs.length > 0 ? (
        <div
          className={`grid grid-cols-1 ${
            pdfs.length === 1 ? 'max-w-2xl mx-auto' : 'md:grid-cols-2 lg:grid-cols-3'
          } gap-6`}
        >
          {pdfs.map((pdf) => (
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
        <div className="bg-white rounded-3xl p-10 text-center border-2 border-amber-200 shadow-sm max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="font-serif font-extrabold text-xl text-blue-950 mb-2">
            Catálogo Oficial Sheló NABEL (Vista Previa de 5 Páginas y Descarga Gratis)
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            {isAdmin
              ? 'Sube aquí el Catálogo Oficial para que todos los visitantes puedan ver su vista previa de 5 páginas y descargarlo completo gratis.'
              : 'El catálogo oficial estará disponible aquí para ver su vista previa de 5 páginas y descargarlo gratis. También puedes solicitarlo directamente por WhatsApp.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isAdmin ? (
              <button
                type="button"
                onClick={onOpenAddPdf}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-md flex items-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Subir Catálogo Oficial Gratis</span>
              </button>
            ) : (
              <>
                <a
                  href="https://wa.me/526621395110?text=Hola%20Jhosie%20Gir%C3%B3n%2C%20me%20gustar%C3%ADa%20recibir%20el%20Cat%C3%A1logo%20Oficial%20Shel%C3%B3%20NABEL%20gratis."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-md flex items-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-amber-300" />
                  <span>Solicitar Catálogo Gratis por WhatsApp (6621395110)</span>
                </a>
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="px-5 py-3 bg-blue-950 hover:bg-blue-900 text-amber-300 text-xs sm:text-sm font-bold rounded-2xl flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Subir Catálogo (Modo Admin)</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
