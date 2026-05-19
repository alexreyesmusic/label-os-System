import Link from "next/link";

const plans = [
  { name: "Starter", price: "19€/mes", description: "For small labels and one user." },
  { name: "Pro", price: "49€/mes", description: "Up to 5 users, revenue, campaigns and calendar." },
  { name: "Label Team", price: "99€/mes", description: "Unlimited users, roles, reports and exports." }
];

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-14">
      <div className="flex items-center justify-between">
        <Link className="font-black text-acid" href="/">Label OS</Link>
        <Link className="rounded-xl bg-acid px-4 py-2 font-black text-black" href="/signup">Start</Link>
      </div>
      <h1 className="mt-16 text-4xl font-black md:text-6xl">Pricing for modern labels.</h1>
      <p className="mt-4 text-zinc-400">Stripe billing can be added on top of the workspace and role system.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map(plan => (
          <article key={plan.name} className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
            <h2 className="text-2xl font-black">{plan.name}</h2>
            <p className="mt-3 text-4xl font-black text-acid">{plan.price}</p>
            <p className="mt-4 text-zinc-400">{plan.description}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
