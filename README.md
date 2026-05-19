# Reyesound Label OS · Public Demo

Demo pública funcional para compartir con potenciales clientes.

## Qué incluye

- Next.js + React + Tailwind CSS.
- Sin backend.
- Sin Supabase.
- Sin Stripe.
- Sin variables `.env`.
- Sin base de datos externa.
- Persistencia con `localStorage`.
- Datos demo realistas de un sello de música electrónica underground.
- Crear, editar, eliminar, filtrar, resetear y exportar CSV simulado.
- Visual SaaS premium con glassmorphism, KPIs, charts fake, analytics fake, activity feed y branding editable.

## Login demo

Puedes entrar de dos formas:

- Botón `Entrar a la demo sin contraseña`.
- Credenciales demo:

```text
email: demo@labelos.com
password: demo123
```

## Módulos activos

- Master Dashboard
- Demos
- Artists
- Releases
- Revenue System
- Editorial Calendar
- Social Media
- Content Master
- Campaign DB
- A&R Reports
- Data Cleanup
- Settings

## Desarrollo local

```bash
npm install
npm run dev
```

## Deploy

Listo para publicar en Vercel o Netlify como una app Next.js normal. No hace falta configurar variables de entorno.

## Nota

Los datos se guardan solo en el navegador del usuario mediante `localStorage`. Para recuperar los datos originales, usa `Reset demo data`.
