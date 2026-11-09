# BarberOS

Software de reservas para barberías. Cada barbería que se registra (y paga su licencia) recibe su propia página de reservas y su panel. **Legacy Barber** es la barbería de ejemplo que crean los datos iniciales.

## Qué incluye

- **Portada de venta** (`/`), **registro en 3 pasos con pago** (`/registro`) y **panel de la plataforma** (`/admin`) con barberías, licencias y pagos.
- **Página de cada barbería** (`/<slug>`, p. ej. `/legacy-barber`): carta de servicios, elección de barbero, calendario y horarios libres, confirmación con código.
- **Panel de la barbería** (`/<slug>/admin`): agenda del día, equipo, servicios y precios, bloqueos de horario, tema de la página.
- **Historial del cliente** (`/<slug>/historial`): consultar, mover o cancelar citas (hasta 2 horas antes).
- **Idioma y moneda**: BarberOS (portada, registro, pagos y panel) está en español e inglés; los planes se venden en COP, USD y EUR (precios fijos en `backend/src/platform/plans.ts`, textos en `app/(os)/i18n.js`). Cada barbería elige la moneda de su carta; sus páginas siguen en español.
- Pagos de la licencia con **Wompi** (COP) y, desde la etapa 4, **Stripe** (USD/EUR). Sin llaves configuradas se usa una pasarela simulada (solo fuera de producción).

## Arquitectura

| Parte | Tecnología | Carpeta | Puerto local |
|---|---|---|---|
| Frontend | Next.js 16 + React 19 + GSAP | `app/`, `lib/` | 3002 |
| API | NestJS 11 + Prisma 6 | `backend/` | 3001 (`/api`) |
| Base de datos | PostgreSQL 16 (Docker) | `docker-compose.yml` | 5432 |

### Bases de datos: una para la plataforma y una por barbería

| Base | Qué guarda | Esquema y migraciones |
|---|---|---|
| `barberos_platform` | Barberías (registro, licencia, plan, configuración de su página, clave del panel) y pagos | `backend/prisma/platform/` |
| `barberos_shop_<id>` (una por barbería; Legacy = `barberos_shop_legacy`) | Clientes, servicios, barberos, citas, bloqueos y horarios ocupados | `backend/prisma/tenant/` |

- La base de una barbería **se crea sola cuando se aprueba su primer pago** (y, si eso fallara, en su primer uso). Por eso el usuario de Postgres necesita permiso `CREATEDB`.
- Cada base de barbería es la frontera: no hay `barbershopId` en sus tablas y los datos de una barbería nunca se mezclan con los de otra.
- La API elige la base con `TENANT_DATABASE_URL_TEMPLATE` (cambia `{db}` por el nombre guardado en la plataforma).

## Ejecutar en local

Requisitos: Node 24, Docker. pnpm se usa con `npx` (no hace falta instalarlo).

```bash
docker compose -p barberia up -d          # Postgres
cp backend/.env.example backend/.env      # y ajusta las claves
npx pnpm@10 install                       # también genera los dos clientes de Prisma
cd backend
npx pnpm@10 db:migrate                    # migra la plataforma y todas las bases de barberías
npx pnpm@10 db:seed                       # Legacy Barber + su base, su barbero y sus servicios
cd ..
npx pnpm@10 dev:api                       # API en :3001
npx pnpm@10 exec next dev -p 3002         # web en :3002
```

### Comandos de base de datos (desde `backend/`)

| Comando | Para qué |
|---|---|
| `npx pnpm@10 db:migrate` | Aplica migraciones pendientes a la plataforma y a cada barbería (correr en cada despliegue) |
| `npx pnpm@10 db:new-migration:platform -- --name <nombre>` | Crea una migración tras cambiar `prisma/platform/schema.prisma` |
| `npx pnpm@10 db:new-migration:tenant -- --name <nombre>` | Crea una migración tras cambiar `prisma/tenant/schema.prisma` (usa la base `TENANT_DATABASE_URL`) |
| `npx pnpm@10 db:migrate:tenants` | Solo las bases de barberías |
| `npx pnpm@10 db:split` | Una sola vez: pasa los datos de la base única anterior (`OLD_DATABASE_URL`) a la estructura nueva, sin modificarla |

Si usas otro puerto para la web, agrégalo a `FRONTEND_URL` en `backend/.env` (lista separada por comas) o la API rechazará las peticiones (CORS).

## Variables de entorno (`backend/.env`)

| Variable | Para qué |
|---|---|
| `PLATFORM_DATABASE_URL` | Base de la plataforma |
| `TENANT_DATABASE_URL_TEMPLATE` | URL de la base de cada barbería; `{db}` se reemplaza por su nombre |
| `TENANT_DATABASE_URL` | Solo para crear migraciones del esquema de barbería |
| `OLD_DATABASE_URL` | Solo para `db:split` (base única anterior) |
| `FRONTEND_URL` | Orígenes permitidos por CORS (separados por coma) |
| `PUBLIC_SITE_URL` | URL pública del sitio (redirecciones del pago) |
| `ADMIN_PASSWORD` | Clave inicial del panel de Legacy Barber (solo la usa el seed) |
| `PLATFORM_PASSWORD` | Clave del panel de la plataforma (`/admin`) |
| `JWT_SECRET` | Firma de las sesiones. Obligatoria: sin ella la API no arranca |
| `TRUST_PROXY` | Pon `1` si la API corre detrás de un proxy, para que el límite de intentos vea la IP real |
| `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_API_URL` | Pagos con Wompi. Sin `WOMPI_PUBLIC_KEY` se usa el modo demo |

Cambia todas las claves de ejemplo antes de publicar.

## Pruebas

- Unitarias: `npx pnpm@10 test` (incluye las del backend en `backend/test/`; no necesitan base de datos)
- E2E con Playwright (canal Microsoft Edge): carpeta `qa/`. Requieren la API en :3001 y la web corriendo; revisa el puerto al inicio de cada script.
