import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-acid">Label OS</p>
        <h1 className="mt-4 text-3xl font-black">Demo login</h1>
        <p className="mb-6 mt-2 text-zinc-400">Demo premium para sellos modernos. Los datos se guardan solo en este navegador.</p>
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
          <p><span className="text-zinc-500">Email:</span> demo@labelos.com</p>
          <p><span className="text-zinc-500">Password:</span> demo123</p>
        </div>
        <Link href="/dashboard" className="mt-4 block w-full rounded-xl bg-acid px-4 py-3 text-center font-black text-black">Entrar a la demo</Link>
        <Link href="/" className="mt-3 block w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-center font-black">Volver</Link>
      </section>
    </main>
  );
}
