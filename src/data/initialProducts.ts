import { Product } from '../types';
import { TIJERAS_WESTCOTT_IMG, CUADERNOS_ESCOLARES_IMG, CRAYONES_CRAYOLA_IMG } from '../utils/productImages';

export const INITIAL_PRODUCTS: Product[] = [
  // --- ARTÍCULOS ESCOLARES DE LAS IMÁGENES SUBIDAS (PRECIOS EXACTOS) ---
  {
    id: 'school-01',
    clave: 'ESC-01',
    name: 'Folders Escolares',
    price: 25,
    size: '1 pza c/u',
    category: 'Escolar y Accesorios',
    description: 'Folders escolares resistentes en colores vivos (Morado, Amarillo, Naranja y Azul). Elige el color de tu preferencia para organizar documentos y tareas.',
    image: CUADERNOS_ESCOLARES_IMG,
    isStarProduct: true,
    isNew: true,
    availableColors: [
      { name: 'Morado', hex: '#7c3aed' },
      { name: 'Amarillo', hex: '#facc15' },
      { name: 'Naranja', hex: '#f97316' },
      { name: 'Azul', hex: '#38bdf8' }
    ]
  },
  {
    id: 'school-02',
    clave: 'ESC-02',
    name: 'Tijeras Westcott',
    price: 35,
    size: '1 pza (2 Pack)',
    category: 'Escolar y Accesorios',
    description: 'Tijeras escolares Westcott para niños (Ages 6+), punta roma "Pointed Tip", hojas de acero inoxidable durable y mango ergonómico verde y amarillo.',
    image: TIJERAS_WESTCOTT_IMG,
    isStarProduct: true,
    isNew: true
  },
  {
    id: 'school-03',
    clave: 'ESC-03',
    name: 'Crayones Crayola 24',
    price: 40,
    size: 'Caja con 24 piezas',
    category: 'Escolar y Accesorios',
    description: 'Caja con 24 crayones de cera Crayola no tóxicos. La marca #1 preferida por padres y maestros con colores intensos y trazo suave.',
    image: CRAYONES_CRAYOLA_IMG,
    isStarProduct: true,
    isNew: true
  },

  // --- CATÁLOGO DE PRODUCTOS SHELÓ NABEL (PÁGINAS OFICIALES 1 - 148) ---
  {
    id: 'p-1701',
    clave: 'S1701',
    name: 'Baba de Caracol Crema Facial',
    price: 149,
    size: '100 ml',
    category: 'Cuidado Facial',
    description: 'Todos los beneficios de la alantoína, el colágeno y la elastina. Nuestro clásico favorito, ahora en versión práctica para llevar a todos lados.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-1703',
    clave: 'S1703',
    name: 'Agua Termal',
    price: 199,
    size: '140 ml',
    category: 'Cuidado Facial',
    description: 'Hidratación que ayuda a mantener la comodidad y el equilibrio de tu rostro durante el día. ¡Está de regreso!',
    image: 'https://images.unsplash.com/photo-1608248597379-24233777f722?auto=format&fit=crop&w=600&q=80',
    isNew: true
  },
  {
    id: 'p-1706',
    clave: 'S1706',
    name: 'Melena de León con Antocianinas',
    price: 399,
    size: '250 g',
    category: 'Salud y Bienestar',
    description: 'Combinación del hongo melena de león y antocianinas del arándano. Sabor arándano. Suplemento alimenticio para claridad, enfoque y calma.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
    isNew: true
  },
  {
    id: 'p-1704',
    clave: 'S1704',
    name: 'Rhodiola Suplemento Alimenticio',
    price: 399,
    size: '250 g',
    category: 'Salud y Bienestar',
    description: 'Planta tradicionalmente asociada al bienestar durante momentos de exigencia física o mental. Con piña y fresa.',
    image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1707',
    clave: 'S1707',
    name: 'NAD Colágeno Hidrolizado + Resveratrol',
    price: 579,
    size: '250 g',
    category: 'Salud y Bienestar',
    description: 'Fórmula con pulpa de frutas deshidratadas. Molécula esencial que apoya los procesos de energía del organismo y protección antioxidante.',
    image: 'https://images.unsplash.com/photo-1550572017-edf703cf0514?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-1708',
    clave: 'S1708',
    name: 'Triple Extracto de Ajo',
    price: 304,
    size: '30 ml',
    category: 'Salud y Bienestar',
    description: 'Ajo blanco, ajo negro y ajo japonés reunidos para ofrecer máxima concentración que impulsa tu equilibrio interno.',
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1712',
    clave: 'S1712',
    name: 'Ciruelo Africano & Sabal',
    price: 524,
    size: '20 sobres de 25 g c/u',
    category: 'Salud y Bienestar',
    description: 'Ciruelo africano y sabal en perfecta sinergia para acompañar el bienestar del hombre en cada etapa.',
    image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1705',
    clave: 'S1705',
    name: 'L-Glutamina Suplemento',
    price: 550,
    size: '250 g',
    category: 'Salud y Bienestar',
    description: 'Aminoácido abundante del cuerpo especialmente útil en periodos de mayor exigencia física. Con piña, mango y coco.',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1713',
    clave: 'S1713',
    name: 'Vita Niños Suplemento',
    price: 259,
    size: '60 tabletas',
    category: 'Línea Infantil',
    description: 'Con aislado de suero de leche, simbióticos, vitaminas B1 y B6 y magnesio para complementar la nutrición de niños en crecimiento.',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1711',
    clave: 'S1711',
    name: 'Suero de Centella Asiática',
    price: 229,
    size: '30 ml',
    category: 'Cuidado Facial',
    description: 'Extractos botánicos y naringenina con acción antioxidante que protege la piel frente a factores ambientales. ¡Fresco, ligero y efectivo!',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
    isNew: true
  },
  {
    id: 'p-1702',
    clave: 'S1702',
    name: 'Crema de Nopal Hidratante Facial',
    price: 149,
    size: '100 ml',
    category: 'Cuidado Facial',
    description: 'Luminosidad e hidratación profunda inspirada en un ingrediente icónico de México que da vida a tu piel.',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1710',
    clave: 'S1710',
    name: 'Barra Multiusos Labios y Mejillas - Cereza',
    price: 199,
    size: '6 g',
    category: 'Cosméticos y Aromas',
    description: 'Fórmula cremosa y suave con manteca de cacao y aceite de almendras para un acabado natural y radiante.',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1709',
    clave: 'S1709',
    name: 'Barra Multiusos Labios y Mejillas - Durazno',
    price: 199,
    size: '6 g',
    category: 'Cosméticos y Aromas',
    description: 'Resalta tus labios y mejillas con un toque cálido de color durazno. Enriquecido con manteca de cacao.',
    image: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1622',
    clave: 'S1622',
    name: 'Gotas de Zinc',
    price: 237,
    size: '30 ml',
    category: 'Salud y Bienestar',
    description: 'Aporta zinc, mineral esencial para el sistema inmunológico y bienestar orgánico.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s514',
    clave: 'S514',
    name: 'SN-S3 Pasiflora, Melisa y Valeriana',
    price: 314,
    size: '30 ml',
    category: 'Salud y Bienestar',
    description: 'Pasiflora, melisa y valeriana. Tu apoyo ideal para relajarte en los días más intensos.',
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1623',
    clave: 'S1623',
    name: 'Polvo con Citrato de Magnesio',
    price: 525,
    size: '250 g',
    category: 'Salud y Bienestar',
    description: 'Un aliado esencial para el equilibrio neuromuscular y bienestar diario.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1311',
    clave: 'S1311',
    name: 'Ashwagandha Adaptógeno Natural',
    price: 583,
    size: '20 sobres de 10 g c/u',
    category: 'Salud y Bienestar',
    description: 'Adaptógeno natural para equilibrar el ritmo del día a día con pulpa de durazno y manzana.',
    image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-1310',
    clave: 'S1310',
    name: 'Bacopa Monnieri Suplemento',
    price: 583,
    size: '20 sobres de 10 g c/u',
    category: 'Salud y Bienestar',
    description: 'Apoyo diario para una mente en calma inspirada en la sabiduría ancestral, con pulpa de guayaba y naranja.',
    image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-303',
    clave: 'S303',
    name: 'Complejo B Sabor Naranja',
    price: 524,
    size: '20 sobres de 10 g c/u',
    category: 'Salud y Bienestar',
    description: 'Con 7 vitaminas del complejo B (B1, B2, B3, B5, B6, B9, B12), más inositol y biotina. ¡Energía y concentración!',
    image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-302',
    clave: 'S302',
    name: 'Complejo B Sabor Moras',
    price: 524,
    size: '20 sobres de 10 g c/u',
    category: 'Salud y Bienestar',
    description: 'Con 7 vitaminas del complejo B (B1, B2, B3, B5, B6, B9, B12), más inositol y biotina. Delicioso sabor moras.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s731',
    clave: 'S731',
    name: 'Shampoo de Cola de Caballo',
    price: 398,
    size: '950 ml',
    category: 'Cuidado Capilar',
    description: 'Nutre y fortalece el folículo capilar, dejando el cabello visiblemente más brillante y sedoso.',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s1612',
    clave: 'S1612',
    name: 'Shampoo de Cebolla Antioxidante',
    price: 158,
    size: '530 ml',
    category: 'Cuidado Capilar',
    description: 'Cebolla y linaza para una limpieza profunda que fortalece desde la raíz y protege el cuero cabelludo.',
    image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s1012',
    clave: 'S1012',
    name: 'Shampoo de Bergamota con Minoxidil',
    price: 258,
    size: '530 ml',
    category: 'Cuidado Capilar',
    description: 'Ideal para fortalecer el cuero cabelludo, estimular el crecimiento y mejorar el grosor capilar.',
    image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-s060',
    clave: 'S060',
    name: 'Hielo Mineral Spray Refrescante',
    price: 314,
    size: '265 ml',
    category: 'Cuidado Corporal',
    description: 'Spray refrescante con mentol y eucalipto para sensación de alivio inmediato después del esfuerzo físico.',
    image: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-s061',
    clave: 'S061',
    name: 'Gel Tópico Therapygel',
    price: 251,
    size: '250 ml',
    category: 'Cuidado Corporal',
    description: 'Con mentol, extracto de menta piperita y alcanfor. Proporciona una sensación refrescante al contacto con la piel.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s001',
    clave: 'S001',
    name: 'Baba de Caracol Crema Facial Grande',
    price: 304,
    size: '250 ml',
    category: 'Cuidado Facial',
    description: 'Formato familiar. Ideal para mantener una piel renovada, firme e hidratada con extracto concentrado de baba de caracol.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-s161',
    clave: 'S161',
    name: 'Baba de Caracol Jabón Facial y Corporal',
    price: 83,
    size: '100 g',
    category: 'Cuidado Facial',
    description: 'Limpieza profunda y cuidado reparador en un solo paso con alantoína pura. ¡Suavidad extrema!',
    image: 'https://images.unsplash.com/photo-1607006482172-326174867582?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-s156',
    clave: 'S156',
    name: 'Baba de Caracol Crema Corporal',
    price: 394,
    size: '950 ml',
    category: 'Cuidado Corporal',
    description: 'Hidratación intensa y renovación diaria para todo el cuerpo con el poder regenerador de la alantoína.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-s054',
    clave: 'S054',
    name: 'Shampoo de Jitomate',
    price: 209,
    size: '530 ml',
    category: 'Cuidado Capilar',
    description: 'Enriquecido con jitomate, bardana, enebro y limón. Una mezcla perfecta para estimular el crecimiento capilar.',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s168',
    clave: 'S168',
    name: 'Shampoo de Manzanilla',
    price: 199,
    size: '530 ml',
    category: 'Cuidado Capilar',
    description: 'Aclara el tono del cabello de forma natural, realza su brillo dorado y proporciona frescura en el cuero cabelludo.',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s050',
    clave: 'S050',
    name: 'Shampoo Adiós Caspa',
    price: 237,
    size: '530 ml',
    category: 'Cuidado Capilar',
    description: 'Limpieza efectiva y cuero cabelludo sano gracias a la piritiona de zinc purificante.',
    image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s1306',
    clave: 'S1306',
    name: 'Suero Facial 2% Ácido Hialurónico',
    price: 352,
    size: '30 ml',
    category: 'Cuidado Facial',
    description: 'Ácido hialurónico con vitaminas B5 y B3. Hidratación diaria profunda de día y noche.',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-s1305',
    clave: 'S1305',
    name: 'Suero Facial Vitamina C 2.5%',
    price: 352,
    size: '30 ml',
    category: 'Cuidado Facial',
    description: 'Vitamina C y vitamina E, potentes antioxidantes para dar luminosidad y juventud a la piel.',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s501',
    clave: 'S501',
    name: 'Natural Pasta Dental con Sábila',
    price: 230,
    size: '100 ml',
    category: 'Cuidado Facial',
    description: 'Enriquecida con coenzima Q10, extractos de manzanilla, salvia, aloe vera y mentol para frescura duradera.',
    image: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'p-s021',
    clave: 'S021',
    name: 'Jabón Leche de Burra',
    price: 83,
    size: '100 g',
    category: 'Cuidado Corporal',
    description: 'Suavidad y tono uniforme con activos limpiadores e hidratantes que respetan la piel.',
    image: 'https://images.unsplash.com/photo-1607006482172-326174867582?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  },
  {
    id: 'p-s906',
    clave: 'S906',
    name: 'Jabón Carbón Activado',
    price: 100,
    size: '100 g',
    category: 'Cuidado Facial',
    description: 'Aceite de coco y carbón activado que absorbe la grasa y elimina impurezas. Ideal para piel mixta o grasa.',
    image: 'https://images.unsplash.com/photo-1607006482172-326174867582?auto=format&fit=crop&w=600&q=80',
    isStarProduct: true
  }
];
