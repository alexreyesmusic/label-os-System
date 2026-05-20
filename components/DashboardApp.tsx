"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { canWrite, modules, type FieldConfig, type ModuleConfig, type Role } from "@/lib/modules";
import type { Membership, Profile, Workspace } from "@/lib/server-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type RowValue = string | number | boolean | null;
type Row = Record<string, RowValue>;
type RowsByTable = Record<string, Row[]>;
type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "file" | "date" | "number" | "url" | "boolean";
  options?: string[];
};

const cleanupModule = { key: "cleanup", label: "Data Cleanup", icon: "⌫" };
const helpModule = { key: "help", label: "Help / How it works", icon: "?" };
const supabase = getSupabaseBrowserClient();
const systemModules = [
  { key: "master", label: "Master Dashboard", icon: "◆" },
  ...modules.map(module => ({ key: module.key, label: module.label, icon: module.icon })),
  cleanupModule,
  { key: "settings", label: "Settings", icon: "⚙" }
];

export function DashboardApp({
  workspace,
  profile,
  membership,
  initialRows
}: {
  workspace: Workspace;
  profile: Profile;
  membership: Membership;
  initialRows: RowsByTable;
}) {
  const [workspaceState, setWorkspaceState] = useState<Workspace>(workspace);
  const [data, setData] = useState<RowsByTable>(initialRows);
  const [active, setActive] = useState("master");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [modal, setModal] = useState<{ module: ModuleConfig; row?: Row } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState("");
  const role = membership.role;
  const activeModule = modules.find(module => module.key === active);
  const activeWorkspaceId = membership.workspace_id || workspaceState.id;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  async function getSessionOrRedirect() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      notify("Please login again");
      window.location.href = "/login";
      return null;
    }
    return session;
  }

  async function refresh(table: string) {
    const { data: rows, error } = await supabase.from(table).select("*").eq("workspace_id", activeWorkspaceId).order("created_at", { ascending: false });
    if (error) return notify(error.message);
    setData(prev => ({ ...prev, [table]: (rows ?? []) as Row[] }));
  }

  async function save(module: ModuleConfig, values: Row) {
    const session = await getSessionOrRedirect();
    if (!session) return;
    if (!activeWorkspaceId) return notify("Missing workspace");
    const existingId = String(values.id ?? "");
    const payload = { ...buildPayload(module, values), workspace_id: activeWorkspaceId };
    const insertPayload = { ...payload, created_by: session.user.id };
    if (!existingId && module.table === "demos") console.log("DEMO INSERT PAYLOAD", insertPayload);
    const request = existingId
      ? supabase.from(module.table).update(payload).eq("id", existingId)
      : supabase.from(module.table).insert(insertPayload);

    const { error } = await request;
    if (error) return notify(error.message);
    setModal(null);
    await refresh(module.table);
    notify(existingId ? "Changes saved" : "Item created");
  }

  async function remove(module: ModuleConfig, row: Row) {
    if (!confirm("Delete this item? This action cannot be undone.")) return;
    const session = await getSessionOrRedirect();
    if (!session) return;
    const { error } = await supabase.from(module.table).delete().eq("id", String(row.id));
    if (error) return notify(error.message);
    await refresh(module.table);
    notify("Item deleted");
  }

  async function duplicate(module: ModuleConfig, row: Row) {
    const session = await getSessionOrRedirect();
    if (!session) return;
    const copy = Object.fromEntries(Object.entries(row).filter(([key]) => !["id", "created_at", "updated_at", "created_by"].includes(key))) as Row;
    const { error } = await supabase.from(module.table).insert({ ...copy, workspace_id: workspaceState.id, created_by: session.user.id });
    if (error) return notify(error.message);
    await refresh(module.table);
    notify("Item duplicated");
  }

  async function archive(module: ModuleConfig, row: Row) {
    await updateRow(module.table, row, { status: "Archived" });
    notify("Item archived");
  }

  async function quickStatus(module: ModuleConfig, row: Row, status: string) {
    await updateRow(module.table, row, { status });
    notify(`Status changed to ${status}`);
  }

  async function convertToRelease(module: ModuleConfig, row: Row) {
    const session = await getSessionOrRedirect();
    if (!session) return;
    const title = String(row.track_title ?? row.title ?? "Untitled Release");
    const release: Row = {
      workspace_id: workspaceState.id,
      created_by: session.user.id,
      title,
      artist_name: String(row.artist_name ?? ""),
      cover_url: String(row.cover_url ?? row.artwork_link ?? ""),
      release_type: "Single",
      status: "Approved",
      release_date: "",
      distribution_date: "",
      tracks_included: title,
      contract_status: String(row.contract_status ?? "Pending"),
      master_status: String(row.master_status ?? "Pending"),
      artwork_status: row.cover_url || row.artwork_link ? "Uploaded" : "Missing",
      metadata_status: "Incomplete",
      campaign_status: "Not Started",
      notes: String(row.internal_comments ?? row.notes ?? "")
    };
    const { error } = await supabase.from("releases").insert(release);
    if (error) return notify(error.message);
    await updateRow(module.table, row, { status: "Approved", decision: "Yes", assigned_release: title });
    await Promise.all([refresh(module.table), refresh("releases")]);
    notify("Track converted into release");
  }

  async function updateRow(table: string, row: Row, patch: Row) {
    const session = await getSessionOrRedirect();
    if (!session) return;
    const { error } = await supabase.from(table).update(patch).eq("id", String(row.id));
    if (error) return notify(error.message);
    await refresh(table);
  }

  function exportCSV(module?: ModuleConfig) {
    const rows = module ? data[module.table] ?? [] : Object.entries(data).flatMap(([table, rows]) => rows.map(row => ({ table, ...row })));
    const csv = rows.length ? [Object.keys(rows[0]).join(","), ...rows.map(row => Object.values(row).map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))].join("\n") : "empty";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `label-os-${module?.key ?? "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("CSV exported");
  }

  async function importCSV(module: ModuleConfig, file: File) {
    const session = await getSessionOrRedirect();
    if (!session) return;
    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    if (!headerLine) return notify("CSV is empty");
    const headers = headerLine.split(",").map(item => item.replaceAll('"', "").trim());
    const records = lines.map(line => {
      const values = line.split(",").map(item => item.replaceAll(/^"|"$/g, "").replaceAll('""', '"'));
      return headers.reduce<Row>((acc, key, index) => {
        acc[key] = values[index] ?? "";
        return acc;
      }, { workspace_id: workspaceState.id, created_by: session.user.id });
    });
    const { error } = await supabase.from(module.table).insert(records);
    if (error) return notify(error.message);
    await refresh(module.table);
    notify("CSV imported");
  }

  async function clearCategory(table: string) {
    if (!confirm(`Delete all records from ${table}?`)) return;
    const session = await getSessionOrRedirect();
    if (!session) return;
    const { error } = await supabase.from(table).delete().eq("workspace_id", workspaceState.id);
    if (error) return notify(error.message);
    await refresh(table);
    notify("Category deleted");
  }

  async function saveWorkspace(values: Workspace) {
    const session = await getSessionOrRedirect();
    if (!session) return;
    const { data: updated, error } = await supabase
      .from("workspaces")
      .update({
        label_name: values.label_name,
        country: values.country,
        currency: values.currency,
        main_genre: values.main_genre,
        brand_color: values.brand_color
      })
      .eq("id", workspaceState.id)
      .select("*")
      .single();
    if (error) return notify(error.message);
    setWorkspaceState(updated as Workspace);
    notify("Settings saved");
  }

  const currentRows = activeModule ? data[activeModule.table] ?? [] : [];
  const filteredRows = useMemo(() => {
    return currentRows
      .filter(row => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
      .filter(row => statusFilter === "All" || String(row.status ?? row.contract_status ?? row.master_status ?? "") === statusFilter)
      .sort((a, b) => sortDir === "desc" ? String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) : String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));
  }, [currentRows, query, statusFilter, sortDir]);
  const stats = useMemo(() => computeStats(data), [data]);
  const chartData = useMemo(() => makeCharts(data), [data]);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#060709]" style={{ "--brand": workspaceState.brand_color, "--accent": "#2F7DFF" } as CSSProperties}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(182,255,26,.10),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(47,125,255,.12),transparent_30%)]" />
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-72 border-r border-white/10 bg-black/55 p-4 shadow-2xl backdrop-blur-2xl lg:block">
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <div className="flex items-center gap-3">
            <Logo workspace={workspaceState} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">Label OS</p>
              <p className="truncate text-xs text-zinc-500">{workspaceState.label_name}</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-white/10 bg-black/35 p-3 text-xs text-zinc-400">{role.toUpperCase()} access · {workspaceState.currency}</p>
        </div>
        <nav className="mt-5 space-y-1">
          {systemModules.map(item => (
            <button key={item.key} onClick={() => { setActive(item.key); setStatusFilter("All"); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${active === item.key ? "bg-white text-black" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"}`}>
              <span className={`flex size-7 items-center justify-center rounded-lg text-xs ${active === item.key ? "bg-black text-[var(--brand)]" : "bg-white/[0.06]"}`}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="relative z-10 w-full lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#060709]/75 px-4 py-4 backdrop-blur-2xl md:px-7">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Label OS · Persistent workspace</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{active === "master" ? "MASTER DASHBOARD" : systemModules.find(item => item.key === active)?.label}</h1>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <input className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)] md:w-72" value={query} onChange={event => setQuery(event.target.value)} placeholder="Global search..." />
              <button onClick={() => setHelpOpen(true)} className={secondaryButton}>Help / How it works</button>
              <button onClick={() => exportCSV(activeModule)} className={secondaryButton}>Export CSV</button>
              <form action="/auth/logout" method="post"><button className={secondaryButton}>Logout</button></form>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {systemModules.map(item => <button key={item.key} onClick={() => setActive(item.key)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold ${active === item.key ? "bg-white text-black" : "bg-white/[0.045] text-zinc-300"}`}>{item.label}</button>)}
          </div>
        </header>

        <section className="space-y-6 p-4 md:p-7">
          {active === "master" && <Master stats={stats} chartData={chartData} rowsByTable={data} />}
          {active === "cleanup" && <Cleanup data={data} removeCategory={clearCategory} />}
          {active === "settings" && <Settings workspace={workspaceState} profile={profile} onSave={saveWorkspace} exportCSV={() => exportCSV()} />}
          {activeModule && (
            <ModuleView
              module={activeModule}
              rows={filteredRows}
              allRows={currentRows}
              role={role}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortDir={sortDir}
              setSortDir={setSortDir}
              onCreate={() => setModal({ module: activeModule })}
              onEdit={(row: Row) => setModal({ module: activeModule, row })}
              onDelete={(row: Row) => remove(activeModule, row)}
              onDuplicate={(row: Row) => duplicate(activeModule, row)}
              onArchive={(row: Row) => archive(activeModule, row)}
              onQuickStatus={(row: Row, status: string) => quickStatus(activeModule, row, status)}
              onConvert={(row: Row) => convertToRelease(activeModule, row)}
              onImport={(file: File) => importCSV(activeModule, file)}
              chartData={chartData}
            />
          )}
        </section>
      </main>
      {modal && <CrudModal module={modal.module} row={modal.row} onClose={() => setModal(null)} onSave={(values: Row) => save(modal.module, values)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {toast && <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-bold text-[var(--brand)] shadow-2xl">{toast}</div>}
    </div>
  );
}

function Master({ stats, chartData, rowsByTable }: { stats: Record<string, number>; chartData: ChartData; rowsByTable: RowsByTable }) {
  return (
    <>
      <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--brand)]">Label OS</p>
        <h2 className="mt-3 text-5xl font-black tracking-tight">MASTER DASHBOARD</h2>
        <p className="mt-3 max-w-2xl text-zinc-400">Manage your label workspace with persistent Supabase data protected by Row Level Security.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Demos" value={stats.demos} />
        <Stat label="Tracks" value={stats.tracks} />
        <Stat label="Releases" value={stats.releases} />
        <Stat label="Revenue" value={money(stats.revenue)} />
        <Stat label="Pending Royalties" value={money(stats.pendingRoyalties)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Revenue mensual"><AreaGraph data={chartData.monthlyRevenue} dataKey="revenue" /></ChartPanel>
        <ChartPanel title="Releases por estado"><PieGraph data={chartData.releaseStatus} /></ChartPanel>
        <ChartPanel title="Demos recibidos por mes"><BarGraph data={chartData.demosByMonth} dataKey="count" /></ChartPanel>
        <ChartPanel title="Campaign performance"><LineGraph data={chartData.campaignPerformance} /></ChartPanel>
        <ChartPanel title="Top artists by revenue"><BarGraph data={chartData.topArtists} dataKey="revenue" /></ChartPanel>
        <ChartPanel title="Content production pipeline"><PieGraph data={chartData.contentPipeline} /></ChartPanel>
      </div>
      <Panel title="Recent activity">
        <div className="grid gap-2 md:grid-cols-2">
          {recentActivity(rowsByTable).map(item => <Activity key={item} text={item} />)}
        </div>
      </Panel>
    </>
  );
}

type ModuleViewProps = {
  module: ModuleConfig;
  rows: Row[];
  allRows: Row[];
  role: Role;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sortDir: "desc" | "asc";
  setSortDir: (value: "desc" | "asc") => void;
  onCreate: () => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
  onDuplicate: (row: Row) => void;
  onArchive: (row: Row) => void;
  onQuickStatus: (row: Row, status: string) => void;
  onConvert: (row: Row) => void;
  onImport: (file: File) => void;
  chartData: ChartData;
};

function ModuleView(props: ModuleViewProps) {
  const writable = canWrite(props.role, props.module);
  const statusValues = ["All", ...Array.from(new Set(props.allRows.map(row => String(row.status ?? row.contract_status ?? row.master_status ?? "")).filter(Boolean)))];
  const showFields = props.module.fields.slice(0, 5);

  return (
    <>
      <ModuleCharts moduleKey={props.module.key} chartData={props.chartData} />
      <Panel
        title={props.module.label}
        action={<div className="flex flex-wrap gap-2">
          <select className={controlClass} value={props.statusFilter} onChange={event => props.setStatusFilter(event.target.value)}>{statusValues.map(value => <option key={value}>{value}</option>)}</select>
          <select className={controlClass} value={props.sortDir} onChange={event => props.setSortDir(event.target.value as "desc" | "asc")}><option value="desc">Newest</option><option value="asc">Oldest</option></select>
          <label className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-bold transition hover:bg-white/[0.08]">Import CSV<input className="hidden" type="file" accept=".csv" onChange={event => event.target.files?.[0] && props.onImport(event.target.files[0])} /></label>
          {writable && <button onClick={props.onCreate} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-black text-black">New</button>}
        </div>}
      >
        {props.rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-white/[0.035] text-xs uppercase tracking-wide text-zinc-500">
                  <tr>{showFields.map(field => <th key={field.key} className="px-4 py-3">{field.label}</th>)}<th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody>
                  {props.rows.map(row => <tr key={String(row.id)} className="border-t border-white/10 transition hover:bg-white/[0.035]">
                    {showFields.map((field, index) => <td key={field.key} className={`px-4 py-4 ${index === 0 ? "font-bold text-white" : "text-zinc-300"}`}>{renderCell(row[field.key], field)}</td>)}
                    <td className="px-4 py-4"><Badge>{String(row.status ?? row.contract_status ?? row.master_status ?? "Ready")}</Badge></td>
                    <td className="space-x-2 px-4 py-4">
                      {writable && <button onClick={() => props.onEdit(row)} className={secondaryButton}>Edit</button>}
                      {writable && ["demos", "tracks"].includes(props.module.key) && <button onClick={() => props.onQuickStatus(row, "Approved")} className={secondaryButton}>Approve</button>}
                      {writable && ["demos", "tracks"].includes(props.module.key) && <button onClick={() => props.onQuickStatus(row, "Rejected")} className={secondaryButton}>Reject</button>}
                      {writable && ["demos", "tracks"].includes(props.module.key) && <button onClick={() => props.onQuickStatus(row, "Needs Changes")} className={secondaryButton}>Needs Changes</button>}
                      {writable && ["demos", "tracks"].includes(props.module.key) && <button onClick={() => props.onConvert(row)} className={secondaryButton}>Convert</button>}
                      {writable && <button onClick={() => props.onDuplicate(row)} className={secondaryButton}>Duplicate</button>}
                      {writable && <button onClick={() => props.onArchive(row)} className={secondaryButton}>Archive</button>}
                      {writable && <button onClick={() => props.onDelete(row)} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 font-bold text-red-100">Delete</button>}
                      {!writable && <span className="text-zinc-500">Read only</span>}
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        ) : <Empty text="No records yet. Create the first item or import CSV." />}
      </Panel>
    </>
  );
}

function CrudModal({ module, row, onClose, onSave }: { module: ModuleConfig; row?: Row; onClose: () => void; onSave: (values: Row) => void }) {
  const [values, setValues] = useState<Row>(row ?? {});
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <form onSubmit={event => { event.preventDefault(); onSave(values); }} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0D1014]/95 p-5 shadow-2xl backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-black">{row ? "Edit" : "Create"} {module.label}</h3><button type="button" onClick={onClose} className={secondaryButton}>Cancel</button></div>
      <div className="grid gap-3 md:grid-cols-2">
        {(module.fields as Field[]).map((field: Field) => <label key={field.key} className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{field.label}</span>
          {field.type === "textarea" && <textarea className={controlClass} rows={3} value={String(values[field.key] ?? "")} onChange={event => setValues({ ...values, [field.key]: event.target.value })} />}
          {field.type === "select" && <select className={controlClass} value={String(values[field.key] ?? field.options?.[0] ?? "")} onChange={event => setValues({ ...values, [field.key]: event.target.value })}>{field.options?.map((option: string) => <option key={option} value={option}>{option}</option>)}</select>}
          {field.type === "file" && (
            <div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-3">
              <input className={controlClass} type="file" onChange={event => { const file = event.target.files?.[0]; if (!file) return; setValues(prev => ({ ...prev, [field.key]: file.name })); }} />
              {values[field.key] && <p className="mt-2 text-xs text-zinc-400">{String(values[field.key])}</p>}
            </div>
          )}
          {!["textarea", "select", "file"].includes(field.type ?? "text") && <input className={controlClass} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={String(values[field.key] ?? "")} onChange={event => setValues({ ...values, [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value })} />}
        </label>)}
      </div>
      <button className="mt-5 w-full rounded-xl bg-[var(--brand)] px-4 py-3 font-black text-black">Save</button>
    </form>
  </div>;
}

function Cleanup({ data, removeCategory }: { data: RowsByTable; removeCategory: (key: string) => void }) {
  return <Panel title="Data Cleanup">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {(Object.entries(data) as [string, Row[]][]).map(([key, value]: [string, Row[]]) => (
        <div key={key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">{key}</p>
          <p className="mt-2 text-3xl font-black">{value.length}</p>
          <button onClick={() => removeCategory(key)} className="mt-4 w-full rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">Delete category</button>
        </div>
      ))}
    </div>
  </Panel>;
}

function Settings({ workspace, profile, onSave, exportCSV }: { workspace: Workspace; profile: Profile; onSave: (value: Workspace) => void; exportCSV: () => void }) {
  const [values, setValues] = useState<Workspace>(workspace);
  return <Panel title="Settings / Branding" action={<button onClick={exportCSV} className={secondaryButton}>Export all</button>}>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
        <Logo workspace={values} size="lg" />
        <h3 className="mt-4 text-2xl font-black">{values.label_name}</h3>
        <p className="text-sm text-zinc-500">{profile.email} · {values.currency}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Label name" value={values.label_name} onChange={value => setValues(prev => ({ ...prev, label_name: value }))} />
        <Input label="Country" value={values.country ?? ""} onChange={value => setValues(prev => ({ ...prev, country: value }))} />
        <Input label="Currency" value={values.currency} onChange={value => setValues(prev => ({ ...prev, currency: value }))} />
        <Input label="Main genre" value={values.main_genre ?? ""} onChange={value => setValues(prev => ({ ...prev, main_genre: value }))} />
        <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Brand color</span><input className={`${controlClass} h-11`} type="color" value={values.brand_color} onChange={event => setValues(prev => ({ ...prev, brand_color: event.target.value }))} /></label>
      </div>
    </div>
    <button onClick={() => onSave(values)} className="mt-5 rounded-xl bg-[var(--brand)] px-4 py-3 font-black text-black">Save Settings</button>
  </Panel>;
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0D1014]/95 p-6 shadow-2xl">
      <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-black">Help / How it works</h2><button onClick={onClose} className={secondaryButton}>Close</button></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {modules.map(module => <div key={module.key} className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="font-black">{module.label}</p><p className="mt-2 text-sm text-zinc-400">{moduleHelp[module.key] ?? "Create, edit, filter, export and manage records for this workspace."}</p></div>)}
      </div>
    </section>
  </div>;
}

const moduleHelp: Record<string, string> = {
  demos: "Review inbound demos, score A&R fit, approve, reject or convert tracks into releases.",
  tracks: "Manage signed or shortlisted tracks, links, masters, contracts and release assignment.",
  artists: "Keep artist contact details, status, notes and relationship history organized.",
  releases: "Track release dates, metadata, artwork, contracts, masters, campaign status and distribution readiness.",
  revenue: "Register revenue by platform and monitor gross revenue, expenses and payment status.",
  royalties: "Manage split participants, percentages and royalty status.",
  editorial: "Plan editorial content by channel, date, category and production state.",
  social: "Schedule posts, track KPIs and monitor engagement performance.",
  content: "Centralize content ideas, pillars, objectives, owners and production status.",
  campaigns: "Plan marketing campaigns, budgets, reach, clicks and conversion performance.",
  reports: "Store recurring A&R reports with reviewed demos, recommended tracks and next actions.",
  distribution: "Track distributor uploads, approvals, DSP coverage and publication status."
};

function ModuleCharts({ moduleKey, chartData }: { moduleKey: string; chartData: ChartData }) {
  const config: Record<string, [string, keyof ChartData, "bar" | "pie" | "area" | "line"][]> = {
    demos: [["Demos por estado", "demoStatus", "pie"], ["A&R average score", "demoScores", "bar"], ["Demos por género", "demoGenres", "bar"]],
    tracks: [["Tracks by status", "trackStatus", "pie"], ["A&R score", "demoScores", "bar"], ["Energy pipeline", "trackEnergy", "bar"]],
    artists: [["Revenue por artista", "topArtists", "bar"], ["Artists por país", "artistCountries", "pie"], ["Performance", "topArtists", "area"]],
    releases: [["Releases por estado", "releaseStatus", "pie"], ["Revenue by release", "revenueByRelease", "bar"], ["Upcoming timeline", "releaseTimeline", "line"]],
    revenue: [["Gross revenue mensual", "monthlyRevenue", "area"], ["Revenue por plataforma", "revenueByPlatform", "pie"], ["Forecast 30/60/90", "forecast", "area"]],
    royalties: [["Paid vs pending", "royalties", "pie"], ["Splits", "splitPercentages", "bar"], ["Forecast", "forecast", "line"]],
    editorial: [["Contenido por canal", "contentChannels", "pie"], ["Publicaciones por semana", "editorialWeeks", "bar"], ["Próximos contenidos", "editorialWeeks", "line"]],
    social: [["Reach por plataforma", "socialReach", "bar"], ["Engagement rate", "engagement", "bar"], ["Clicks trend", "socialClicks", "line"]],
    content: [["Contenido por pilar", "contentPillars", "pie"], ["Contenido por estado", "contentPipeline", "pie"], ["Producción mensual", "contentMonthly", "bar"]],
    campaigns: [["Budget vs results", "campaignPerformance", "bar"], ["Campaign status", "campaignStatus", "pie"], ["ROI estimado", "campaignRoi", "line"]],
    reports: [["Demos reviewed", "reportsReviewed", "bar"], ["Tracks recommended", "reportsTracks", "line"], ["Artists contacted", "reportsArtists", "bar"]],
    distribution: [["By distributor", "distributors", "pie"], ["DSP coverage", "dspCoverage", "bar"], ["Status", "distributionStatus", "pie"]]
  };
  const charts = config[moduleKey] ?? [];
  return <div className="grid gap-4 xl:grid-cols-3">{charts.map(([title, key, type]) => <ChartPanel key={title} title={title}>{type === "pie" ? <PieGraph data={chartData[key]} /> : type === "area" ? <AreaGraph data={chartData[key]} dataKey={metricKey(chartData[key])} /> : type === "line" ? <LineGraph data={chartData[key]} dataKey={metricKey(chartData[key])} /> : <BarGraph data={chartData[key]} dataKey={metricKey(chartData[key])} />}</ChartPanel>)}</div>;
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-2xl"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-lg font-black tracking-tight">{title}</h2>{action}</div>{children}</section>;
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return <Panel title={title}>{children}</Panel>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl backdrop-blur-xl"><p className="text-sm text-zinc-500">{label}</p><p className="mt-3 text-3xl font-black tracking-tight">{value}</p></div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[var(--brand)]">{children}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-10 text-center text-sm text-zinc-400">{text}</div>;
}

function Logo({ workspace, size = "md" }: { workspace: Workspace; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "size-20 text-2xl" : "size-11";
  return <div className={`${cls} flex items-center justify-center rounded-2xl font-black text-black`} style={{ background: workspace.brand_color }}>{workspace.label_name.slice(0, 2).toUpperCase()}</div>;
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</span><input className={controlClass} value={value} onChange={event => onChange(event.target.value)} /></label>;
}

function AreaGraph({ data, dataKey }: { data: ChartRow[]; dataKey: string }) {
  return <div className="h-64"><ResponsiveContainer><AreaChart data={data}><defs><linearGradient id="brandArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.7} /><stop offset="100%" stopColor="var(--brand)" stopOpacity={0.04} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" /><XAxis dataKey="name" stroke="#71717a" /><YAxis stroke="#71717a" /><Tooltip contentStyle={tooltipStyle} /><Area dataKey={dataKey} stroke="var(--brand)" fill="url(#brandArea)" /></AreaChart></ResponsiveContainer></div>;
}

function BarGraph({ data, dataKey }: { data: ChartRow[]; dataKey: string }) {
  return <div className="h-64"><ResponsiveContainer><BarChart data={data}><CartesianGrid stroke="rgba(255,255,255,.06)" /><XAxis dataKey="name" stroke="#71717a" /><YAxis stroke="#71717a" /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey={dataKey} radius={[8, 8, 0, 0]} fill="var(--brand)" /></BarChart></ResponsiveContainer></div>;
}

function LineGraph({ data, dataKey = "value" }: { data: ChartRow[]; dataKey?: string }) {
  return <div className="h-64"><ResponsiveContainer><LineChart data={data}><CartesianGrid stroke="rgba(255,255,255,.06)" /><XAxis dataKey="name" stroke="#71717a" /><YAxis stroke="#71717a" /><Tooltip contentStyle={tooltipStyle} /><Line dataKey={dataKey} stroke="var(--brand)" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div>;
}

function PieGraph({ data }: { data: ChartRow[] }) {
  return <div className="h-64"><ResponsiveContainer><PieChart><Tooltip contentStyle={tooltipStyle} /><Legend /><Pie data={data} dataKey={metricKey(data)} nameKey="name" innerRadius={55} outerRadius={90}>{data.map((_, index) => <Cell key={index} fill={["#B6FF1A", "#2F7DFF", "#A78BFA", "#FB7185", "#FBBF24"][index % 5]} />)}</Pie></PieChart></ResponsiveContainer></div>;
}

function Activity({ text }: { text: string }) {
  return <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-3"><span className="mt-1 size-2 rounded-full bg-[var(--brand)]" /><div><p className="text-sm font-semibold">{text}</p><p className="text-xs text-zinc-500">Workspace activity</p></div></div>;
}

const controlClass = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]";
const secondaryButton = "rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 font-bold transition hover:bg-white/[0.08]";
const tooltipStyle = { background: "#090b0f", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#fff" };
type ChartRow = { name: string; [key: string]: string | number };
type ChartData = Record<string, ChartRow[]>;

function buildPayload(module: ModuleConfig, values: Row) {
  const payload: Row = {};
  module.fields.forEach(field => {
    const value = values[field.key];
    payload[field.key] = field.type === "number" ? Number(value ?? 0) : value ?? "";
  });
  return payload;
}

function renderCell(value: RowValue | undefined, field: FieldConfig) {
  if (!value) return "-";
  const text = String(value);
  if (field.type === "file" && isImageUrl(text)) return <img alt="" src={text} className="h-12 w-12 rounded-xl object-cover" />;
  if (field.type === "url") return <a href={text} target="_blank" className="text-[var(--brand)] underline" rel="noreferrer">Open</a>;
  if (field.type === "file") return text;
  return text;
}

function isImageUrl(url: string) {
  return /\.(png|jpg|jpeg|gif|webp|avif)$/i.test(url) || url.startsWith("http");
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}€`;
}

function metricKey(data: ChartRow[]) {
  return Object.keys(data[0] ?? { value: 0 }).find(key => key !== "name") ?? "value";
}

function groupCount(rows: Row[], key: string, fallback = "Unknown"): ChartRow[] {
  const counts = new Map<string, number>();
  rows.forEach(row => counts.set(String(row[key] ?? fallback), (counts.get(String(row[key] ?? fallback)) ?? 0) + 1));
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

function sumBy(rows: Row[], groupKey: string, valueKey: string, outKey = "value"): ChartRow[] {
  const sums = new Map<string, number>();
  rows.forEach(row => sums.set(String(row[groupKey] ?? "Unknown"), (sums.get(String(row[groupKey] ?? "Unknown")) ?? 0) + Number(row[valueKey] ?? 0)));
  return Array.from(sums.entries()).map(([name, value]) => ({ name, [outKey]: value }));
}

function byMonth(rows: Row[], dateKey: string, valueKey?: string, outKey = "count"): ChartRow[] {
  const sums = new Map<string, number>();
  rows.forEach(row => {
    const month = String(row[dateKey] ?? row.created_at ?? "").slice(0, 7) || "TBD";
    sums.set(month, (sums.get(month) ?? 0) + (valueKey ? Number(row[valueKey] ?? 0) : 1));
  });
  return Array.from(sums.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, [outKey]: value }));
}

function computeStats(rows: RowsByTable) {
  const revenue = rows.revenue_records ?? [];
  const splits = rows.royalty_splits ?? [];
  return {
    demos: rows.demos?.length ?? 0,
    tracks: rows.tracks?.length ?? 0,
    releases: rows.releases?.length ?? 0,
    revenue: revenue.reduce((sum, row) => sum + Number(row.gross_revenue ?? 0), 0),
    pendingRoyalties: splits.filter(row => String(row.status ?? "").toLowerCase() !== "paid").reduce((sum, row) => sum + Number(row.percentage ?? 0), 0)
  };
}

function makeCharts(rows: RowsByTable): ChartData {
  const revenue = rows.revenue_records ?? [];
  const releases = rows.releases ?? [];
  const demos = rows.demos ?? [];
  const campaigns = rows.campaigns ?? [];
  const content = rows.content_items ?? [];
  const social = rows.social_posts ?? [];
  const reports = rows.ar_reports ?? [];
  const distribution = rows.distribution_records ?? [];
  const tracks = rows.tracks ?? [];
  const splits = rows.royalty_splits ?? [];
  return {
    monthlyRevenue: byMonth(revenue, "payment_date", "gross_revenue", "revenue"),
    releaseStatus: groupCount(releases, "status"),
    demosByMonth: byMonth(demos, "created_at"),
    campaignPerformance: campaigns.map(row => ({ name: String(row.name ?? "Campaign"), clicks: Number(row.clicks ?? 0), conversions: Number(row.conversions ?? 0) })),
    topArtists: sumBy(revenue, "artist_name", "gross_revenue", "revenue"),
    contentPipeline: groupCount(content, "status"),
    royalties: groupCount(splits, "status"),
    forecast: [{ name: "30d", forecast: revenue.reduce((s, r) => s + Number(r.gross_revenue ?? 0), 0) * .35 }, { name: "60d", forecast: revenue.reduce((s, r) => s + Number(r.gross_revenue ?? 0), 0) * .62 }, { name: "90d", forecast: revenue.reduce((s, r) => s + Number(r.gross_revenue ?? 0), 0) * .9 }],
    demoStatus: groupCount(demos, "status"),
    demoScores: demos.map(row => ({ name: String(row.track_title ?? "Demo"), score: Number(row.ar_score ?? 0) })),
    demoGenres: groupCount(demos, "genre"),
    trackStatus: groupCount(tracks, "status"),
    trackEnergy: groupCount(tracks, "energy"),
    artistCountries: groupCount(rows.artists ?? [], "country"),
    revenueByRelease: sumBy(revenue, "release_title", "gross_revenue", "revenue"),
    releaseTimeline: byMonth(releases, "release_date"),
    revenueByPlatform: sumBy(revenue, "platform", "gross_revenue", "revenue"),
    splitPercentages: splits.map(row => ({ name: String(row.participant_name ?? "Split"), percentage: Number(row.percentage ?? 0) })),
    contentChannels: groupCount(rows.editorial_calendar_items ?? [], "channel"),
    editorialWeeks: byMonth(rows.editorial_calendar_items ?? [], "date"),
    socialReach: sumBy(social, "platform", "reach", "reach"),
    engagement: social.map(row => ({ name: String(row.hook ?? row.platform ?? "Post"), engagement: Number(row.reach ?? 0) ? ((Number(row.likes ?? 0) + Number(row.comments ?? 0) + Number(row.saves ?? 0) + Number(row.shares ?? 0)) / Number(row.reach)) * 100 : 0 })),
    socialClicks: byMonth(social, "publish_date", "clicks", "clicks"),
    contentPillars: groupCount(content, "pillar"),
    contentMonthly: byMonth(content, "target_date"),
    campaignStatus: groupCount(campaigns, "status"),
    campaignRoi: campaigns.map(row => ({ name: String(row.name ?? "Campaign"), roi: Number(row.conversions ?? 0) * 10 - Number(row.budget ?? 0) })),
    reportsReviewed: reports.map(row => ({ name: String(row.period ?? "Report"), demos: Number(row.demos_reviewed ?? 0) })),
    reportsTracks: reports.map(row => ({ name: String(row.period ?? "Report"), tracks: String(row.tracks_recommended ?? "").split(",").filter(Boolean).length })),
    reportsArtists: reports.map(row => ({ name: String(row.period ?? "Report"), artists: String(row.artists_contacted ?? "").split(",").filter(Boolean).length || Number(row.artists_contacted ?? 0) })),
    distributors: groupCount(distribution, "distributor"),
    dspCoverage: distribution.map(row => ({ name: String(row.release_title ?? "Release"), dsps: Number(row.dsps_active ?? 0) })),
    distributionStatus: groupCount(distribution, "status")
  };
}

function recentActivity(rows: RowsByTable) {
  return [
    `${rows.demos?.[0]?.track_title ?? "A demo"} reviewed by A&R`,
    `${rows.releases?.[0]?.title ?? "A release"} updated in release pipeline`,
    `${rows.campaigns?.[0]?.name ?? "A campaign"} performance changed`,
    `${rows.revenue_records?.[0]?.release_title ?? "Revenue"} synced in Revenue System`
  ];
}
