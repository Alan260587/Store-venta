# Security Specification — Sheló NABEL Multi-Device Catalog & PDF Store

## 1. Data Invariants

1. **Global Default-Deny Safety Net**: Every path not explicitly matched under `/databases/{database}/documents` is unconditionally denied (`allow read, write: if false;`).
2. **Path Variable Hardening (`isValidId`)**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates that the document ID matches `^[a-zA-Z0-9_\-]+$` and has `.size() >= 1 && .size() <= 128`.
3. **Authentication & Verification Gate**: Every write operation (`create`, `update`, `delete`) requires `isSignedIn()` (`request.auth != null`) and `isVerifiedUser()` (`request.auth.token.email_verified == true`).
4. **Bootstrapped Admin & Role Lookup (`isAdmin`)**: Admin status is strictly derived from either a verified email match for the bootstrapped owner (`request.auth.token.email == 'javieralanrodriguezyescas31@gmail.com' && request.auth.token.email_verified == true`) or `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`. Never trust custom claims or client-supplied role fields.
5. **Strict Blueprint Validation (`isValidProduct`, `isValidPdfDocument`, `isValidDeletedRecord`, `isValidAdminRecord`)**:
   - Every `create` operation enforces `keys().hasAll(...)` and `keys().hasOnly(...)` to block shadow/ghost fields.
   - Every `update` operation begins with the entity validation helper `isValid[Entity](incoming())` and restricts modified keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
   - Every string field enforces both `is string` and explicit `.size()` bounds matching `firebase-blueprint.json`.
   - `authorUid` on `create` must equal `request.auth.uid`, and `createdAt` must remained immutable on `update` (`incoming().createdAt == existing().createdAt`).
   - Temporal integrity: `createdAt == request.time` on `create`, and `updatedAt == request.time` on `create` and `update`.
6. **Secure List Queries (Query Enforcer)**: Every `allow list` rule evaluates `resource.data.visibility == 'public'` without delegating security to client comments and without performing `get()` or `exists()` inside `allow list`.

---

## 2. The "Dirty Dozen" Payloads (Designed to Break Identity, Integrity, and State)

1. **Payload 1 — Shadow Field Injection on Product Creation**
   ```json
   {
     "id": "p-shadow-1",
     "clave": "S100",
     "name": "Crema Facial",
     "price": 150,
     "size": "100 ml",
     "category": "Cuidado Facial",
     "description": "Crema hidratante",
     "image": "https://images.unsplash.com/photo-1",
     "visibility": "public",
     "authorUid": "user-123",
     "updatedAtMs": 1729550000000,
     "createdAt": "REQUEST_TIME",
     "updatedAt": "REQUEST_TIME",
     "isVerifiedAdmin": true
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `keys().hasOnly(...)`).

2. **Payload 2 — Identity Spoofing (`authorUid` mismatch on Product Creation)**
   ```json
   {
     "id": "p-spoof-1",
     "clave": "S101",
     "name": "Shampoo Capilar",
     "price": 180,
     "size": "500 ml",
     "category": "Cuidado Capilar",
     "description": "Control caida",
     "image": "https://images.unsplash.com/photo-2",
     "visibility": "public",
     "authorUid": "victim-uid-999",
     "updatedAtMs": 1729550000000,
     "createdAt": "REQUEST_TIME",
     "updatedAt": "REQUEST_TIME"
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `data.authorUid == request.auth.uid`).

3. **Payload 3 — Unverified Email Spoof Attack on Admin Action**
   ```json
   {
     "auth": {
       "uid": "attacker-1",
       "token": {
         "email": "javieralanrodriguezyescas31@gmail.com",
         "email_verified": false
       }
     },
     "collection": "products",
     "docId": "p-1",
     "operation": "delete"
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `request.auth.token.email_verified == true`).

4. **Payload 4 — Self-Assigned Admin Privilege Escalation**
   ```json
   {
     "collection": "admins",
     "docId": "regular-user-1",
     "data": {
       "uid": "regular-user-1",
       "role": "admin",
       "createdAt": "REQUEST_TIME",
       "updatedAt": "REQUEST_TIME"
     }
   }
   ```
   *Expected*: `PERMISSION_DENIED` (non-admin cannot create `/admins/{adminUid}`).

5. **Payload 5 — Path ID Poisoning (Invalid Regex / Oversized ID)**
   ```json
   {
     "collection": "pdfs",
     "docId": "pdf-malicious-$#@!../etc/passwd",
     "data": {
       "id": "pdf-malicious-$#@!../etc/passwd",
       "title": "Catalogo",
       "description": "Desc",
       "pagesCount": 10,
       "price": 20,
       "downloadKey": "SN-2026",
       "uploadedAt": "2026-10-21",
       "fileSize": "1.2 MB",
       "category": "Catálogo Oficial",
       "visibility": "public",
       "authorUid": "user-123",
       "updatedAtMs": 1729550000000,
       "createdAt": "REQUEST_TIME",
       "updatedAt": "REQUEST_TIME"
     }
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `isValidId(pdfId)`).

