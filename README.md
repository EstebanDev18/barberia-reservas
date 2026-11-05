# BarberOS

Software de reservas para barberías. Cada barbería que se registra (y paga su licencia) recibe su propia página de reservas y su panel. **Legacy Barber** es la barbería de ejemplo que crean los datos iniciales.

## Qué incluye

- **Portada de venta** (`/`), **registro en 3 pasos con pago** (`/registro`) y **panel de la plataforma** (`/admin`) con barberías, licencias y pagos.
- **Página de cada barbería** (`/<slug>`, p. ej. `/legacy-barber`): carta de servicios, elección de barbero, calendario y horarios libres, confirmación con código.
- **Panel de la barbería** (`/<slug>/admin`): agenda del día, equipo, servicios y precios, bloqueos de horario, tema de la página.
- **Historial del cliente** (`/<slug>/historial`): consultar, mover o cancelar citas (hasta 2 horas antes).
- Pagos de la licencia con **Wompi**. Sin llaves configuradas se usa una pasarela simulada (solo fuera de producción).

## Arquitectura

| Parte | Tecnología | Carpeta | Puerto local |
|---|---|---|---|
| Frontend | Next.js 16 + React 19 + GSAP | `app/`, `lib/` | 3002 |
| API | NestJS 11 + Prisma 6 | `backend/` | 3001 (`/api`) |
| Base de datos | PostgreSQL 16 (Docker) | `docker-compose.yml` | 5432 |

## Ejecutar en local

Requisitos: Node 24, Docker. pnpm se usa con `npx` (no hace falta instalarlo).

```bash
docker compose -p barberia up -d          # Postgres
cp backend/.env.example backend/.env      # y ajusta las claves
npx pnpm@10 install
cd backend
npx prisma generate
npx prisma db push                        # crea las tablas (aún no hay migraciones versionadas)
npx prisma db seed                        # Legacy Barber, su barbero y servicios
cd ..
npx pnpm@10 dev:api                       # API en :3001
npx pnpm@10 exec next dev -p 3002         # web en :3002
```

Si usas otro puerto para la web, agrégalo a `FRONTEND_URL` en `backend/.env` (lista separada por comas) o la API rechazará las peticiones (CORS).

## Variables de entorno (`backend/.env`)

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a Postgres |
| `FRONTEND_URL` | Orígenes permitidos por CORS (separados por coma) |
| `PUBLIC_SITE_URL` | URL pública del sitio (redirecciones del pago) |
| `ADMIN_PASSWORD` | Clave inicial del panel de Legacy Barber (solo la usa el seed) |
| `PLATFORM_PASSWORD` | Clave del panel de la plataforma (`/admin`) |
| `JWT_SECRET` | Firma de las sesiones |
| `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_API_URL` | Pagos con Wompi. Sin `WOMPI_PUBLIC_KEY` se usa el modo demo |

Cambia todas las claves de ejemplo antes de publicar.

## Pruebas

- Unitarias: `npx pnpm@10 test`
- E2E con Playwright (canal Microsoft Edge): carpeta `qa/`. Requieren la API en :3001 y la web corriendo; revisa el puerto al inicio de cada script.
