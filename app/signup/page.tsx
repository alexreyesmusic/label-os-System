import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-acid">Label OS</p>
        <h1 className="mt-4 text-3xl font-black">Demo pública</h1>
        <p className="mb-6 mt-2 text-zinc-400">No necesitas cuenta para probar la demo. Los cambios se guardan con localStorage.</p>
        <Link href="/dashboard" className="block w-full rounded-xl bg-acid px-4 py-3 text-center font-black text-black">Entrar a la demo</Link>
        <Link href="/login" className="mt-3 block w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-center font-black">Ver credenciales demo</Link>
      </section>
    </main>
  );
}
