"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const tenantPayload = {
    label_name: String(formData.get("label_name") ?? ""),
    logo_url: String(formData.get("logo_url") ?? "") || null,
    country: String(formData.get("country") ?? "") || null,
    currency: String(formData.get("currency") ?? "EUR"),
    main_genre: String(formData.get("main_genre") ?? "") || null,
    primary_color: String(formData.get("primary_color") ?? "#B6FF1A"),
    timezone: String(formData.get("timezone") ?? "Europe/Madrid"),
    workspace_name: String(formData.get("workspace_name") ?? "Label OS")
  };

  const { data: tenant, error: tenantError } = await supabase.from("tenants").insert(tenantPayload).select("*").single();
  if (tenantError) redirect(`/onboarding?error=${encodeURIComponent(tenantError.message)}`);

  await supabase.from("profiles").upsert({
    id: authData.user.id,
    email: authData.user.email,
    full_name: String(formData.get("owner_name") ?? authData.user.email ?? "")
  });

  const { error: memberError } = await supabase.from("users_tenants").insert({
    tenant_id: tenant.id,
    user_id: authData.user.id,
    role: "owner"
  });
  if (memberError) redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);

  redirect("/dashboard");
}
