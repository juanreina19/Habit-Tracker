# Habit Tracker — Setup Guide

## 0. Requisitos previos

- **Node.js 20+** — verifica con `node -v`
- **pnpm 9+** — instálalo una sola vez con:
  ```bash
  npm install -g pnpm@9
  # o con el instalador oficial:
  curl -fsSL https://get.pnpm.io/install.sh | sh
  ```
  Verifica con `pnpm -v`

---

## 1. Instalar dependencias

```bash
# Clonar / descomprimir el proyecto, luego:
pnpm install
```

> ⚠️ El proyecto tiene `"packageManager": "pnpm@9.15.0"` en `package.json`.
> Si intentas usar `npm install` o `yarn`, recibirás un error — esto es intencional.

---

## 2. Configurar Supabase

### 2a. Crear proyecto
1. Ve a [supabase.com](https://supabase.com) → "New project"
2. Elige nombre (ej: `habit-tracker`) y región cercana
3. Guarda la contraseña de la base de datos

### 2b. Obtener credenciales
En tu proyecto: **Settings → API**
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```bash
cp .env.local.example .env.local
# Edita .env.local con los valores anteriores
```

### 2c. Ejecutar el esquema SQL
En Supabase: **SQL Editor → New query**
- Pega el contenido de `supabase-schema.sql` → **Run**

Esto crea todas las tablas, índices, RLS policies, y los 6 logros base.

---

## 3. Configurar Google Auth

En Supabase: **Authentication → Providers → Google**
1. Activa el provider de Google
2. Ve a [Google Cloud Console](https://console.cloud.google.com):
   - Crea un proyecto → APIs & Services → Credentials → OAuth 2.0
   - Authorized redirect URI: `https://TU_PROYECTO.supabase.co/auth/v1/callback`
3. Copia Client ID y Client Secret de vuelta a Supabase

---

## 4. Levantar el servidor de desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000)

Otros comandos útiles:

```bash
pnpm build        # build de producción
pnpm start        # servidor de producción (requiere pnpm build previo)
pnpm lint         # ESLint
pnpm typecheck    # TypeScript sin emitir archivos
```

---

## 5. Deploy en Vercel

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

Vercel detecta pnpm automáticamente gracias al campo `"packageManager"` en `package.json`.

En Vercel → Settings → Environment Variables, agrega:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Recuerda actualizar el Authorized redirect URI de Google con tu dominio de Vercel.

---

## 6. Iconos PWA

Reemplaza los placeholders en `public/icons/` con:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

Herramienta recomendada: [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)

---

## Estructura del proyecto

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/login            # Pantalla de login
│   ├── (auth)/callback         # OAuth callback
│   └── (dashboard)/            # Vistas protegidas
│       ├── today/              # Vista principal ← IMPLEMENTADA (Fase 1)
│       ├── weekly/             # Placeholder (Fase 2)
│       ├── monthly/            # Placeholder (Fase 2)
│       ├── stats/              # Placeholder (Fase 3)
│       └── settings/           # Placeholder (Fase 2)
│
├── modules/
│   ├── habits/
│   │   ├── domain/             # Entidades, repositorios, use-cases ← IMPLEMENTADO
│   │   ├── infrastructure/     # HabitSupabaseRepository ← IMPLEMENTADO
│   │   └── presentation/       # TodayView, useHabits, habitStore ← IMPLEMENTADO
│   ├── categories/             # Dominio implementado
│   ├── achievements/           # Dominio implementado
│   └── analytics/              # Pendiente (Fase 3)
│
└── shared/
    ├── lib/supabase/           # client, server, middleware ← IMPLEMENTADO
    ├── lib/utils/              # cn(), dates ← IMPLEMENTADO
    └── types/                  # database.types.ts ← IMPLEMENTADO
```
