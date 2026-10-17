import React, { useState, useEffect } from 'react';
import { Product, PdfDocument, CartItem } from './types';
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
import { ShieldCheck, Lock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'pdfs' | 'admin'>('catalog');
  
  // Database State
  const [products, setProducts] = useState<Product[]>([]);
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Admin Access State (Persistent across reload)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => dbStorage.isAdminUnlocked());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Modals State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);
  const [isAddPdfModalOpen, setIsAddPdfModalOpen] = useState<boolean>(false);

  // Load Initial Data from storage
  useEffect(() => {
    setProducts(dbStorage.getProducts());
    setPdfs(dbStorage.getPdfs());
  }, []);

  // Sync admin state
  const handleUnlockAdmin = () => {
    dbStorage.setAdminUnlocked(true);
    setIsAdminUnlocked(true);
    setIsAdminModalOpen(false);
    setActiveTab('admin');
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

  // Product Operations
  const handleAddProduct = (productData: Omit<Product, 'id'>) => {
    dbStorage.addProduct(productData);
    setProducts(dbStorage.getProducts());
  };

  const handleUpdateProduct = (product: Product) => {
    dbStorage.updateProduct(product);
    setProducts(dbStorage.getProducts());
  };

  const handleDeleteProduct = (id: string) => {
    dbStorage.deleteProduct(id);
    setProducts(dbStorage.getProducts());
  };

  // PDF Operations
  const handleAddPdf = (pdfData: Omit<PdfDocument, 'id' | 'uploadedAt'>) => {
    const result = dbStorage.addPdf(pdfData);
    if (result.success) {
      setPdfs(dbStorage.getPdfs());
    }
    return result;
  };

  const handleAddPdfsBatch = (pdfList: Array<Omit<PdfDocument, 'id' | 'uploadedAt'>>) => {
    const result = dbStorage.addPdfsBatch(pdfList);
    if (result.success) {
      setPdfs(dbStorage.getPdfs());
    }
    return result;
  };

  const handleUpdatePdf = (pdf: PdfDocument) => {
    dbStorage.updatePdf(pdf);
    setPdfs(dbStorage.getPdfs());
  };

  const handleDeletePdf = (id: string) => {
    dbStorage.deletePdf(id);
    pdfFileStore.deleteFile(id);
    setPdfs(dbStorage.getPdfs());
  };

  const handleResetDefaults = () => {
    dbStorage.resetDefaults();
    setProducts(dbStorage.getProducts());
    setPdfs(dbStorage.getPdfs());
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Top Admin Active Banner if unlocked */}
      {isAdminUnlocked && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-sm z-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>Acceso Total Administrador Activo (Clave ****)</span>
            <span className="hidden sm:inline font-normal text-slate-900">— Puedes subir PDFs, modificar títulos, ver claves de descarga y administrar productos</span>
          </div>

          <div className="flex items-center gap-2">
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
              className="p-1 hover:bg-amber-600 rounded text-slate-950 flex items-center gap-1 text-[11px]"
              title="Cerrar sesión de administrador"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bloquear</span>
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

      {/* Admin Passcode Modal (****) */}
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
