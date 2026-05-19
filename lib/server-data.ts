import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { modules, type Role } from "@/lib/modules";

export type Tenant = {
  id: string;
  label_name: string;
  logo_url: string | null;
  country: string | null;
  currency: string;
  main_genre: string | null;
  primary_color: string;
  timezone: string;
  social_links: Record<string, string> | null;
  workspace_name: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type Membership = {
  tenant_id: string;
  user_id: string;
  role: Role;
};

export type DataRow = Record<string, string | number | boolean | null>;

export async function getTenantContext() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: membership } = await supabase
    .from("users_tenants")
    .select("tenant_id,user_id,role")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", membership.tenant_id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (!tenant || !profile) redirect("/onboarding");

  const tableEntries = await Promise.all(
    modules.map(async module => {
      const { data } = await supabase
        .from(module.table)
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("created_at", { ascending: false });

      return [module.table, data ?? []] as const;
    })
  );

  return {
    user: authData.user,
    tenant: tenant as Tenant,
    profile: profile as Profile,
    membership: membership as Membership,
    rowsByTable: Object.fromEntries(tableEntries) as Record<string, DataRow[]>
  };
}
