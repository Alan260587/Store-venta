import React from 'react';
import { X, Trash2, Plus, Minus, MessageCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (cartItemKey: string, quantity: number) => void;
  onRemoveItem: (cartItemKey: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  if (!isOpen) return null;

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalItemsCount = cartItems.reduce(
    (count, item) => count + item.quantity,
    0
  );

  const getItemKey = (item: CartItem) =>
    item.cartItemKey || `${item.product.id}__${item.selectedColor || ''}`;

  // Generate WhatsApp URL according to exact required prompt format, including selected color if applicable
  const getWhatsAppOrderUrl = () => {
    let message = 'Hola, me gustaría comprar los siguientes artículos de Shelo NABEL:\n';
    
    cartItems.forEach((item) => {
      const itemSubtotal = item.product.price * item.quantity;
      const colorStr = item.selectedColor ? ` (Color: ${item.selectedColor})` : '';
      const claveStr = item.product.clave ? ` (Clave ${item.product.clave})` : '';
      message += `- ${item.quantity}x ${item.product.name}${colorStr}${claveStr} - $${itemSubtotal} MXN\n`;
    });

    message += `Total: $${totalAmount} MXN`;

    return `https://wa.me/526621395110?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-emerald-100">
          
          {/* Cart Header */}
          <div className="p-6 bg-gradient-to-r from-blue-950 via-blue-900 to-emerald-900 text-white flex items-center justify-between border-b-2 border-amber-400">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/shelon_logo_182b5079.jpeg"
                alt="Sheló NABEL"
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 bg-white shrink-0"
              />
              <div>
                <h2 className="font-serif font-bold text-lg">Carrito Sheló NABEL</h2>
                <p className="text-xs text-amber-200">
                  {totalItemsCount} {totalItemsCount === 1 ? 'artículo seleccionado' : 'artículos seleccionados'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-emerald-700 text-emerald-100 transition-colors"
              title="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-slate-100">
            {cartItems.length > 0 ? (
              cartItems.map((item) => {
                const key = getItemKey(item);
                const subtotal = item.product.price * item.quantity;
                const colorObj = item.product.availableColors?.find(
                  (c) => c.name === item.selectedColor
                );

                return (
                  <div key={key} className="pt-4 first:pt-0 flex gap-4 items-center">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 object-contain rounded-xl bg-slate-50 border border-slate-200 p-1 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-0.5">
                        <span>Clave: {item.product.clave}</span>
                        <span className="text-emerald-700 font-bold font-sans">${item.product.price} MXN c/u</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-800 truncate">
                        {item.product.name}
                      </h4>

                      {item.selectedColor && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 mb-1.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                          {colorObj && (
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-slate-300"
                              style={{ backgroundColor: colorObj.hex }}
                            />
                          )}
                          <span>Color: {item.selectedColor}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        {/* Quantity controls */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <button
                            onClick={() => onUpdateQuantity(key, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold font-mono">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(key, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="font-bold font-mono text-sm text-slate-900">
                          ${subtotal} MXN
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveItem(key)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar del carrito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-slate-800 mb-1">Tu carrito está vacío</h3>
                <p className="text-xs text-slate-500 mb-6">
                  Explora nuestro catálogo Shelo NABEL y agrega tus artículos preferidos.
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Explorar Productos
                </button>
              </div>
            )}
          </div>

          {/* Cart Footer */}
          {cartItems.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={onClearCart}
                  className="text-red-600 hover:text-red-700 font-medium underline"
                >
                  Vaciar carrito
                </button>
                <span>Número WhatsApp: +52 662 139 5110</span>
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-base">Total de la Compra</span>
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-emerald-800">
                    ${totalAmount} MXN
                  </span>
                  <p className="text-[10px] text-slate-500">Impuestos y envío coordinados en WhatsApp</p>
                </div>
              </div>

              {/* Primary WhatsApp Order Action Button */}
              <a
                href={getWhatsAppOrderUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-600/30 flex items-center justify-center gap-2.5 text-sm transition-all active:scale-98"
              >
                <MessageCircle className="w-5 h-5 text-amber-300" />
                <span>Enviar pedido por WhatsApp</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
