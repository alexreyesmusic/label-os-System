import { DashboardApp } from "@/components/DashboardApp";
import { getWorkspaceContext } from "@/lib/server-data";

export default async function DashboardPage() {
  const { workspace, profile, membership, rowsByTable } = await getWorkspaceContext();
  return <DashboardApp workspace={workspace} profile={profile} membership={membership} initialRows={rowsByTable} />;
}
