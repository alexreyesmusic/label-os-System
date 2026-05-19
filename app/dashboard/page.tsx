import { DashboardApp } from "@/components/DashboardApp";
import { getTenantContext } from "@/lib/server-data";

export default async function DashboardPage() {
  const { tenant, profile, membership, rowsByTable } = await getTenantContext();
  return <DashboardApp tenant={tenant} profile={profile} membership={membership} initialRows={rowsByTable} />;
}
