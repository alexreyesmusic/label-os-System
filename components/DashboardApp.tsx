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
import { createClient } from "@/lib/supabase/browser";
import { canWrite, modules, type FieldConfig, type ModuleConfig, type Role } from "@/lib/modules";
import type { Membership, Profile, Tenant } from "@/lib/server-data";

type Row = Record<string, unknown> & { id: string; tenant_id: string; created_by?: string; created_at?: string; updated_at?: string };
type RowsByTable = Record<string, Row[]>;

const systemModules = [
  { key: "master", label: "Master Dashboard", icon: "◆" },
  ...modules.map(module => ({ key: module.key, label: module.label, icon: module.icon })),
  { key: "settings", label: "Settings", icon: "⚙" }
];

export function DashboardApp({
  tenant,
  profile,
  membership,
  initialRows
}: {
  tenant: Tenant;
  profile: Profile;
  membership: Membership;
  initialRows: RowsByTable;
}) {
  const supabase = createClient();
  const [tenantState, setTenantState] = useState<Tenant>(tenant);
  const [rowsByTable, setRowsByTable] = useState<RowsByTable>(initialRows);
  const [active, setActive] = useState("master");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [modal, setModal] = useState<{ module: ModuleConfig; row?: Row } | null>(null);
  const [toast, setToast] = useState("");
  const role = membership.role;
  const activeModule = modules.find(module => module.key === active);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  async function refresh(table: string) {
    const { data, error } = await supabase.from(table).select("*").eq("tenant_id", tenantState.id).order("created_at", { ascending: false });
    if (error) return notify(error.message);
    setRowsByTable(prev => ({ ...prev, [table]: (data ?? []) as Row[] }));
  }

  async function save(module: ModuleConfig, values: Record<string, unknown>) {
    const payload = buildPayload(module, values, tenantState.id);
    const request = values.id
      ? supabase.from(module.table).update(payload).eq("id", values.id)
      : supabase.from(module.table).insert(payload);

    const { error } = await request;
    if (error) return notify(error.message);
    setModal(null);
    await refresh(module.table);
    notify(values.id ? "Changes saved" : "Item created");
  }

  async function remove(module: ModuleConfig, row: Row) {
    if (!confirm("Delete this item? This action cannot be undone.")) return;
    const { error } = await supabase.from(module.table).delete().eq("id", row.id);
    if (error) return notify(error.message);
    await refresh(module.table);
    notify("Item deleted");
  }

  async function duplicate(module: ModuleConfig, row: Row) {
    const copy = Object.fromEntries(
      Object.entries(row).filter(([key]: [string, unknown]) => !["id", "created_at", "updated_at", "created_by"].includes(key))
    );
    const { error } = await supabase.from(module.table).insert({ ...copy, tenant_id: tenantState.id });
    if (error) return notify(error.message);
    await refresh(module.table);
    notify("Item duplicated");
  }

  async function quickStatus(module: ModuleConfig, row: Row, status: string) {
    const { error } = await supabase.from(module.table).update({ status }).eq("id", row.id);
    if (error) return notify(error.message);
    await refresh(module.table);
    notify(`Status changed to ${status}`);
  }

  async function convertToRelease(module: ModuleConfig, row: Row) {
    const title = String(row.track_title ?? row.title ?? "Untitled Release");
    const { error: releaseError } = await supabase.from("releases").insert({
      tenant_id: tenantState.id,
      title,
      artist_name: row.artist_name ?? null,
      cover_url: row.cover_url ?? row.artwork_link ?? null,
      release_type: "Single",
      status: "Approved",
      tracks_included: title,
      contract_status: row.contract_status ?? "Pending",
      master_status: row.master_status ?? "Pending",
      artwork_status: row.cover_url || row.artwork_link ? "Uploaded" : "Missing",
      metadata_status: "Incomplete",
      campaign_status: "Not Started",
      notes: row.internal_comments ?? row.notes ?? null
    });
    if (releaseError) return notify(releaseError.message);
    await supabase.from(module.table).update({ status: "Approved", decision: "Yes", assigned_release: title }).eq("id", row.id);
    await Promise.all([refresh(module.table), refresh("releases")]);
    notify("Track converted into release");
  }

  async function archive(module: ModuleConfig, row: Row) {
    if (!("status" in row)) return notify("This item has no status field");
    const { error } = await supabase.from(module.table).update({ status: "Archived" }).eq("id", row.id);
    if (error) return notify(error.message);
    await refresh(module.table);
    notify("Item archived");
  }

  async function uploadFile(bucket: string, file: File) {
    const path = `${tenantState.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      notify(error.message);
      return "";
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    await supabase.from("files").insert({ tenant_id: tenantState.id, bucket, path, public_url: data.publicUrl, file_name: file.name, mime_type: file.type, size_bytes: file.size });
    return data.publicUrl;
  }

  async function exportCSV(module?: ModuleConfig) {
    const rows = module ? rowsByTable[module.table] ?? [] : Object.entries(rowsByTable).flatMap(([table, rows]) => rows.map(row => ({ table, ...row })));
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
    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(",").map(item => item.replaceAll('"', "").trim());
    const records = lines.map(line => {
      const values = line.split(",").map(item => item.replaceAll(/^"|"$/g, "").replaceAll('""', '"'));
      return headers.reduce<Record<string, unknown>>((acc, key, index) => {
        acc[key] = values[index] ?? "";
        return acc;
      }, { tenant_id: tenantState.id });
    });
    const { error } = await supabase.from(module.table).insert(records);
    if (error) return notify(error.message);
    await refresh(module.table);
    notify("CSV imported");
  }

  async function saveTenant(values: Partial<Tenant>) {
    const { data, error } = await supabase.from("tenants").update(values).eq("id", tenantState.id).select("*").single();
    if (error) return notify(error.message);
    setTenantState(data as Tenant);
    notify("Settings updated");
  }

  const currentRows = activeModule ? rowsByTable[activeModule.table] ?? [] : [];
  const filteredRows = useMemo(() => {
    return currentRows
      .filter(row => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
      .filter(row => statusFilter === "All" || String(row.status ?? row.contract_status ?? row.master_status ?? "") === statusFilter)
      .sort((a, b) => sortDir === "desc" ? String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) : String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));
  }, [currentRows, query, statusFilter, sortDir]);
  const stats = useMemo(() => computeStats(rowsByTable), [rowsByTable]);
  const chartData = useMemo(() => makeCharts(rowsByTable), [rowsByTable]);

  return (
    <div
      className="relative flex min-h-screen overflow-hidden bg-[#060709]"
      style={{
        "--brand": tenantState.primary_color,
        "--accent": "#2F7DFF"
      } as CSSProperties}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(182,255,26,.10),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(47,125,255,.12),transparent_30%)]" />
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-72 border-r border-white/10 bg-black/55 p-4 shadow-2xl backdrop-blur-2xl lg:block">
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <div className="flex items-center gap-3">
            <Logo tenant={tenantState} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">Label OS</p>
              <p className="truncate text-xs text-zinc-500">{tenantState.label_name}</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-white/10 bg-black/35 p-3 text-xs text-zinc-400">{role.toUpperCase()} access · {tenantState.currency}</p>
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
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Label OS · Demo premium para sellos modernos</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{active === "master" ? "MASTER DASHBOARD" : systemModules.find(item => item.key === active)?.label}</h1>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <input className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)] md:w-72" value={query} onChange={event => setQuery(event.target.value)} placeholder="Global search..." />
              <button onClick={() => exportCSV(activeModule)} className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-black transition hover:bg-white/[0.08]">Export CSV</button>
              <form action="/auth/logout" method="post"><button className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-black transition hover:bg-white/[0.08]">Logout</button></form>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {systemModules.map(item => <button key={item.key} onClick={() => setActive(item.key)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold ${active === item.key ? "bg-white text-black" : "bg-white/[0.045] text-zinc-300"}`}>{item.label}</button>)}
          </div>
        </header>

        <section className="space-y-6 p-4 md:p-7">
          {active === "master" && <Master stats={stats} chartData={chartData} rowsByTable={rowsByTable} />}
          {active === "settings" && <Settings tenant={tenantState} profile={profile} onSave={saveTenant} uploadFile={uploadFile} />}
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
      {modal && <CrudModal module={modal.module} row={modal.row} onClose={() => setModal(null)} onSave={(values: Record<string, unknown>) => save(modal.module, values)} uploadFile={uploadFile} />}
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
        <p className="mt-3 max-w-2xl text-zinc-400">Demo premium para sellos modernos. Datos reales del tenant activo, protegidos por Row Level Security.</p>
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
        <ChartPanel title="Royalties pending vs paid"><PieGraph data={chartData.royalties} /></ChartPanel>
        <ChartPanel title="Forecast próximos 90 días"><AreaGraph data={chartData.forecast} dataKey="forecast" /></ChartPanel>
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
                  {props.rows.map(row => <tr key={row.id} className="border-t border-white/10 transition hover:bg-white/[0.035]">
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

type CrudModalProps = {
  module: ModuleConfig;
  row?: Row;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
  uploadFile: (bucket: string, file: File) => Promise<string>;
};

function CrudModal({
  module,
  row,
  onClose,
  onSave,
  uploadFile
}: CrudModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>(row ?? {});
  const [uploading, setUploading] = useState("");

  async function handleFile(field: FieldConfig, file: File) {
    if (!field.bucket) return;
    setUploading(field.key);
    const url = await uploadFile(field.bucket, file);
    if (url) setValues(prev => ({ ...prev, [field.key]: url }));
    setUploading("");
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <form onSubmit={event => { event.preventDefault(); onSave(values); }} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0D1014]/95 p-5 shadow-2xl backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-black">{row ? "Edit" : "Create"} {module.label}</h3><button type="button" onClick={onClose} className={secondaryButton}>Cancel</button></div>
      <div className="grid gap-3 md:grid-cols-2">
        {module.fields.map(field => <label key={field.key} className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{field.label}</span>
          {field.type === "textarea" && <textarea className={controlClass} rows={3} value={String(values[field.key] ?? "")} onChange={event => setValues({ ...values, [field.key]: event.target.value })} />}
          {field.type === "select" && <select className={controlClass} value={String(values[field.key] ?? field.options?.[0] ?? "")} onChange={event => setValues({ ...values, [field.key]: event.target.value })}>{field.options?.map(option => <option key={option}>{option}</option>)}</select>}
          {field.type === "file" && <div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-3"><input type="file" onChange={event => event.target.files?.[0] && handleFile(field, event.target.files[0])} /><p className="mt-2 truncate text-xs text-zinc-500">{uploading === field.key ? "Uploading..." : String(values[field.key] ?? "Drag/drop via picker or paste URL after upload")}</p>{values[field.key] && isImageUrl(String(values[field.key])) && <img alt="" src={String(values[field.key])} className="mt-3 h-28 rounded-xl object-cover" />}</div>}
          {!["textarea", "select", "file"].includes(field.type ?? "text") && <input className={controlClass} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={String(values[field.key] ?? "")} onChange={event => setValues({ ...values, [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value })} />}
        </label>)}
      </div>
      <button className="mt-5 w-full rounded-xl bg-[var(--brand)] px-4 py-3 font-black text-black">Save</button>
    </form>
  </div>;
}

type SettingsProps = {
  tenant: Tenant;
  profile: Profile;
  onSave: (values: Partial<Tenant>) => void;
  uploadFile: (bucket: string, file: File) => Promise<string>;
};

function Settings({
  tenant,
  profile,
  onSave,
  uploadFile
}: SettingsProps) {
  const [values, setValues] = useState<Partial<Tenant>>(tenant);
  async function uploadLogo(file: File) {
    const logoUrl = await uploadFile("covers", file);
    if (logoUrl) setValues(prev => ({ ...prev, logo_url: logoUrl }));
  }
  return <Panel title="Settings / Branding">
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
        <Logo tenant={{ ...tenant, ...values } as Tenant} size="lg" />
        <h3 className="mt-4 text-2xl font-black">{values.label_name}</h3>
        <p className="text-sm text-zinc-500">{profile.email} · {values.workspace_name ?? "Label OS"}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Label name" value={values.label_name ?? ""} onChange={value => setValues(prev => ({ ...prev, label_name: value }))} />
        <Input label="Workspace name" value={values.workspace_name ?? ""} onChange={value => setValues(prev => ({ ...prev, workspace_name: value }))} />
        <Input label="Country" value={values.country ?? ""} onChange={value => setValues(prev => ({ ...prev, country: value }))} />
        <Input label="Currency" value={values.currency ?? ""} onChange={value => setValues(prev => ({ ...prev, currency: value }))} />
        <Input label="Main genre" value={values.main_genre ?? ""} onChange={value => setValues(prev => ({ ...prev, main_genre: value }))} />
        <Input label="Timezone" value={values.timezone ?? ""} onChange={value => setValues(prev => ({ ...prev, timezone: value }))} />
        <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Primary color</span><input className={`${controlClass} h-11`} type="color" value={values.primary_color ?? "#B6FF1A"} onChange={event => setValues(prev => ({ ...prev, primary_color: event.target.value }))} /></label>
        <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Logo</span><input type="file" onChange={event => event.target.files?.[0] && uploadLogo(event.target.files[0])} /></label>
      </div>
    </div>
    <button onClick={() => onSave(values)} className="mt-5 rounded-xl bg-[var(--brand)] px-4 py-3 font-black text-black">Save Settings</button>
  </Panel>;
}

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

function Logo({ tenant, size = "md" }: { tenant: Tenant; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "size-20 text-2xl" : "size-11";
  if (tenant.logo_url) return <img alt="" src={tenant.logo_url} className={`${cls} rounded-2xl object-cover`} />;
  return <div className={`${cls} flex items-center justify-center rounded-2xl font-black text-black`} style={{ background: tenant.primary_color }}>{tenant.label_name?.slice(0, 2).toUpperCase() || "LO"}</div>;
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
  return <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-3"><span className="mt-1 size-2 rounded-full bg-[var(--brand)]" /><div><p className="text-sm font-semibold">{text}</p><p className="text-xs text-zinc-500">Tenant activity</p></div></div>;
}

const controlClass = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]";
const secondaryButton = "rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 font-bold transition hover:bg-white/[0.08]";
const tooltipStyle = { background: "#090b0f", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#fff" };

type ChartRow = { name: string; [key: string]: string | number };
type ChartData = Record<string, ChartRow[]>;

function buildPayload(module: ModuleConfig, values: Record<string, unknown>, tenantId: string) {
  const payload: Record<string, unknown> = { tenant_id: tenantId };
  module.fields.forEach(field => {
    const value = values[field.key];
    payload[field.key] = field.type === "number" ? Number(value ?? 0) : value ?? null;
  });
  return payload;
}

function renderCell(value: unknown, field: FieldConfig) {
  if (!value) return "—";
  const text = String(value);
  if (field.type === "file" && isImageUrl(text)) return <img alt="" src={text} className="h-12 w-12 rounded-xl object-cover" />;
  if (field.type === "url" || field.type === "file") return <a href={text} target="_blank" className="text-[var(--brand)] underline" rel="noreferrer">Open</a>;
  return text;
}

function isImageUrl(url: string) {
  return /\.(png|jpg|jpeg|gif|webp|avif)$/i.test(url) || url.includes("supabase");
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}€`;
}

function metricKey(data: ChartRow[]) {
  const row = data[0] ?? {};
  return Object.keys(row).find(key => key !== "name") ?? "value";
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
    contentChannels: groupCount(rows.editorial_calendar ?? [], "channel"),
    editorialWeeks: byMonth(rows.editorial_calendar ?? [], "date"),
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
