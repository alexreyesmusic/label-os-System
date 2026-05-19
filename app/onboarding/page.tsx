import { completeOnboarding } from "@/app/onboarding/actions";
import type { InputHTMLAttributes } from "react";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-acid">Label OS onboarding</p>
        <h1 className="mt-4 text-3xl font-black">Create your label</h1>
        <p className="mt-2 text-zinc-400">This creates your tenant. All future data is isolated by tenant_id.</p>
        {params.error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
        <form action={completeOnboarding} className="mt-6 grid gap-3 md:grid-cols-2">
          <Input name="label_name" label="Label name" defaultValue="Reyesound Records" />
          <Input name="owner_name" label="Owner name" />
          <Input name="logo_url" label="Logo URL" required={false} />
          <Input name="country" label="Country" defaultValue="Spain" />
          <Input name="currency" label="Currency" defaultValue="EUR" />
          <Input name="main_genre" label="Main genre" defaultValue="Underground House / Techno" />
          <Input name="primary_color" label="Primary color" type="color" defaultValue="#B6FF1A" />
          <Input name="timezone" label="Timezone" defaultValue="Europe/Madrid" />
          <Input name="workspace_name" label="Workspace name" defaultValue="Label OS" />
          <button className="rounded-xl bg-acid px-4 py-3 font-black text-black md:col-span-2">Enter dashboard</button>
        </form>
      </section>
    </main>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</span><input required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2" {...rest} /></label>;
}
