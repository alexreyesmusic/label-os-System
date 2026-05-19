# Label OS

Premium SaaS for record label operations.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Row Level Security
- Recharts
- Vercel

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
cp .env.example .env.local
```

3. Run `supabase/schema.sql` in Supabase SQL editor.

4. Configure Supabase Auth redirect URLs:

```text
http://localhost:3000/onboarding
https://YOUR_DOMAIN/onboarding
```

5. Run locally:

```bash
npm run dev
```

## Branding

Visible product branding is `Label OS`, `MASTER DASHBOARD`, and `Demo premium para sellos modernos`.

Tenant names are editable in Settings. "Reyesound Records" is only a sample tenant value in onboarding.
