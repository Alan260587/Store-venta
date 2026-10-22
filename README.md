# Sheló NABEL • Jhosie Girón (Catálogo Oficial y Biblioteca PDF)

Aplicación web oficial de **Sheló NABEL • Jhosie Girón** (`6621395110`) con:
- **Catálogo completo de productos** (Línea Sheló, Salud y Bienestar, Cuidado de la Piel, Capilar, Corporal, Bebés y Folders Escolares).
- **Menú desplegable (`=`) con Buscador Rápido integrado** y filtros directos al catálogo y a la biblioteca de PDFs.
- **Biblioteca de 17+ PDFs Oficiales** con **Vista Previa de 8 páginas**, lector de PDF en pantalla completa y descarga directa o con clave.
- **Sincronización automática en tiempo real (Firebase Cloud Firestore)** entre Laptop, Android, iOS y Tablet al guardar productos o subir/editar PDFs.
- **Botón flotante de WhatsApp Directo** (`662 139 5110`).

---

## Cómo desplegar en GitHub y GitHub Pages

Este proyecto ya incluye el flujo automático de despliegue en `.github/workflows/deploy.yml`.

### Opción A: Desde Google AI Studio (1 clic)
1. En la barra superior derecha de **Google AI Studio**, haz clic en el ícono de **GitHub (Export to GitHub)**.
2. Conecta tu cuenta de GitHub, elige el nombre para tu repositorio (por ejemplo: `shelo-nabel-jhosie-giron`) y haz clic en **Create / Push**.
3. En tu repositorio de GitHub, ve a **Settings** → **Pages**.
4. En **Build and deployment** → **Source**, selecciona **GitHub Actions**.
5. ¡Listo! El workflow `Deploy Sheló NABEL App to GitHub Pages` publicará automáticamente tu página web y mantendrá la sincronización en tiempo real con Firebase Firestore en todos tus dispositivos.

### Opción B: Ejecución local
```bash
npm install
npm run dev
```
