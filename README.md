# Stokki

Control de stock rápido para bar, pensado para usarse durante una fiesta:
botones grandes, poca fricción, varias personas vendiendo a la vez.

## 1. Crear el proyecto de Firebase

1. Andá a https://console.firebase.google.com → **Agregar proyecto** → nombralo (ej. `stokki`).
2. Adentro del proyecto: **Authentication → Sign-in method → habilitar Google**.
3. **Firestore Database → Crear base de datos** (modo producción, la región no importa mucho, elegí `southamerica-east1` si querés la más cercana).
4. **Configuración del proyecto (ícono de engranaje) → Tus apps → Web (`</>`)** → registrá una app llamada `stokki-web`. Te va a dar un objeto `firebaseConfig`.

## 2. Configurar las variables de entorno

En la raíz del proyecto, copiá `.env.example` a `.env`:

```bash
cp .env.example .env
```

Y completá cada valor con lo que te dio Firebase en el paso anterior (`apiKey`, `authDomain`, `projectId`, etc.). El archivo `.env` nunca se sube al repo (ya está en `.gitignore`).

## 3. Instalar dependencias y correr local

```bash
npm install
npm run dev
```

Se abre en `http://localhost:5173`.

## 4. Habilitarte a vos mismo como el primer usuario

Como el whitelist de equipo (`equipo_autorizado`) se gestiona a mano por seguridad, tenés que crear el primer registro manualmente:

1. Andá a Firestore Database en la consola de Firebase → **Iniciar colección**.
2. ID de la colección: `equipo_autorizado`.
3. ID del documento: **tu email de Google, todo en minúscula** (ej. `tunombre@gmail.com`).
4. Agregale un campo cualquiera, por ejemplo `name` (string) con tu nombre.
5. Guardar.

Ahora cuando entres a la app con Google con ese mismo email, vas a quedar autorizado. Para sumar a alguien más del equipo, repetís este paso con su email.

## 5. Subir las reglas de seguridad de Firestore

Esto es importante — sin esto, cualquiera con el link podría leer/escribir tu base de datos.

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # elegí el proyecto que creaste, aceptá usar firestore.rules existente
firebase deploy --only firestore:rules
```

## 6. Cargar productos

Con la app corriendo, andá a la pestaña **Productos** y cargá cada uno con costo, precio de venta, stock inicial y el umbral de alerta de stock bajo.

## 7. Deploy para el sábado (Firebase Hosting)

```bash
npm run build
firebase init hosting     # public directory: dist — configurar como single-page app: sí
firebase deploy --only hosting
```

Te da una URL tipo `https://stokki-xxxx.web.app` — esa es la que abrís desde los celulares del equipo esa noche.

## Cómo se usa en la fiesta

- **Vender**: un toque en el producto lo vende al precio regular, sin confirmar nada — vibra, sale un `−1` y el stock baja. Para cobrar otro precio o regalar, **mantené apretado** el producto y se abre la hoja con las opciones.
- **Corregir**: abajo queda la barra con los últimos 5 movimientos. Tocás uno y se convierte en "Anular ✕"; lo tocás de nuevo y se deshace (devuelve el stock y borra la venta). Si no confirmás, vuelve solo a los 3 segundos. Los movimientos de más de 2 minutos se caen de la barra.
- **Eventos**: antes de arrancar la noche, andá a la pestaña Eventos y tocá "Iniciar evento" (ej. "Fiesta sábado"). Al cerrar la noche, tocás "Cerrar evento". Todo lo vendido en el medio queda agrupado ahí.
- **Reportes**: podés ver todo agrupado por día o por evento, con el total recaudado, cuántos regalos y por qué motivo, y el ranking de productos más vendidos.

## Roadmap para la versión de Play Store

Esta versión web es el MVP para el sábado. Cosas que quedan para cuando se reformule como app nativa:
- Roles separados (admin vs staff) en vez de whitelist plana
- Persistencia offline más robusta
- Convertir a app instalable / nativa para publicar en Play Store
