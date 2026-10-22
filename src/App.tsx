import React, { useState, useEffect, useCallback } from 'react';
import { Product, PdfDocument, CartItem, MultiUserPresence } from './types';
import { dbStorage } from './services/dbStorage';
import { pdfFileStore } from './services/pdfFileStore';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductGrid } from './components/ProductGrid';
import { PdfStore } from './components/PdfStore';
import { CartDrawer } from './components/CartDrawer';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanel } from './components/AdminPanel';
import { AddProductModal } from './components/AddProductModal';
import { AddPdfModal } from './components/AddPdfModal';
import { Footer } from './components/Footer';
import { ShieldCheck, Lock, Users, CheckCircle2, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'pdfs' | 'admin'>('catalog');
  
  // Database State (preserved across reloads & synced across multiple users)
  const [products, setProducts] = useState<Product[]>(() => dbStorage.getProducts());
  const [pdfs, setPdfs] = useState<PdfDocument[]>(() => dbStorage.getPdfs());
  const [pageRefreshMessage, setPageRefreshMessage] = useState<string>('');

  // Multi-user presence state
  const [presence, setPresence] = useState<MultiUserPresence>({
    totalOnline: 1,
    adminsOnline: 0,
    clientsOnline: 1
  });

  // Cart State (isolated per user)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Admin Access State: Strictly isolated to THIS user's tab session (sessionStorage)
  // Other connected users remain normal clients unless they enter the Admin Key (****).
  // Automatically closes session when closing the page.
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => dbStorage.isAdminUnlocked());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Modals State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);
  const [isAddPdfModalOpen, setIsAddPdfModalOpen] = useState<boolean>(false);

  // Helper to immediately refresh all page data from dbStorage & show live update confirmation
  const refreshPageData = useCallback((notice?: string) => {
    const freshProducts = dbStorage.getProducts();
    const freshPdfs = dbStorage.getPdfs();
    setProducts([...freshProducts]);
    setPdfs([...freshPdfs]);

    // Keep cart items synchronized if any product price/name/photo was updated
    setCartItems((prev) =>
      prev.map((item) => {
        const updatedProd = freshProducts.find((p) => p.id === item.product.id);
        return updatedProd ? { ...item, product: updatedProd } : item;
      })
    );

    if (notice) {
      setPageRefreshMessage(notice);
    }
  }, []);

  useEffect(() => {
    if (!pageRefreshMessage) return;
    const timer = setTimeout(() => {
      setPageRefreshMessage('');
    }, 3800);
    return () => clearTimeout(timer);
  }, [pageRefreshMessage]);

  // Listen to custom 'shelo-db-updated' and cross-tab 'storage' events so the page
  // always updates automatically the instant any Product or PDF is saved!
  useEffect(() => {
    const handleCustomDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ type?: string; message?: string }>;
      refreshPageData(customEvent.detail?.message);
    };

    const handleCrossTabStorage = () => {
      refreshPageData();
    };

    window.addEventListener('shelo-db-updated', handleCustomDbUpdate);
    window.addEventListener('storage', handleCrossTabStorage);

    return () => {
      window.removeEventListener('shelo-db-updated', handleCustomDbUpdate);
      window.removeEventListener('storage', handleCrossTabStorage);
    };
  }, [refreshPageData]);

  // 1. Non-destructively sync local PDFs & Products with Multi-User Server on mount,
  // focus, visibilitychange, periodic interval, and real-time Server-Sent Events (SSE)
  // so Laptop, Android, and iOS always show the exact same products and PDFs!
  const performCrossDeviceSync = useCallback(async () => {
    const synced = await dbStorage.syncWithServer();
    if (!synced) return;
    setProducts([...synced.products]);
    setPdfs([...synced.pdfs]);
    if (synced.presence) {
      setPresence(synced.presence);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const clientId = dbStorage.getSessionClientId();
    const initialRole = dbStorage.isAdminUnlocked() ? 'admin' : 'client';

    // Immediate non-destructive merge on mount
    void performCrossDeviceSync();

    // Connect to real-time multi-user event stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(
        `/api/events?clientId=${encodeURIComponent(clientId)}&role=${encodeURIComponent(initialRole)}`
      );

      eventSource.addEventListener('init', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (!isMounted) return;
          if (data.presence) {
            setPresence(data.presence);
          }
          // Run non-destructive sync on init so local + server items are merged
          void performCrossDeviceSync();
        } catch {
          // ignore parse errors
        }
      });

      eventSource.addEventListener('presence:update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (isMounted && data) {
            setPresence(data);
          }
        } catch {
          // ignore
        }
      });

      eventSource.addEventListener('state:update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (!isMounted) return;
          if (Array.isArray(data.products) && data.products.length > 0) {
            dbStorage.saveProductsLocalOnly(data.products);
            setProducts([...dbStorage.getProducts()]);
          }
          if (Array.isArray(data.pdfs) && data.pdfs.length > 0) {
            dbStorage.savePdfsLocalOnly(data.pdfs);
            setPdfs([...dbStorage.getPdfs()]);
          }
          if (data.presence) {
            setPresence(data.presence);
          }
        } catch {
          // ignore
        }
      });
    } catch {
      // Fallback if SSE is unavailable
    }

    // Re-sync whenever mobile/iOS tab becomes visible or focused, plus every 4s for mobile network resilience
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void performCrossDeviceSync();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void performCrossDeviceSync();
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [performCrossDeviceSync]);

  // 2. Automatic Admin Session Logout when closing the page/tab
  useEffect(() => {
    const clientId = dbStorage.getSessionClientId();

    const handlePageCloseAutoLogout = () => {
      try {
        // Clear admin session from sessionStorage & localStorage upon closing the page
        sessionStorage.removeItem('shelo_admin_session_active_v2');
        localStorage.removeItem('shelo_admin_unlocked_v1');
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`/api/admin-logout?clientId=${encodeURIComponent(clientId)}`);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('pagehide', handlePageCloseAutoLogout);
    window.addEventListener('beforeunload', handlePageCloseAutoLogout);

    return () => {
      window.removeEventListener('pagehide', handlePageCloseAutoLogout);
      window.removeEventListener('beforeunload', handlePageCloseAutoLogout);
    };
  }, []);

  // Unlock Admin ONLY for this current user session using the same Admin Key (****) on any device
  const handleUnlockAdmin = () => {
    dbStorage.setAdminUnlocked(true);
    setIsAdminUnlocked(true);
    setIsAdminModalOpen(false);
    setActiveTab('admin');
    void performCrossDeviceSync();
  };

  const handleLockAdmin = () => {
    dbStorage.setAdminUnlocked(false);
    setIsAdminUnlocked(false);
    if (activeTab === 'admin') {
      setActiveTab('catalog');
    }
  };

  // Cart Operations
  const handleAddToCart = (product: Product, quantity: number, selectedColor?: string) => {
    const cartItemKey = `${product.id}__${selectedColor || ''}`;
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => (item.cartItemKey || `${item.product.id}__${item.selectedColor || ''}`) === cartItemKey
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { cartItemKey, product, quantity, selectedColor }];
    });
  };

  const handleUpdateQuantity = (cartItemKey: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(cartItemKey);
      return;
    }
    setCartItems(prev =>
      prev.map(item => {
        const key = item.cartItemKey || `${item.product.id}__${item.selectedColor || ''}`;
        return key === cartItemKey ? { ...item, quantity } : item;
      })
    );
  };

  const handleRemoveFromCart = (cartItemKey: string) => {
    setCartItems(prev =>
      prev.filter(item => {
        const key = item.cartItemKey || `${item.product.id}__${item.selectedColor || ''}`;
        return key !== cartItemKey;
      })
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Product Operations (Immediately updates the page state)
  const handleAddProduct = (productData: Omit<Product, 'id'>) => {
    const created = dbStorage.addProduct(productData);
    refreshPageData(`¡Página actualizada! Producto "${created.name}" guardado y visible en el catálogo.`);
  };

  const handleUpdateProduct = (product: Product) => {
    dbStorage.updateProduct(product);
    refreshPageData(`¡Página actualizada! Se guardaron los cambios en "${product.name}".`);
  };

  const handleDeleteProduct = (id: string) => {
    dbStorage.deleteProduct(id);
    refreshPageData('¡Página actualizada! Producto eliminado del catálogo.');
  };

  // PDF Operations (Immediately updates the page state)
  const handleAddPdf = (pdfData: Omit<PdfDocument, 'id' | 'uploadedAt'>) => {
    const result = dbStorage.addPdf(pdfData);
    if (result.success) {
      refreshPageData(`¡Página actualizada! PDF "${result.pdf?.title || pdfData.title}" guardado en la página.`);
    }
    return result;
  };

  const handleAddPdfsBatch = (pdfList: Array<Omit<PdfDocument, 'id' | 'uploadedAt'>>) => {
    const result = dbStorage.addPdfsBatch(pdfList);
    if (result.success) {
      refreshPageData(
        result.addedPdfs.length === 1
          ? `¡Página actualizada! PDF "${result.addedPdfs[0].title}" guardado en la página.`
          : `¡Página actualizada! Se guardaron ${result.addedPdfs.length} PDFs en la página.`
      );
    }
    return result;
  };

  const handleUpdatePdf = (pdf: PdfDocument) => {
    dbStorage.updatePdf(pdf);
    refreshPageData(`¡Página actualizada! Cambios guardados en el PDF "${pdf.title}".`);
  };

  const handleDeletePdf = (id: string) => {
    dbStorage.deletePdf(id);
    void pdfFileStore.deleteFile(id);
    refreshPageData('¡Página actualizada! PDF eliminado.');
  };

  const handleResetDefaults = () => {
    dbStorage.resetDefaults();
    refreshPageData('¡Página actualizada! Se restauraron los datos predeterminados.');
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Live Automatic Page Update Toast Banner whenever a Product or PDF is saved */}
      {pageRefreshMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1 text-xs font-bold leading-snug">
            {pageRefreshMessage}
          </div>
          <button
            type="button"
            onClick={() => setPageRefreshMessage('')}
            className="text-[11px] text-emerald-200 hover:text-white font-bold px-2 py-1"
          >
            OK
          </button>
        </div>
      )}

      {/* Top Admin Active Banner if unlocked ONLY on this session */}
      {isAdminUnlocked && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-sm z-50">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0" />
            <span>Sesión de Administrador Activa (Clave ****)</span>
            <span className="hidden md:inline font-normal text-slate-900">
              — Descarga libre sin clave en todos los PDFs ($20 y Gratis). Al guardar un producto o PDF la página se actualiza al instante.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-950/15 text-slate-950 rounded-md text-[11px] font-bold">
              <Users className="w-3 h-3" />
              <span>{presence.totalOnline} {presence.totalOnline === 1 ? 'usuario' : 'usuarios'} en línea</span>
            </span>

            <button
              type="button"
              onClick={() => {
                void performCrossDeviceSync();
                refreshPageData('¡Página sincronizada entre Laptop, Celular e iOS al instante!');
              }}
              className="px-2 py-0.5 bg-white/80 hover:bg-white text-slate-950 rounded-md text-[11px] font-bold flex items-center gap-1"
              title="Sincronizar y actualizar vista entre todos tus aparatos"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            {activeTab !== 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="px-2.5 py-0.5 bg-slate-950 text-white rounded-md text-[11px] font-bold hover:bg-slate-800"
              >
                Abrir Panel Admin
              </button>
            )}
            <button
              type="button"
              onClick={handleLockAdmin}
              className="px-2 py-0.5 bg-red-700 text-white hover:bg-red-800 rounded text-[11px] flex items-center gap-1 font-bold"
              title="Cerrar sesión de administrador ahora"
            >
              <Lock className="w-3 h-3" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'admin' && !isAdminUnlocked) {
            setIsAdminModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        cartCount={totalCartCount}
        openCart={() => setIsCartOpen(true)}
        isAdminUnlocked={isAdminUnlocked}
        openAdminModal={() => setIsAdminModalOpen(true)}
        presence={presence}
      />

      {/* Main View Content */}
      <main className="flex-1">
        
        {/* Catalog View */}
        {activeTab === 'catalog' && (
          <>
            <Hero
              onExploreCatalog={() => {
                const el = document.getElementById('catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onExplorePdfs={() => setActiveTab('pdfs')}
            />

            <div id="catalog-section">
              <ProductGrid
                products={products}
                onAddToCart={handleAddToCart}
                isAdmin={isAdminUnlocked}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
              />
            </div>
          </>
        )}

        {/* PDFs Download Store View */}
        {activeTab === 'pdfs' && (
          <PdfStore
            pdfs={pdfs}
            products={products}
            isAdmin={isAdminUnlocked}
            onUpdatePdf={handleUpdatePdf}
            onDeletePdf={handleDeletePdf}
            onOpenAddPdf={() => {
              if (isAdminUnlocked) {
                setIsAddPdfModalOpen(true);
              } else {
                setIsAdminModalOpen(true);
              }
            }}
          />
        )}

        {/* Admin Panel View */}
        {activeTab === 'admin' && isAdminUnlocked && (
          <AdminPanel
            products={products}
            pdfs={pdfs}
            presence={presence}
            onOpenAddProduct={() => setIsAddProductModalOpen(true)}
            onOpenAddPdf={() => setIsAddPdfModalOpen(true)}
            onAddPdfDirect={handleAddPdf}
            onAddPdfsBatch={handleAddPdfsBatch}
            onDeleteProduct={handleDeleteProduct}
            onDeletePdf={handleDeletePdf}
            onUpdatePdf={handleUpdatePdf}
            onUpdateProduct={handleUpdateProduct}
            onLockAdmin={handleLockAdmin}
            onResetDefaults={handleResetDefaults}
          />
        )}

      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
      />

      {/* Admin Passcode Modal (Connects ONLY with Admin Key ****) */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={handleUnlockAdmin}
      />

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAddProduct={handleAddProduct}
      />

      {/* Add PDF Upload Modal */}
      <AddPdfModal
        isOpen={isAddPdfModalOpen}
        onClose={() => setIsAddPdfModalOpen(false)}
        currentPdfsCount={pdfs.length}
        onAddPdf={handleAddPdf}
        onAddPdfsBatch={handleAddPdfsBatch}
        onUpdatePdf={handleUpdatePdf}
      />

      {/* Footer */}
      <Footer onNavigate={(tab) => {
        if (tab === 'admin' && !isAdminUnlocked) {
          setIsAdminModalOpen(true);
        } else {
          setActiveTab(tab);
        }
      }} />

    </div>
  );
}
