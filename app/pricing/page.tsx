import Link from "next/link";

const plans = [
  { name: "Starter", price: "19€/mes", description: "Para sellos pequeños, 1 usuario." },
  { name: "Pro", price: "49€/mes", description: "Hasta 5 usuarios, revenue system, campañas y calendario." },
  { name: "Label Team", price: "99€/mes", description: "Usuarios ilimitados, roles, reportes y exportaciones." }
];

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-14">
      <div className="flex items-center justify-between">
        <Link className="font-black text-acid" href="/">Reyesound Label OS Demo</Link>
        <Link className="rounded-lg bg-acid px-4 py-2 font-black text-black" href="/">Entrar a la demo</Link>
      </div>
      <h1 className="mt-16 text-4xl font-black md:text-6xl">Planes previstos para la versión SaaS.</h1>
      <p className="mt-4 text-zinc-400">Esta demo no cobra ni usa Stripe. Es solo una vista pública funcional.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map(plan => (
          <article key={plan.name} className="rounded-xl border border-line bg-panel p-6">
            <h2 className="text-2xl font-black">{plan.name}</h2>
            <p className="mt-3 text-4xl font-black text-acid">{plan.price}</p>
            <p className="mt-4 text-zinc-400">{plan.description}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
