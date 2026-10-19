export type ProductCategory =
  | 'Todos'
  | 'Cuidado Facial'
  | 'Cuidado Capilar'
  | 'Cuidado Corporal'
  | 'Salud y Bienestar'
  | 'Línea Infantil'
  | 'Escolar y Accesorios'
  | 'Cosméticos y Aromas';

export interface ProductColorOption {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  clave: string;
  name: string;
  price: number;
  size: string;
  category: ProductCategory;
  description: string;
  image: string;
  isStarProduct?: boolean;
  isNew?: boolean;
  availableColors?: ProductColorOption[];
}

export interface PdfDocument {
  id: string;
  title: string;
  description: string;
  pagesCount: number;
  price: number; // 0 for Gratis, 20 for $20 MXN
  downloadKey?: string; // Unique key visible to Admin and required for Client download
  uploadedAt: string;
  fileSize: string;
  fileData?: string;
  category?: string;
}

export interface CartItem {
  cartItemKey?: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface MultiUserPresence {
  totalOnline: number;
  adminsOnline: number;
  clientsOnline: number;
}
