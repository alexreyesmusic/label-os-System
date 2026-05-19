import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-acid">Label OS</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">Demo premium para sellos modernos.</h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-400">A SaaS operating system for record labels: demos, tracks, artists, releases, revenue, campaigns, content and distribution.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-xl bg-acid px-5 py-3 font-black text-black">Start</Link>
          <Link href="/login" className="rounded-xl border border-white/10 bg-white/[0.045] px-5 py-3 font-black">Login</Link>
        </div>
      </section>
    </main>
  );
}
