/**
 * Security Rules Verification Suite for Sheló NABEL Store (firestore.rules)
 * Validates that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'delete' | 'list' | 'get';
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Product Creation',
    collection: 'products',
    docId: 'p-shadow-1',
    operation: 'create',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      id: 'p-shadow-1',
      clave: 'S100',
      name: 'Crema Facial',
      price: 150,
      size: '100 ml',
      category: 'Cuidado Facial',
      description: 'Crema hidratante',
      image: 'https://images.unsplash.com/photo-1',
      visibility: 'public',
      authorUid: 'user-123',
      updatedAtMs: 1729550000000,
      isVerifiedAdmin: true
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Identity Spoofing (authorUid mismatch on Product Creation)',
    collection: 'products',
    docId: 'p-spoof-1',
    operation: 'create',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      id: 'p-spoof-1',
      clave: 'S101',
      name: 'Shampoo Capilar',
      price: 180,
      size: '500 ml',
      category: 'Cuidado Capilar',
      description: 'Control caida',
      image: 'https://images.unsplash.com/photo-2',
      visibility: 'public',
      authorUid: 'victim-uid-999',
      updatedAtMs: 1729550000000
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Unverified Email Spoof Attack on Admin Action',
    collection: 'products',
    docId: 'p-1',
    operation: 'delete',
    auth: { uid: 'attacker-1', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Self-Assigned Admin Privilege Escalation',
    collection: 'admins',
    docId: 'regular-user-1',
    operation: 'create',
    auth: { uid: 'regular-user-1', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'regular-user-1',
      role: 'admin'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Path ID Poisoning (Invalid Regex)',
    collection: 'pdfs',
    docId: 'pdf-malicious-$#@!',
    operation: 'create',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      id: 'pdf-malicious-$#@!',
      title: 'Catalogo',
      description: 'Desc',
      pagesCount: 10,
      price: 20,
      downloadKey: 'SN-2026',
      uploadedAt: '2026-10-21',
      fileSize: '1.2 MB',
      category: 'Catálogo Oficial',
      visibility: 'public',
      authorUid: 'user-123',
      updatedAtMs: 1729550000000
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Value Poisoning on Whitelisted Update Field (price as string)',
    collection: 'products',
    docId: 'p-1',
    operation: 'update',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      price: 'FREE_HACK'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Resource Exhaustion / Oversized Title String on PDF',
    collection: 'pdfs',
    docId: 'pdf-huge',
    operation: 'create',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      id: 'pdf-huge',
      title: 'A'.repeat(5000),
      description: 'Valid description',
      pagesCount: 10,
      price: 20,
      downloadKey: 'SN-2026',
      uploadedAt: '2026-10-21',
      fileSize: '1.0 MB',
      category: 'Catálogo Oficial',
      visibility: 'public',
      authorUid: 'user-123',
      updatedAtMs: 1729550000000
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Immortal Field Mutation (createdAt modified during Update)',
    collection: 'pdfs',
    docId: 'pdf-1',
    operation: 'update',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      title: 'Updated Title',
      createdAt: '2020-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Forged Client Timestamp (updatedAt != request.time)',
    collection: 'products',
    docId: 'p-1',
    operation: 'update',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      price: 299,
      updatedAt: '2099-12-31T23:59:59Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Invalid Enum Value on DeletedRecord.itemType',
    collection: 'deletedItems',
    docId: 'item-1',
    operation: 'create',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      id: 'item-1',
      itemType: 'users_table',
      visibility: 'public',
      authorUid: 'user-123'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Invalid PDF Price Tier (Negative Price)',
    collection: 'pdfs',
    docId: 'pdf-neg',
    operation: 'create',
    auth: { uid: 'user-123', email: 'javieralanrodriguezyescas31@gmail.com', email_verified: true },
    payload: {
      id: 'pdf-neg',
      title: 'Catalogo',
      description: 'Desc',
      pagesCount: 15,
      price: -500,
      downloadKey: 'SN-2026',
      uploadedAt: '2026-10-21',
      fileSize: '1.0 MB',
      category: 'Catálogo Oficial',
      visibility: 'public',
      authorUid: 'user-123',
      updatedAtMs: 1729550000000
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Unauthenticated Write Attempt',
    collection: 'products',
    docId: 'p-unauth',
    operation: 'create',
    auth: null,
    payload: {
      id: 'p-unauth',
      clave: 'S100',
      name: 'Crema',
      price: 100
    },
    expectedResult: 'PERMISSION_DENIED'
  }
];
