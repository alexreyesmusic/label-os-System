import type { InputHTMLAttributes } from "react";
import { completeOnboarding } from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-acid">Label OS onboarding</p>
        <h1 className="mt-4 text-3xl font-black">Create your workspace</h1>
        <p className="mt-2 text-zinc-400">This workspace stores your label data in Supabase and isolates it with Row Level Security.</p>
        {params.error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
        <form action={completeOnboarding} className="mt-6 grid gap-3 md:grid-cols-2">
          <Input name="label_name" label="Label name" />
          <Input name="owner_name" label="Owner name" defaultValue={data.user.email ?? ""} />
          <Input name="country" label="Country" />
          <Input name="currency" label="Currency" defaultValue="EUR" />
          <Input name="main_genre" label="Main genre" defaultValue="Underground House / Deep Tech" />
          <Input name="brand_color" label="Brand color" type="color" defaultValue="#B6FF1A" />
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold md:col-span-2">
            <input name="load_sample_data" type="checkbox" className="size-4" />
            Load sample data into this workspace
          </label>
          <button className="rounded-xl bg-acid px-4 py-3 font-black text-black md:col-span-2">Create workspace</button>
        </form>
      </section>
    </main>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</span><input required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2" {...rest} /></label>;
}