6. **Payload 6 — Value Poisoning on Whitelisted Update Field (`price` as String)**
   ```json
   {
     "collection": "products",
     "docId": "p-1",
     "operation": "update",
     "data": {
       "price": "FREE_HACK",
       "updatedAt": "REQUEST_TIME"
     }
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `isValidProduct(incoming())` requiring `data.price is number`).

7. **Payload 7 — Resource Exhaustion / Oversized Title String on PDF**
   ```json
   {
     "collection": "pdfs",
     "docId": "pdf-huge",
     "data": {
       "id": "pdf-huge",
       "title": "<STRING_OF_5000_CHARS>",
       "description": "Valid description",
       "pagesCount": 10,
       "price": 20,
       "downloadKey": "SN-2026",
       "uploadedAt": "2026-10-21",
       "fileSize": "1.0 MB",
       "category": "Catálogo Oficial",
       "visibility": "public",
       "authorUid": "user-123",
       "updatedAtMs": 1729550000000,
       "createdAt": "REQUEST_TIME",
       "updatedAt": "REQUEST_TIME"
     }
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `data.title.size() <= 250`).

8. **Payload 8 — Immortal Field Mutation (`createdAt` or `id` modified during Update)**
   ```json
   {
     "collection": "pdfs",
     "docId": "pdf-1",
     "operation": "update",
     "data": {
       "title": "Updated Title",
       "createdAt": "2020-01-01T00:00:00Z",
       "updatedAt": "REQUEST_TIME"
     }
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `incoming().createdAt == existing().createdAt` and `affectedKeys().hasOnly(...)`).

9. **Payload 9 — Forged Client Timestamp (`updatedAt` != `request.time`)**
   ```json
   {
     "collection": "products",
     "docId": "p-1",
     "operation": "update",
     "data": {
       "price": 299,
       "updatedAt": "2099-12-31T23:59:59Z"
     }
   }
   ```
   *Expected*: `PERMISSION_DENIED` (blocked by `incoming().updatedAt == request.time`).

10. **Payload 10 — Invalid Enum Value on `DeletedRecord.itemType`**
    ```json
    {
      "collection": "deletedItems",
      "docId": "item-1",
      "data": {
        "id": "item-1",
        "itemType": "users_table",
        "visibility": "public",
        "authorUid": "user-123",
        "createdAt": "REQUEST_TIME",
        "updatedAt": "REQUEST_TIME"
      }
    }
    ```
    *Expected*: `PERMISSION_DENIED` (blocked by `data.itemType in ['product', 'pdf']`).

11. **Payload 11 — Invalid PDF Price Tier (Negative Price)**
    ```json
    {
      "collection": "pdfs",
      "docId": "pdf-neg",
      "data": {
        "id": "pdf-neg",
        "title": "Catalogo",
        "description": "Desc",
        "pagesCount": 15,
        "price": -500,
        "downloadKey": "SN-2026",
        "uploadedAt": "2026-10-21",
        "fileSize": "1.0 MB",
        "category": "Catálogo Oficial",
        "visibility": "public",
        "authorUid": "user-123",
        "updatedAtMs": 1729550000000,
        "createdAt": "REQUEST_TIME",
        "updatedAt": "REQUEST_TIME"
      }
    }
    ```
    *Expected*: `PERMISSION_DENIED` (blocked by `data.price in [0, 20]`).

12. **Payload 12 — Unbounded List Query Without Visibility Filter**
    ```json
    {
      "collection": "products",
      "operation": "list",
      "query": "SELECT * FROM products (no where visibility == 'public')"
    }
    ```
    *Expected*: `PERMISSION_DENIED` (blocked by `allow list: if resource.data.visibility == 'public'`).

---

## 3. Red Team Audit & Conflict Report

- **Collection `/products/{productId}`**:
  - Identity Spoofing: Blocked (`incoming().authorUid == request.auth.uid` on create; `incoming().authorUid == existing().authorUid || isAdmin()` on update).
  - Shadow Update Test: Blocked (`keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update).
  - Value Poisoning Test: Blocked (`isValidProduct(incoming())` wraps the entire `allow update` expression).
  - Resource Poisoning: Blocked (`isValidId(productId)` and `.size()` limits on every string field).
- **Collection `/pdfs/{pdfId}`**:
  - Identity Spoofing: Blocked (`incoming().authorUid == request.auth.uid` on create).
  - Shadow Update Test: Blocked (`keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`).
  - Value Poisoning Test: Blocked (`isValidPdfDocument(incoming())` wraps `allow update`).
  - Resource Poisoning: Blocked (`isValidId(pdfId)` and `.size()` limits on every string field).
- **Collection `/deletedItems/{itemId}`**:
  - Identity Spoofing: Blocked (`incoming().authorUid == request.auth.uid`).
  - Shadow Update Test: Blocked (`keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`).
- **Collection `/admins/{adminUid}`**:
  - Privilege Escalation: Blocked (only `isAdmin()` can create, update, or delete admin records; `allow get` restricted to `isSignedIn() && (request.auth.uid == adminUid || isAdmin())`).
