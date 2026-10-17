# Barbería Esteban

Aplicación de reservas creada a partir de las historias de usuario y los wireframes entregados. Implementa la fase 1 recomendada: un monolito modular con una interfaz pública y API separada por dominios.

## Incluye

- Catálogo de servicios con precio y duración.
- Flujo de reserva: servicio, barbero, calendario, horarios y confirmación.
- Persistencia local en SQLite (`barberia.db`) y restricción única para evitar dobles reservas del mismo horario.
- Consulta y cancelación de citas (hasta 2 horas antes).
- Panel del barbero: agenda diaria, completar/cancelar citas y bloquear horarios.
- Diseño responsive basado en los wireframes y una cabecera animada sin recursos pesados.

## Ejecutar

```bash
pnpm install
pnpm dev
```

Abre `http://localhost:3000`. El panel está en `/admin`. En desarrollo, la clave inicial es `esteban2026`; para producción define `ADMIN_PASSWORD` en `.env.local`.

```bash
ADMIN_PASSWORD=una-clave-segura
```

## Arquitectura y siguiente paso

El proyecto usa Next.js y SQLite para validar el flujo sin infraestructura externa. Antes de desplegar, sustituye SQLite por PostgreSQL en Railway y extrae `booking` primero; después se pueden separar catálogo, barbería, clientes y notificaciones con eventos de reserva, tal como propone la documentación original.
