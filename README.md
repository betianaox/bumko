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

## 4. Crear tu bar y tu usuario admin

### Cómo están guardados los datos

Todo lo que produce un bar cuelga de su propio documento, y no de colecciones
sueltas. Esto es lo que permite que mañana convivan varios bares en la misma
base — cada uno ve solo lo suyo — y que la app nativa use exactamente estos
mismos datos sin migrar nada:

```
bares/{barId}
  ├─ equipo/{email}      quién trabaja acá y con qué rol
  ├─ products/{id}
  ├─ sales/{id}
  ├─ events/{id}
  └─ settings/caja

usuarios/{email} → { barId }    índice: a qué bar entra cada persona
```

### El primer bar va a mano

El primer admin no puede crearse desde la app — nadie puede darse permisos a
sí mismo —, así que se hace una vez desde la consola de Firebase:

1. **Firestore Database → Iniciar colección** → ID de colección: `bares`
2. ID del documento: elegí uno corto, ej. `casa` (va a ser tu `barId`).
   Campos: `name` (string, el nombre del bar) y `ownerEmail` (string, tu mail).
3. Adentro de ese documento → **Iniciar colección** → ID: `equipo`
4. ID del documento: **tu mail de Google en minúscula**. Campos:
   - `email` (string) → tu mismo mail
   - `name` (string) → tu nombre
   - `role` (string) → `admin`
   - `active` (boolean) → `true`
5. Volvé a la raíz → **Iniciar colección** → ID: `usuarios`
6. ID del documento: **tu mail** otra vez. Campo: `barId` (string) → `casa`

Ahora entrás con Google y ya estás adentro de tu bar.

### Sumar al resto del equipo

En la pestaña **Equipo** hay un interruptor de **entrada libre**:

- **Prendido** — cualquiera que abra el link de la web y entre con su cuenta
  de Google queda adentro del bar como staff, sin que nadie lo cargue. Es lo
  cómodo para una noche: pasás el link por el grupo y listo. Para que funcione,
  el  tiene que tener  con el id de tu bar.
- **Apagado** — solo entra quien esté en la lista. Ahí sumás gente a mano
  escribiendo su mail de Google.

En los dos casos entran como **staff** y nunca como admin: eso lo cambia un
admin después, desde la misma pantalla.

Conviene apagarlo cuando ya entraron todos. Mientras esté prendido, cualquiera
que tenga el link y una cuenta de Google puede sumarse y registrar ventas.

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
