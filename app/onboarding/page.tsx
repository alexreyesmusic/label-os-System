import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-acid">Label OS onboarding</p>
        <h1 className="mt-4 text-3xl font-black">Demo lista para probar</h1>
        <p className="mt-2 text-zinc-400">El onboarding editable está dentro de Settings. Entra al dashboard y cambia nombre, logo, color, moneda y workspace.</p>
        <Link href="/dashboard" className="mt-6 block rounded-xl bg-acid px-4 py-3 text-center font-black text-black">Entrar al dashboard</Link>
      </section>
    </main>
  );
}
