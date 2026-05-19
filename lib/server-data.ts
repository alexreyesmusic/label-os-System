import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { modules, type Role } from "@/lib/modules";

export type Workspace = {
  id: string;
  label_name: string;
  country: string | null;
  currency: string;
  main_genre: string | null;
  brand_color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  workspace_id: string;
  user_id: string;
  role: Role;
};

export type DataRow = Record<string, string | number | boolean | null>;

export async function getWorkspaceContext() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id,user_id,role")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (!workspace || !profile) redirect("/onboarding");

  const tableEntries = await Promise.all(
    modules.map(async module => {
      const { data } = await supabase
        .from(module.table)
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false });

      return [module.table, data ?? []] as const;
    })
  );

  return {
    user: authData.user,
    workspace: workspace as Workspace,
    profile: profile as Profile,
    membership: membership as Membership,
    rowsByTable: Object.fromEntries(tableEntries) as Record<string, DataRow[]>
  };
}
