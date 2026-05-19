import Link from "next/link";
import type { InputHTMLAttributes } from "react";
import { forgotPassword, login } from "@/app/auth/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-acid">Label OS</p>
        <h1 className="mt-4 text-3xl font-black">Login</h1>
        <p className="mb-6 mt-2 text-zinc-400">Access your label workspace.</p>
        {params.error && <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
        {params.message && <p className="mb-4 rounded-xl bg-acid/10 p-3 text-sm text-acid">{params.message}</p>}
        <form action={login} className="space-y-3">
          <Input name="email" label="Email" type="email" />
          <Input name="password" label="Password" type="password" />
          <button className="w-full rounded-xl bg-acid px-4 py-3 font-black text-black">Login</button>
        </form>
        <form action={forgotPassword} className="mt-4 flex gap-2">
          <input required name="email" type="email" placeholder="Email for reset" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2" />
          <button className="rounded-xl border border-white/10 px-3 py-2 font-bold">Forgot</button>
        </form>
        <p className="mt-5 text-sm text-zinc-500">No account? <Link href="/signup" className="text-acid">Signup</Link></p>
      </section>
    </main>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</span><input required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2" {...rest} /></label>;
}
