# PanasVE — App web (React + Supabase)

Conecta restaurantes/chefs con refugios para coordinar comidas. Frontend en React
(Vite), backend en Supabase. Listo para subir a Vercel.

## Requisitos previos
- Node.js 18+ instalado
- Tu proyecto de Supabase ya creado con el `schema.sql` ejecutado
- La Edge Function `notify-order` desplegada (para correos)

---

## 1. Instalar

Abre la terminal dentro de esta carpeta y corre:

```bash
npm install
```

## 2. Configurar tus llaves de Supabase

Copia el archivo de ejemplo y edítalo:

```bash
cp .env.example .env
```

Abre `.env` y pega tus dos valores (los encuentras en Supabase → **Settings → API**):

```
VITE_SUPABASE_URL=https://palqyzgwjobvcbinarfk.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_public_key_aqui
```

> Usa la llave **anon public**, NUNCA la `service_role` en el frontend.

## 3. Probar en local

```bash
npm run dev
```

Abre el enlace que aparece (normalmente http://localhost:5173).

---

## Cómo funciona

| Quién       | Acceso                    | Qué puede hacer                                       |
|-------------|---------------------------|------------------------------------------------------|
| Refugio     | Sin login (público)       | Publicar pedidos; autocompleta si ya existe          |
| Proveedor   | Email + contraseña        | Ver pedidos por cercanía; tomar / entregar / liberar |
| Admin       | Email en `admin_emails`   | Panel con todos los pedidos y proveedores            |

- El primer admin es `tinat.venezuela@gmail.com`. Cuando esa cuenta se registre
  desde la pantalla de login, entrará como admin automáticamente y verá la pestaña **Admin**.
- Los pedidos se actualizan **en vivo** (realtime) sin recargar la página.
- Al cambiar el estado de un pedido o crear uno nuevo, las Edge Functions envían
  los correos (si configuraste Resend).

---

## 4. Subir a Vercel

1. Sube esta carpeta a un repositorio en GitHub.
2. Entra a [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. Framework preset: **Vite** (lo detecta solo).
4. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy**. En ~1 minuto tendrás tu URL pública.

> Cuando compres `panasve.com`, lo conectas en Vercel → Settings → Domains.

---

## Estructura

```
src/
├── lib/supabase.js         Cliente Supabase + utilidades (distancia, fechas)
├── context/AuthContext.jsx Sesión y perfil del usuario
├── components/
│   ├── Nav.jsx             Barra de navegación
│   ├── OrderCard.jsx       Tarjeta de pedido con acciones
│   └── Toast.jsx           Notificaciones
├── pages/
│   ├── Orders.jsx          Lista de pedidos (público + proveedor, realtime)
│   ├── NewOrder.jsx        Crear pedido con autocompletado de refugio
│   ├── Login.jsx           Login y registro de proveedores
│   ├── Profile.jsx         Perfil del proveedor
│   └── Admin.jsx           Panel de administración
└── App.jsx                 Rutas
```

---

## Notas

- Si al registrarte te pide confirmar el correo, desactiva "Confirm email" en
  Supabase → Authentication → Providers → Email (para empezar más rápido).
- Las coordenadas se ingresan como `lat,lng` (ej: `10.4806,-66.9036`). Sirven para
  ordenar pedidos por cercanía. Sin ellas, el orden es por fecha.
