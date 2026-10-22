# Security Specification — Sheló NABEL Multi-Device Store

## 1. Authentication & Authorization Model
- **Public Store Catalog & PDF Store**: All customers on Laptop, Android, iOS, and Tablet can read public products (`/products`), PDF metadata (`/pdfs`), PDF binary chunks (`/pdfChunks`), and deletion tombstones (`/deletedItems`) where `visibility == 'public'`.
- **Instant Multi-Device Admin Writes (On Save)**:
  - Administrators unlock the Admin Panel on any device (Laptop, Android, iOS, or Tablet) using the unified Admin Key (`1987` or `2026`).
  - Whenever an administrator clicks **"Guardar"** on a PDF or Product, the client immediately writes the validated payload (including `adminKey` and strict schema fields) to Firebase Cloud Firestore (`/pdfs`, `/pdfChunks`, `/products`, `/deletedItems`) and the Cloud Server without requiring manual synchronization.
  - Role registry `/admins/{adminUid}` remains restricted to verified administrators (`isAdmin()`).

## 2. Collection Rules & Schema Enforcement
- `/products/{productId}`: Enforces `isValidProduct(incoming())` on both `create` and `update`, verifying `hasAll`, `hasOnly`, string bounds, price bounds, `visibility == 'public'`, `hasValidAdminKey(incoming())`, and `updatedAt == request.time`.
- `/pdfs/{pdfId}`: Enforces `isValidPdfDocument(incoming())` on both `create` and `update`, verifying `hasAll`, `hasOnly`, string bounds, `price == 0 || price == 20`, `visibility == 'public'`, `hasValidAdminKey(incoming())`, and `updatedAt == request.time`.
- `/pdfChunks/{chunkId}`: Enforces `isValidPdfChunk(incoming())` on both `create` and `update`, storing base64 slices (`<= 800000` chars) so uploaded PDF files are immediately available in Firebase across Laptop, Android, iOS, and Tablet.
- `/deletedItems/{itemId}`: Enforces `isValidDeletedRecord(incoming())` for cross-device deletion tombstones.
- `/admins/{adminUid}`: Enforces `isAdmin()` and `isValidAdminRecord(incoming())`.
