# Bumko

Control de stock rápido para bar, pensado para usarse durante una fiesta:
botones grandes, poca fricción, varias personas vendiendo a la vez.

## 1. Crear el proyecto de Firebase

1. Andá a https://console.firebase.google.com → **Agregar proyecto** → nombralo (ej. `bumko`).
2. Adentro del proyecto: **Authentication → Sign-in method → habilitar Google**.
3. **Firestore Database → Crear base de datos** (modo producción, la región no importa mucho, elegí `southamerica-east1` si querés la más cercana).
4. **Configuración del proyecto (ícono de engranaje) → Tus apps → Web (`</>`)** → registrá una app llamada `bumko-web`. Te va a dar un objeto `firebaseConfig`.

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

## 4. Crearte como el primer admin

El resto del equipo se registra solo: cualquiera que entre con Google queda
guardado en `equipo_autorizado` con rol `staff`. Pero el **primer admin** no
puede crearse desde la app — nadie puede darse permisos a sí mismo —, así que
va a mano una única vez:

1. Andá a Firestore Database en la consola de Firebase → **Iniciar colección**.
2. ID de la colección: `equipo_autorizado`.
3. ID del documento: **tu email de Google, todo en minúscula** (ej. `tunombre@gmail.com`).
4. Agregale estos campos:
   - `email` (string) → tu mismo email
   - `name` (string) → tu nombre
   - `role` (string) → `admin`
   - `active` (boolean) → `true`
5. Guardar.

Desde ahí, entrás con Google y ya podés gestionar al resto desde la pestaña
**Equipo**: cambiar a alguien de staff a admin, suspenderlo o sacarlo.

### Qué puede hacer cada rol

| | Vender | Eventos | Stock | Reportes | Equipo |
|---|---|---|---|---|---|
| **Admin** | sí | sí | sí | sí | sí |
| **Staff** | sí | — | — | — | — |

El staff ve las otras pestañas deshabilitadas. La restricción está en tres
capas: el tab no se puede tocar, la ruta redirige a Vender si se escribe la
URL a mano, y las reglas de Firestore rechazan la escritura — esa última es la
única que no se puede saltar desde el navegador.

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

Te da una URL tipo `https://bumko-xxxx.web.app` — esa es la que abrís desde los celulares del equipo esa noche.

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
