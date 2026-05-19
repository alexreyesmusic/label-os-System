"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Row = Record<string, any>;
type DemoState = Record<string, Row[]>;
type WorkspaceConfig = {
  labelName: string;
  workspaceName: string;
  logo: string;
  primary: string;
  accent: string;
};
type CrudModuleProps = {
  table: string;
  rows: Row[];
  onCreate: () => void;
  onEdit: (row: Row) => void;
  onDelete: (id: string) => void;
  exportCSV: () => void;
};
type CrudModalProps = {
  table: string;
  row?: Row;
  onClose: () => void;
  onSave: (values: Row) => void;
};
type CleanupProps = {
  data: DemoState;
  reset: () => void;
  clearAll: () => void;
  removeCategory: (key: string) => void;
};
type SettingsProps = {
  reset: () => void;
  clearAll: () => void;
  exportCSV: () => void;
  config: WorkspaceConfig;
  setConfig: (config: WorkspaceConfig) => void;
};

const storageKey = "reyesound-label-os-public-demo-v1";
const configKey = "reyesound-label-os-public-demo-config-v1";

const defaultConfig: WorkspaceConfig = {
  labelName: "Reyesound Records",
  workspaceName: "Label OS",
  logo: "RS",
  primary: "#B6FF1A",
  accent: "#2F7DFF"
};

const modules = [
  ["master", "Master Dashboard", ""],
  ["demos", "Demos", "demos"],
  ["artists", "Artists", "artists"],
  ["releases", "Releases", "releases"],
  ["revenue", "Revenue System", "revenue"],
  ["editorial", "Editorial Calendar", "editorial"],
  ["social", "Social Media", "social"],
  ["content", "Content Master", "content"],
  ["campaigns", "Campaign DB", "campaigns"],
  ["reports", "A&R Reports", "reports"],
  ["cleanup", "Data Cleanup", ""],
  ["settings", "Settings", ""]
] as const;

const navMeta: Record<string, { icon: string; group: string }> = {
  master: { icon: "◆", group: "Command" },
  demos: { icon: "♪", group: "A&R" },
  artists: { icon: "◎", group: "A&R" },
  releases: { icon: "◈", group: "Catalog" },
  revenue: { icon: "€", group: "Finance" },
  editorial: { icon: "□", group: "Growth" },
  social: { icon: "↗", group: "Growth" },
  content: { icon: "✦", group: "Growth" },
  campaigns: { icon: "◌", group: "Growth" },
  reports: { icon: "▣", group: "Ops" },
  cleanup: { icon: "⌫", group: "System" },
  settings: { icon: "⚙", group: "System" }
};

const fields: Record<string, { key: string; label: string; type?: string; options?: string[] }[]> = {
  demos: [
    { key: "artist", label: "Artista" }, { key: "track", label: "Track" }, { key: "genre", label: "Género" },
    { key: "bpm", label: "BPM", type: "number" }, { key: "key", label: "Key" }, { key: "link", label: "SoundCloud privado" },
    { key: "status", label: "Estado", options: ["Pendiente", "En revisión", "Aprobado", "Rechazado", "Necesita cambios"] },
    { key: "score", label: "Score", type: "number" }, { key: "fit", label: "Fit ADN", options: ["Bajo", "Medio", "Alto", "Perfecto"] },
    { key: "decision", label: "Decisión", options: ["Sí", "No", "Tal vez"] }, { key: "comments", label: "Comentarios A&R", type: "textarea" }
  ],
  artists: [
    { key: "name", label: "Nombre" }, { key: "country", label: "País" }, { key: "email", label: "Email" },
    { key: "instagram", label: "Instagram" }, { key: "soundcloud", label: "SoundCloud" },
    { key: "status", label: "Estado", options: ["Nuevo", "Activo", "En negociación", "Archivado"] }, { key: "notes", label: "Notas", type: "textarea" }
  ],
  releases: [
    { key: "title", label: "Release" }, { key: "artist", label: "Artista" }, { key: "date", label: "Fecha", type: "date" },
    { key: "status", label: "Estado", options: ["Idea", "Aprobado", "Contrato pendiente", "Master final recibido", "Campaña activa", "Publicado", "Archivado"] },
    { key: "contract", label: "Contrato firmado", options: ["No", "Sí"] }, { key: "master", label: "Master final", options: ["No", "Sí"] },
    { key: "artwork", label: "Artwork", options: ["No", "Sí"] }, { key: "metadata", label: "Metadata", options: ["Incompleta", "Completa"] },
    { key: "campaign", label: "Campaña", options: ["No iniciada", "Activa", "Completada"] }, { key: "notes", label: "Notas", type: "textarea" }
  ],
  revenue: [
    { key: "release", label: "Release" }, { key: "artist", label: "Artista" },
    { key: "platform", label: "Plataforma", options: ["Spotify", "Beatport", "Apple Music", "SoundCloud", "YouTube", "Bandcamp", "Other"] },
    { key: "gross", label: "Gross Revenue", type: "number" }, { key: "expenses", label: "Expenses", type: "number" },
    { key: "labelPct", label: "Label %", type: "number" }, { key: "artistPct", label: "Artist %", type: "number" },
    { key: "collabPct", label: "Collaborator %", type: "number" }, { key: "status", label: "Status", options: ["Pending", "Paid", "Partially Paid"] },
    { key: "paymentDate", label: "Payment Date", type: "date" }, { key: "notes", label: "Notes", type: "textarea" }
  ],
  editorial: [
    { key: "date", label: "Fecha", type: "date" }, { key: "category", label: "Categoría", options: ["Release", "Track Selection", "Reyesound Session", "Academy", "Blog", "Artist Promo", "Behind the Scenes", "Community", "Event"] },
    { key: "title", label: "Título" }, { key: "channel", label: "Canal", options: ["Instagram", "YouTube", "SoundCloud", "Spotify", "Blog", "Newsletter", "TikTok"] },
    { key: "status", label: "Estado", options: ["Idea", "En producción", "Diseñado", "Programado", "Publicado"] },
    { key: "owner", label: "Responsable" }, { key: "relation", label: "Relación" }, { key: "cta", label: "CTA" }, { key: "notes", label: "Notas", type: "textarea" }
  ],
  social: [
    { key: "platform", label: "Plataforma" }, { key: "format", label: "Formato", options: ["Reel", "Story", "Carousel", "Post", "Short", "Live"] },
    { key: "hook", label: "Hook" }, { key: "caption", label: "Caption", type: "textarea" }, { key: "hashtags", label: "Hashtags" },
    { key: "cta", label: "CTA" }, { key: "asset", label: "Asset Link" }, { key: "date", label: "Fecha publicación", type: "date" },
    { key: "status", label: "Estado", options: ["Draft", "Designed", "Scheduled", "Published"] },
    { key: "reach", label: "Reach", type: "number" }, { key: "likes", label: "Likes", type: "number" }, { key: "comments", label: "Comments", type: "number" },
    { key: "saves", label: "Saves", type: "number" }, { key: "shares", label: "Shares", type: "number" }, { key: "clicks", label: "Clicks", type: "number" }
  ],
  content: [
    { key: "code", label: "Content ID" }, { key: "topic", label: "Tema" },
    { key: "pillar", label: "Pilar", options: ["A&R", "Producción", "Mezcla", "Mastering", "Distribución", "Cultura Electrónica", "Track Selection", "Releases", "Eventos", "Comunidad"] },
    { key: "type", label: "Tipo", options: ["Reel", "Blog", "Carousel", "Story", "Newsletter", "YouTube Video", "Short"] },
    { key: "objective", label: "Objetivo", options: ["Awareness", "Education", "Conversion", "Community", "Authority"] },
    { key: "status", label: "Estado", options: ["Idea", "Script", "Diseño", "Grabado", "Editado", "Programado", "Publicado"] },
    { key: "owner", label: "Responsable" }, { key: "targetDate", label: "Fecha objetivo", type: "date" }, { key: "asset", label: "Asset" }, { key: "notes", label: "Notas", type: "textarea" }
  ],
  campaigns: [
    { key: "name", label: "Campaña" }, { key: "type", label: "Tipo", options: ["Release Campaign", "Demo Submission Campaign", "Brand Awareness", "Event Campaign", "Academy Campaign", "Playlist Growth", "Website Traffic"] },
    { key: "objective", label: "Objetivo", type: "textarea" }, { key: "start", label: "Inicio", type: "date" }, { key: "end", label: "Fin", type: "date" },
    { key: "budget", label: "Budget", type: "number" }, { key: "channel", label: "Canal" }, { key: "audience", label: "Audiencia" }, { key: "release", label: "Release relacionado" },
    { key: "status", label: "Estado", options: ["Planning", "Active", "Paused", "Completed"] },
    { key: "reach", label: "Reach", type: "number" }, { key: "clicks", label: "Clicks", type: "number" }, { key: "conversions", label: "Conversions", type: "number" }
  ],
  reports: [
    { key: "period", label: "Periodo" }, { key: "reviewed", label: "Demos revisados", type: "number" },
    { key: "recommended", label: "Tracks recomendados" }, { key: "contacted", label: "Artistas contactados" },
    { key: "tracking", label: "Releases en seguimiento" }, { key: "problems", label: "Problemas", type: "textarea" },
    { key: "next", label: "Próximas acciones", type: "textarea" }, { key: "comments", label: "Comentarios", type: "textarea" }
  ]
};

const initialData: DemoState = {
  demos: [
    { id: "d1", artist: "Nexa Vale", track: "Basement Signal", genre: "Peak Time Techno", bpm: 134, key: "F#m", link: "https://soundcloud.com/private/nexa-basement", status: "Pendiente", score: 7, fit: "Alto", decision: "Tal vez", comments: "Kick sólido, falta tensión en el break." },
    { id: "d2", artist: "Luma Grado", track: "Chrome Ritual", genre: "Hardgroove", bpm: 141, key: "Dm", link: "https://soundcloud.com/private/chrome-ritual", status: "Aprobado", score: 9, fit: "Perfecto", decision: "Sí", comments: "Perfecto para VA de verano." },
    { id: "d3", artist: "Kairo Unit", track: "Pressure Index", genre: "Industrial Techno", bpm: 138, key: "Gm", link: "https://soundcloud.com/private/pressure-index", status: "En revisión", score: 8, fit: "Alto", decision: "Tal vez", comments: "Revisar hats." },
    { id: "d4", artist: "Mara Volt", track: "Nocturnal Grid", genre: "Melodic Techno", bpm: 126, key: "Am", link: "https://soundcloud.com/private/nocturnal-grid", status: "Necesita cambios", score: 6, fit: "Medio", decision: "Tal vez", comments: "Bajo invasivo." },
    { id: "d5", artist: "Drex Operator", track: "Substation 9", genre: "Electro", bpm: 132, key: "Cm", link: "https://soundcloud.com/private/substation-9", status: "Rechazado", score: 4, fit: "Bajo", decision: "No", comments: "No encaja ahora." },
    { id: "d6", artist: "Sofia Brix", track: "Afterhour Bloom", genre: "Hypnotic Techno", bpm: 130, key: "Em", link: "https://soundcloud.com/private/afterhour-bloom", status: "Aprobado", score: 8, fit: "Alto", decision: "Sí", comments: "Pedir stems." },
    { id: "d7", artist: "Orion Path", track: "Blue Current", genre: "Progressive House", bpm: 124, key: "Bbm", link: "https://soundcloud.com/private/blue-current", status: "Pendiente", score: 5, fit: "Medio", decision: "Tal vez", comments: "" },
    { id: "d8", artist: "Veltra", track: "Acid Warehouse", genre: "Acid Techno", bpm: 136, key: "C#m", link: "https://soundcloud.com/private/acid-warehouse", status: "En revisión", score: 8, fit: "Perfecto", decision: "Sí", comments: "Chequear vocal sample." }
  ],
  artists: [
    { id: "a1", name: "Luma Grado", country: "España", email: "luma@studio.es", instagram: "@lumagrado", soundcloud: "soundcloud.com/lumagrado", status: "Activo", notes: "Hardgroove con buena recepción de DJs." },
    { id: "a2", name: "Sofia Brix", country: "Argentina", email: "sofia@brix.audio", instagram: "@sofiabrix", soundcloud: "soundcloud.com/sofiabrix", status: "En negociación", notes: "Potencial para EP conceptual." },
    { id: "a3", name: "Kairo Unit", country: "Alemania", email: "kairo@unit.de", instagram: "@kairounit", soundcloud: "soundcloud.com/kairounit", status: "Nuevo", notes: "Sonido industrial." },
    { id: "a4", name: "Veltra", country: "México", email: "veltra@live.mx", instagram: "@veltra303", soundcloud: "soundcloud.com/veltra303", status: "Nuevo", notes: "Acid agresivo." },
    { id: "a5", name: "Mara Volt", country: "Italia", email: "mara@volt.it", instagram: "@maravolt", soundcloud: "soundcloud.com/maravolt", status: "Activo", notes: "Necesita dirección de mezcla." }
  ],
  releases: [
    { id: "r1", title: "Nocturnal Systems EP", artist: "Mara Volt", date: "2026-06-14", status: "Contrato pendiente", contract: "No", master: "No", artwork: "No", metadata: "Completa", campaign: "No iniciada", notes: "Prioridad: artwork y master." },
    { id: "r2", title: "Warehouse Coordinates VA", artist: "Varios Artistas", date: "2026-07-05", status: "Campaña activa", contract: "Sí", master: "Sí", artwork: "Sí", metadata: "Completa", campaign: "Activa", notes: "Falta segundo envío de promo." },
    { id: "r3", title: "Afterhour Bloom", artist: "Sofia Brix", date: "2026-05-29", status: "Aprobado", contract: "No", master: "No", artwork: "Sí", metadata: "Incompleta", campaign: "No iniciada", notes: "Activar campaña." },
    { id: "r4", title: "North Terminal", artist: "Reyesound", date: "2026-04-12", status: "Publicado", contract: "Sí", master: "Sí", artwork: "Sí", metadata: "Completa", campaign: "Completada", notes: "Buen long tail." },
    { id: "r5", title: "Deep Voltage Tools", artist: "Kairo Unit", date: "2026-08-18", status: "Idea", contract: "No", master: "No", artwork: "No", metadata: "Incompleta", campaign: "No iniciada", notes: "Tool EP." }
  ],
  revenue: [
    { id: "v1", release: "North Terminal", artist: "Reyesound", platform: "Spotify", gross: 4280, expenses: 900, labelPct: 100, artistPct: 0, collabPct: 0, status: "Paid", paymentDate: "2026-05-10", notes: "Q2 parcial." },
    { id: "v2", release: "North Terminal", artist: "Reyesound", platform: "Beatport", gross: 1320, expenses: 180, labelPct: 100, artistPct: 0, collabPct: 0, status: "Paid", paymentDate: "2026-05-12", notes: "Top 100." },
    { id: "v3", release: "Warehouse Coordinates VA", artist: "Varios Artistas", platform: "Spotify", gross: 980, expenses: 350, labelPct: 45, artistPct: 50, collabPct: 5, status: "Partially Paid", paymentDate: "", notes: "Pre-release attribution." },
    { id: "v4", release: "Warehouse Coordinates VA", artist: "Varios Artistas", platform: "SoundCloud", gross: 260, expenses: 60, labelPct: 45, artistPct: 50, collabPct: 5, status: "Pending", paymentDate: "", notes: "Promo monetizada." },
    { id: "v5", release: "Nocturnal Systems EP", artist: "Mara Volt", platform: "Bandcamp", gross: 420, expenses: 120, labelPct: 50, artistPct: 50, collabPct: 0, status: "Pending", paymentDate: "", notes: "Preorder." },
    { id: "v6", release: "Afterhour Bloom", artist: "Sofia Brix", platform: "YouTube", gross: 180, expenses: 80, labelPct: 50, artistPct: 50, collabPct: 0, status: "Pending", paymentDate: "", notes: "Visual teaser." }
  ],
  editorial: [
    { id: "e1", date: "2026-05-22", category: "Track Selection", title: "Demo review: Basement Signal", channel: "Instagram", status: "Programado", owner: "A&R", relation: "CNT-001", cta: "Envía tu demo", notes: "Usar scoring." },
    { id: "e2", date: "2026-05-25", category: "Artist Promo", title: "Sofia Brix studio process", channel: "TikTok", status: "En producción", owner: "Sofia", relation: "Afterhour Bloom", cta: "Pre-save", notes: "30 segundos." },
    { id: "e3", date: "2026-05-28", category: "Track Selection", title: "Warm up deep tech picks", channel: "Newsletter", status: "Programado", owner: "A&R", relation: "CNT-005", cta: "Responder", notes: "Curaduría mensual." },
    { id: "e4", date: "2026-06-12", category: "Release", title: "Warehouse Coordinates carousel", channel: "Instagram", status: "Diseñado", owner: "Marketing", relation: "Warehouse Coordinates VA", cta: "Pre-save now", notes: "Slide 1 fuerte." },
    { id: "e5", date: "2026-06-18", category: "Academy", title: "Acid line breakdown 303", channel: "YouTube", status: "Idea", owner: "Veltra", relation: "CNT-007", cta: "Subscribe", notes: "Ableton rack." }
  ],
  social: [
    { id: "s1", platform: "Instagram", format: "Reel", hook: "El track que más divide al A&R", caption: "Basement Signal en revisión.", hashtags: "#techno #label", cta: "Envía tu demo", asset: "drive/reels/demo-review", date: "2026-05-22", status: "Scheduled", reach: 0, likes: 0, comments: 0, saves: 0, shares: 0, clicks: 0 },
    { id: "s2", platform: "TikTok", format: "Short", hook: "Una 303 puede cambiar todo", caption: "Acid Warehouse breakdown.", hashtags: "#acidtechno #303", cta: "Pre-save", asset: "drive/video/303", date: "2026-06-18", status: "Draft", reach: 0, likes: 0, comments: 0, saves: 0, shares: 0, clicks: 0 },
    { id: "s3", platform: "Instagram", format: "Carousel", hook: "Warehouse Coordinates VA", caption: "Tres cuts para pisos oscuros.", hashtags: "#hardgroove", cta: "Pre-save", asset: "drive/content/va", date: "2026-06-12", status: "Designed", reach: 0, likes: 0, comments: 0, saves: 0, shares: 0, clicks: 0 },
    { id: "s4", platform: "YouTube", format: "Short", hook: "Pre-master no es master", caption: "Diferencias en 40 segundos.", hashtags: "#mastering", cta: "Leer blog", asset: "", date: "", status: "Draft", reach: 0, likes: 0, comments: 0, saves: 0, shares: 0, clicks: 0 },
    { id: "s5", platform: "Instagram", format: "Story", hook: "North Terminal superó 60k streams", caption: "Gracias por el apoyo.", hashtags: "#deeptech", cta: "Escuchar", asset: "archive/north-story", date: "2026-05-14", status: "Published", reach: 8400, likes: 310, comments: 22, saves: 91, shares: 44, clicks: 390 },
    { id: "s6", platform: "Newsletter", format: "Post", hook: "10 grooves para warm up", caption: "Selección A&R mayo.", hashtags: "", cta: "Responder", asset: "", date: "2026-05-28", status: "Scheduled", reach: 0, likes: 0, comments: 0, saves: 0, shares: 0, clicks: 0 },
    { id: "s7", platform: "Instagram", format: "Live", hook: "Listening session abierta", caption: "Escuchamos demos en vivo.", hashtags: "#demodrop", cta: "Recordatorio", asset: "", date: "2026-05-30", status: "Scheduled", reach: 0, likes: 0, comments: 0, saves: 0, shares: 0, clicks: 0 },
    { id: "s8", platform: "SoundCloud", format: "Post", hook: "Private promo pack", caption: "DJ pool preview.", hashtags: "#djpromo", cta: "Request access", asset: "soundcloud/private/va", date: "2026-06-24", status: "Draft", reach: 0, likes: 0, comments: 0, saves: 0, shares: 0, clicks: 0 }
  ],
  content: [
    { id: "c1", code: "CNT-001", topic: "Cómo filtramos demos", pillar: "A&R", type: "Reel", objective: "Authority", status: "Script", owner: "A&R", targetDate: "2026-05-23", asset: "", notes: "Mostrar scoring real." },
    { id: "c2", code: "CNT-002", topic: "Warehouse Coordinates track by track", pillar: "Releases", type: "Carousel", objective: "Awareness", status: "Diseño", owner: "Marketing", targetDate: "2026-06-12", asset: "drive/content/va", notes: "Visual ácido." },
    { id: "c3", code: "CNT-003", topic: "Master final vs pre-master", pillar: "Mastering", type: "Blog", objective: "Education", status: "Idea", owner: "Reyesound", targetDate: "2026-06-03", asset: "", notes: "Evergreen." },
    { id: "c4", code: "CNT-004", topic: "Sofia Brix studio process", pillar: "Producción", type: "Short", objective: "Community", status: "Grabado", owner: "Sofia", targetDate: "2026-05-25", asset: "drive/video/sofia", notes: "Editar vertical." },
    { id: "c5", code: "CNT-005", topic: "Deep tech grooves para warm up", pillar: "Track Selection", type: "Newsletter", objective: "Community", status: "Programado", owner: "A&R", targetDate: "2026-05-28", asset: "", notes: "10 tracks." },
    { id: "c6", code: "CNT-006", topic: "Nocturnal artwork reveal", pillar: "Releases", type: "Story", objective: "Awareness", status: "Idea", owner: "Design", targetDate: "2026-05-31", asset: "", notes: "Bloqueado hasta artwork." },
    { id: "c7", code: "CNT-007", topic: "Acid line breakdown 303", pillar: "Producción", type: "YouTube Video", objective: "Education", status: "Editado", owner: "Veltra", targetDate: "2026-06-18", asset: "drive/video/303", notes: "Buen gancho técnico." },
    { id: "c8", code: "CNT-008", topic: "Feedback listening", pillar: "Comunidad", type: "Reel", objective: "Community", status: "Publicado", owner: "Community", targetDate: "2026-05-16", asset: "instagram/reel/feedback", notes: "Funcionó bien." }
  ],
  campaigns: [
    { id: "m1", name: "Nocturnal Systems Rollout", type: "Release Campaign", objective: "Lanzar EP de Mara Volt", start: "2026-05-25", end: "2026-06-21", budget: 650, channel: "Instagram", audience: "DJs deep tech EU", release: "Nocturnal Systems EP", status: "Planning", reach: 0, clicks: 0, conversions: 0 },
    { id: "m2", name: "Warehouse Coordinates VA", type: "Release Campaign", objective: "Pre-save y DJ promo", start: "2026-06-10", end: "2026-07-12", budget: 1200, channel: "Instagram", audience: "Hardgroove / acid techno", release: "Warehouse Coordinates VA", status: "Active", reach: 18200, clicks: 3200, conversions: 410 },
    { id: "m3", name: "Afterhour Bloom Pre-save", type: "Release Campaign", objective: "Activar single", start: "2026-05-20", end: "2026-06-02", budget: 500, channel: "TikTok", audience: "Hypnotic techno listeners", release: "Afterhour Bloom", status: "Paused", reach: 2400, clicks: 230, conversions: 21 },
    { id: "m4", name: "North Terminal Long Tail", type: "Playlist Growth", objective: "Sostener streams", start: "2026-04-20", end: "2026-06-20", budget: 900, channel: "Spotify", audience: "Deep tech playlists", release: "North Terminal", status: "Completed", reach: 64200, clicks: 9800, conversions: 740 }
  ],
  reports: [
    { id: "p1", period: "1-15 abril 2026", reviewed: 42, recommended: "Luma Grado, Kairo Unit", contacted: "5 artistas", tracking: "Warehouse Coordinates VA", problems: "Metadata incompleta.", next: "Cerrar contratos VA.", comments: "Buena entrada de hardgroove." },
    { id: "p2", period: "16-30 abril 2026", reviewed: 37, recommended: "Sofia Brix", contacted: "3 artistas", tracking: "Afterhour Bloom", problems: "Artwork tardío.", next: "Brief visual.", comments: "Sube calidad media." },
    { id: "p3", period: "1-15 mayo 2026", reviewed: 51, recommended: "Veltra, Nexa Vale", contacted: "6 artistas", tracking: "Nocturnal Systems EP", problems: "Masters pendientes.", next: "Priorizar junio.", comments: "Sonido más definido." }
  ]
};

export function DashboardApp() {
  const [entered, setEntered] = useState(false);
  const [login, setLogin] = useState({ email: "demo@labelos.com", password: "demo123" });
  const [data, setData] = useState<DemoState>(initialData);
  const [config, setConfig] = useState<WorkspaceConfig>(defaultConfig);
  const [active, setActive] = useState("master");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ table: string; row?: Row } | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const storedConfig = window.localStorage.getItem(configKey);
    if (stored) setData(JSON.parse(stored));
    if (storedConfig) setConfig(JSON.parse(storedConfig));
    setEntered(window.localStorage.getItem(`${storageKey}:entered`) === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    window.localStorage.setItem(configKey, JSON.stringify(config));
  }, [config]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  }

  function enterDemo(skipPassword = false) {
    if (!skipPassword && (login.email !== "demo@labelos.com" || login.password !== "demo123")) {
      notify("Credenciales demo incorrectas");
      return;
    }
    window.localStorage.setItem(`${storageKey}:entered`, "true");
    setEntered(true);
    notify("Bienvenido a la demo");
  }

  function save(table: string, values: Row) {
    const row = normalizeRow(table, values);
    setData(prev => ({
      ...prev,
      [table]: row.id ? prev[table].map(item => item.id === row.id ? row : item) : [{ ...row, id: `${table}-${Date.now()}` }, ...prev[table]]
    }));
    setModal(null);
    notify(row.id ? "Cambios guardados" : "Elemento creado correctamente");
  }

  function remove(table: string, id: string) {
    if (!confirm("¿Eliminar este elemento? Esta acción solo afecta tu navegador.")) return;
    setData(prev => ({ ...prev, [table]: prev[table].filter(item => item.id !== id) }));
    notify("Elemento eliminado correctamente");
  }

  function reset() {
    if (!confirm("¿Resetear toda la demo a los datos originales?")) return;
    setData(initialData);
    window.localStorage.setItem(storageKey, JSON.stringify(initialData));
    notify("Demo data reseteada");
  }

  function clearAll() {
    if (!confirm("¿Limpiar todos los datos guardados en este navegador?")) return;
    const empty = Object.fromEntries(Object.keys(initialData).map(key => [key, []])) as DemoState;
    setData(empty);
    notify("Datos limpiados");
  }

  function exportCSV(table?: string) {
    const rows = table ? data[table] : Object.entries(data).flatMap(([key, value]) => value.map(row => ({ module: key, ...row })));
    const csv = rows.length ? [Object.keys(rows[0]).join(","), ...rows.map(row => Object.values(row).map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))].join("\n") : "empty";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reyesound-demo-${table ?? "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("CSV simulado exportado");
  }

  const activeConfig = modules.find(([key]) => key === active)!;
  const table = activeConfig[2];
  const rows = table ? data[table].filter(row => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())) : [];
  const stats = useMemo(() => computeStats(data), [data]);
  const alerts = useMemo(() => computeAlerts(data), [data]);
  const activity = useMemo(() => recentActivity(data), [data]);

  if (!entered) {
    return <LoginDemo login={login} setLogin={setLogin} enterDemo={enterDemo} toast={toast} config={config} />;
  }

  return (
    <div
      className="relative flex min-h-screen overflow-hidden bg-[#060709]"
      style={{
        "--brand": config.primary,
        "--accent": config.accent
      } as CSSProperties}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 10%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 28%), radial-gradient(circle at 78% 18%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 30%), linear-gradient(180deg, rgba(255,255,255,.035), transparent 18%)"
        }}
      />
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-72 border-r border-white/10 bg-black/55 p-4 shadow-2xl backdrop-blur-2xl lg:block">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl font-black text-black" style={{ background: "var(--brand)", boxShadow: "0 0 40px color-mix(in srgb, var(--brand) 34%, transparent)" }}>{config.logo}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{config.labelName}</p>
              <p className="text-xs text-zinc-500">{config.workspaceName} · Public demo</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-white/10 bg-black/35 p-3 text-xs font-semibold text-zinc-300">
            <span className="text-[var(--brand)]">Demo mode:</span> los datos se guardan solo en este navegador.
          </p>
        </div>
        <nav className="mt-5 space-y-1">
          {modules.map(([key, label]) => {
            const meta = navMeta[key];
            return (
              <button key={key} onClick={() => setActive(key)} style={active === key ? { boxShadow: "0 0 30px color-mix(in srgb, var(--brand) 24%, transparent)" } : undefined} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition duration-200 ${active === key ? "bg-white text-black" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"}`}>
                <span className={`flex size-7 items-center justify-center rounded-lg text-xs transition ${active === key ? "bg-black text-[var(--brand)]" : "bg-white/[0.06] text-zinc-400 group-hover:text-[var(--brand)]"}`}>{meta.icon}</span>
                <span className="flex-1">{label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-45">{meta.group}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="relative z-10 w-full lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#060709]/75 px-4 py-4 backdrop-blur-2xl md:px-7">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Premium public demo · no backend</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{active === "master" ? `${config.labelName.toUpperCase()} · MASTER DASHBOARD` : activeConfig[1]}</h2>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <input className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[var(--brand)] focus:bg-black/40 md:w-72" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar en la demo..." />
              <button onClick={() => exportCSV(table || undefined)} className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-black transition hover:border-white/20 hover:bg-white/[0.08]">Exportar CSV</button>
              <button onClick={reset} className="rounded-xl px-3 py-2 text-sm font-black text-black transition hover:scale-[1.02]" style={{ background: "var(--brand)" }}>Reset demo data</button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {modules.map(([key, label]) => <button key={key} onClick={() => setActive(key)} style={active === key ? { background: "var(--brand)" } : undefined} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold ${active === key ? "text-black" : "bg-white/[0.045] text-zinc-300"}`}>{label}</button>)}
          </div>
          <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] p-2 text-xs font-bold text-[var(--brand)] lg:hidden">Demo mode: los datos se guardan solo en este navegador.</p>
        </header>

        <section className="p-4 md:p-7">
          {active === "master" && <Master stats={stats} alerts={alerts} data={data} activity={activity} config={config} />}
          {active === "settings" && <Settings reset={reset} clearAll={clearAll} exportCSV={() => exportCSV()} config={config} setConfig={setConfig} />}
          {active === "cleanup" && <Cleanup data={data} reset={reset} clearAll={clearAll} removeCategory={(key: string) => { if (confirm(`¿Eliminar todos los registros de ${key}?`)) { setData(prev => ({ ...prev, [key]: [] })); notify("Elemento eliminado correctamente"); } }} />}
          {table && <CrudModule table={table} rows={rows} onCreate={() => setModal({ table })} onEdit={(row: Row) => setModal({ table, row })} onDelete={(id: string) => remove(table, id)} exportCSV={() => exportCSV(table)} />}
        </section>
      </main>

      {modal && <CrudModal table={modal.table} row={modal.row} onClose={() => setModal(null)} onSave={(values: Row) => save(modal.table, values)} />}
      {toast && <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-acid/30 bg-zinc-950 px-4 py-3 text-sm font-bold text-acid shadow-glow">{toast}</div>}
    </div>
  );
}

function LoginDemo({ login, setLogin, enterDemo, toast, config }: { login: any; setLogin: (value: any) => void; enterDemo: (skip?: boolean) => void; toast: string; config: WorkspaceConfig }) {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{
        "--brand": config.primary,
        "--accent": config.accent
      } as CSSProperties}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--brand) 20%, transparent), transparent 30%), radial-gradient(circle at 80% 25%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 32%), linear-gradient(180deg, rgba(255,255,255,.04), transparent)"
        }}
      />
      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl font-black text-black" style={{ background: "var(--brand)", boxShadow: "0 0 50px color-mix(in srgb, var(--brand) 35%, transparent)" }}>{config.logo}</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--brand)]">{config.labelName}</p>
            <p className="text-sm text-zinc-500">{config.workspaceName} public demo</p>
          </div>
        </div>
        <h1 className="mt-7 text-4xl font-black tracking-tight">Demo premium para sellos modernos.</h1>
        <p className="mt-3 text-zinc-400">Prueba el sistema sin backend, sin configuración y sin cuenta real.</p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-3 text-sm text-zinc-300"><span className="font-black text-[var(--brand)]">Demo mode:</span> los datos se guardan solo en este navegador.</div>
        <div className="mt-6 space-y-3">
          <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Email demo</span><input className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none transition focus:border-[var(--brand)]" value={login.email} onChange={event => setLogin({ ...login, email: event.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Password demo</span><input className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none transition focus:border-[var(--brand)]" type="password" value={login.password} onChange={event => setLogin({ ...login, password: event.target.value })} /></label>
          <button onClick={() => enterDemo(false)} className="w-full rounded-xl px-4 py-3 font-black text-black transition hover:scale-[1.015]" style={{ background: "var(--brand)" }}>Entrar con demo@labelos.com</button>
          <button onClick={() => enterDemo(true)} className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 font-black transition hover:bg-white/[0.08]">Entrar a la demo sin contraseña</button>
        </div>
        <p className="mt-4 text-xs text-zinc-500">Credenciales: demo@labelos.com / demo123</p>
      </section>
      {toast && <div className="fixed bottom-5 right-5 rounded-xl border border-red-400/30 bg-red-950 px-4 py-3 text-sm font-bold text-red-100">{toast}</div>}
    </main>
  );
}

function Master({ stats, alerts, data, activity, config }: { stats: Record<string, any>; alerts: string[]; data: DemoState; activity: string[]; config: WorkspaceConfig }) {
  const cards = [
    ["Total Demos", stats.demos, "+18%", "A&R Inbox"], ["Tracks Aprobados", stats.approved, "+6", "Fit alto"], ["Releases Activos", stats.activeReleases, "4 lanes", "Pipeline"],
    ["Revenue Total", money(stats.revenue), "+12.4%", "DSPs"], ["Royalties Pendientes", money(stats.pendingRoyalties), "3 items", "Finance"], ["Forecast 90 días", money(stats.forecast), "+24%", "Projected"]
  ];
  const revenueBars = data.revenue.map(row => Number(row.gross || 0)).slice(0, 8);
  const campaignBars = data.campaigns.map(row => Number(row.clicks || 0)).slice(0, 8);
  const spotify = data.revenue.filter(row => row.platform === "Spotify").reduce((sum, row) => sum + Number(row.gross || 0), 0);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[var(--brand)]">
              <span className="size-2 rounded-full bg-[var(--brand)] shadow-[0_0_18px_var(--brand)]" /> Label command center
            </div>
            <h3 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">{config.labelName.toUpperCase()} · MASTER DASHBOARD</h3>
            <p className="mt-4 max-w-2xl text-zinc-400">Vista ejecutiva para A&R, releases, marketing y royalties. Una demo con sensación de producto real para tecnología musical.</p>
          </div>
          <div className="grid min-w-72 grid-cols-2 gap-3">
            <MiniMetric label="Spotify analytics" value={money(spotify)} caption="Attributed revenue" />
            <MiniMetric label="Campaign health" value="82%" caption="Performance score" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, delta, caption]) => <Stat key={label} label={label} value={value} delta={delta} caption={caption} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Panel title="Revenue velocity" action={<Badge>Fake chart</Badge>}>
          <FakeChart values={revenueBars} />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniMetric label="Spotify" value={money(spotify)} caption="+9.8% vs last period" />
            <MiniMetric label="Beatport" value={money(1320)} caption="Peak label channel" />
            <MiniMetric label="Forecast" value={money(stats.forecast)} caption="Next 90 days" />
          </div>
        </Panel>
        <Panel title="Recent activity">
          <div className="space-y-3">{activity.map(item => <ActivityItem key={item} text={item} />)}</div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Campaign performance" action={<Badge>Live demo</Badge>}>
          <FakeChart values={campaignBars} tone="accent" />
          <div className="mt-5 space-y-3">
            {data.campaigns.map(campaign => <ProgressLine key={campaign.id} label={campaign.name} value={Math.min(100, Math.round(Number(campaign.clicks || 0) / 100))} />)}
          </div>
        </Panel>
        <Panel title="Alert intelligence">
          {alerts.length ? <div className="grid gap-2">{alerts.slice(0, 8).map(alert => <div key={alert} className="group flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-3 text-sm transition hover:border-white/20 hover:bg-white/[0.04]"><span>{alert}</span><Badge tone="danger">Check</Badge></div>)}</div> : <Empty text="Sin alertas críticas." />}
        </Panel>
      </div>
    </div>
  );
}

function CrudModule({ table, rows, onCreate, onEdit, onDelete, exportCSV }: CrudModuleProps) {
  const showFields = (fields[table] ?? []).slice(0, 5);
  return (
    <Panel title={modules.find((m) => m[2] === table)?.[1] ?? table} action={<div className="flex gap-2"><button onClick={exportCSV} className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-bold transition hover:bg-white/[0.08]">Exportar CSV</button><button onClick={onCreate} className="rounded-xl px-4 py-2 text-sm font-black text-black transition hover:scale-[1.02]" style={{ background: "var(--brand)" }}>Nuevo</button></div>}>
      {rows.length ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/[0.035] text-xs uppercase tracking-wide text-zinc-500">
                <tr>{showFields.map(field => <th key={field.key} className="px-4 py-3 pr-3">{field.label}</th>)}<th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr>
              </thead>
              <tbody>
                {rows.map((row: Row) => (
                  <tr key={row.id} className="border-t border-white/10 transition hover:bg-white/[0.035]">
                    {showFields.map((field, index) => <td key={field.key} className={`px-4 py-4 ${index === 0 ? "font-bold text-white" : "text-zinc-300"}`}>{format(row[field.key])}</td>)}
                    <td className="px-4 py-4"><Badge>{row.status ?? row.fit ?? "Ready"}</Badge></td>
                    <td className="space-x-2 px-4 py-4"><button onClick={() => onEdit(row)} className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 font-bold transition hover:bg-white/[0.08]">Editar</button><button onClick={() => onDelete(row.id)} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 font-bold text-red-100 transition hover:bg-red-500/20">Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <Empty text="No hay datos. Crea el primer elemento." />}
    </Panel>
  );
}

function CrudModal({ table, row, onClose, onSave }: CrudModalProps) {
  const [values, setValues] = useState<Row>(row ?? {});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form onSubmit={(event) => { event.preventDefault(); onSave(values); }} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0D1014]/95 p-5 shadow-2xl backdrop-blur-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-black">{row ? "Editar" : "Crear"} {modules.find((m) => m[2] === table)?.[1]}</h3>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 font-bold transition hover:bg-white/[0.06]">Cancelar</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(fields[table] ?? []).map(field => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{field.label}</span>
              {field.type === "textarea" ? <textarea className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none transition focus:border-[var(--brand)]" rows={3} value={values[field.key] ?? ""} onChange={event => setValues({ ...values, [field.key]: event.target.value })} /> : field.options ? <select className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none transition focus:border-[var(--brand)]" value={values[field.key] ?? field.options[0]} onChange={event => setValues({ ...values, [field.key]: event.target.value })}>{field.options.map(option => <option key={option}>{option}</option>)}</select> : <input className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none transition focus:border-[var(--brand)]" type={field.type ?? "text"} value={values[field.key] ?? ""} onChange={event => setValues({ ...values, [field.key]: event.target.value })} />}
            </label>
          ))}
        </div>
        <button className="mt-5 w-full rounded-xl px-4 py-3 font-black text-black transition hover:scale-[1.01]" style={{ background: "var(--brand)" }}>Guardar</button>
      </form>
    </div>
  );
}

function Cleanup({ data, reset, clearAll, removeCategory }: CleanupProps) {
  return <div className="space-y-5"><Panel title="Data Cleanup" action={<div className="flex gap-2"><button onClick={reset} className="rounded-xl px-3 py-2 text-sm font-black text-black" style={{ background: "var(--brand)" }}>Reset demo data</button><button onClick={clearAll} className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">Limpiar datos</button></div>}><div className="grid gap-3 md:grid-cols-3">{(Object.entries(data) as [string, Row[]][]).map(([key, value]: [string, Row[]]) => <div key={key} className="rounded-3xl border border-white/10 bg-black/25 p-4 transition hover:bg-white/[0.035]"><div className="flex items-center justify-between"><h3 className="font-black capitalize">{key}</h3><Badge>{value.length}</Badge></div><p className="mt-2 text-sm text-zinc-500">Registros guardados localmente</p><button onClick={() => removeCategory(key)} className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-bold text-red-100 transition hover:bg-red-500/20">Eliminar categoría</button></div>)}</div></Panel></div>;
}

function Settings({ reset, clearAll, exportCSV, config, setConfig }: SettingsProps) {
  const control = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none transition focus:border-[var(--brand)]";
  return (
    <div className="space-y-5">
      <Panel title="Brand workspace" action={<Badge>Editable</Badge>}>
        <div className="grid gap-4 md:grid-cols-[.8fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center rounded-2xl text-xl font-black text-black" style={{ background: config.primary }}>{config.logo}</div>
              <div>
                <p className="text-2xl font-black">{config.labelName}</p>
                <p className="text-sm text-zinc-500">{config.workspaceName}</p>
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full" style={{ background: config.primary }} /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Nombre del sello</span><input className={control} value={config.labelName} onChange={(e) => setConfig({ ...config, labelName: e.target.value })} /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Workspace</span><input className={control} value={config.workspaceName} onChange={(e) => setConfig({ ...config, workspaceName: e.target.value })} /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Logo texto</span><input className={control} value={config.logo} maxLength={4} onChange={(e) => setConfig({ ...config, logo: e.target.value })} /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Color principal</span><input className={`${control} h-11`} type="color" value={config.primary} onChange={(e) => setConfig({ ...config, primary: e.target.value })} /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Color acento</span><input className={`${control} h-11`} type="color" value={config.accent} onChange={(e) => setConfig({ ...config, accent: e.target.value })} /></label>
          </div>
        </div>
      </Panel>
      <Panel title="Demo controls">
        <div className="grid gap-4 md:grid-cols-3"><Stat label="Modo" value="Demo pública" /><Stat label="Persistencia" value="localStorage" /><Stat label="Backend" value="No requerido" /></div>
        <div className="mt-5 flex flex-wrap gap-2"><button onClick={reset} className="rounded-xl px-4 py-2 font-black text-black" style={{ background: "var(--brand)" }}>Reset demo data</button><button onClick={clearAll} className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 font-bold text-red-100">Limpiar datos</button><button onClick={exportCSV} className="rounded-xl border border-white/10 bg-white/[0.045] px-4 py-2 font-bold">Exportar CSV simulado</button></div>
        <p className="mt-4 text-sm text-zinc-400">Esta demo está pensada para Vercel o Netlify sin variables de entorno, Supabase, Stripe ni base de datos externa.</p>
      </Panel>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-2xl transition duration-300 hover:border-white/15"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h3 className="text-lg font-black tracking-tight">{title}</h3>{action}</div>{children}</section>;
}

function Stat({ label, value, delta, caption }: { label: string; value: ReactNode; delta?: ReactNode; caption?: ReactNode }) {
  return <div className="group rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"><div className="flex items-start justify-between gap-3"><p className="text-sm text-zinc-500">{label}</p>{delta && <Badge>{delta}</Badge>}</div><p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>{caption && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{caption}</p>}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-10 text-center text-sm text-zinc-400"><div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] text-xl">✦</div>{text}</div>;
}

function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "danger" }) {
  const cls = tone === "danger"
    ? "border-red-400/25 bg-red-500/10 text-red-100 shadow-[0_0_20px_rgba(248,113,113,.12)]"
    : "border-white/10 text-[var(--brand)]";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${cls}`} style={tone === "default" ? { background: "color-mix(in srgb, var(--brand) 14%, transparent)", boxShadow: "0 0 20px color-mix(in srgb, var(--brand) 14%, transparent)" } : undefined}>{children}</span>;
}

function MiniMetric({ label, value, caption }: { label: string; value: ReactNode; caption: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-zinc-500">{caption}</p></div>;
}

function FakeChart({ values, tone = "brand" }: { values: number[]; tone?: "brand" | "accent" }) {
  const max = Math.max(...values, 1);
  const color = tone === "brand" ? "var(--brand)" : "var(--accent)";
  return (
    <div className="flex h-64 items-end gap-2 rounded-3xl border border-white/10 bg-black/25 p-4">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="group flex flex-1 items-end">
          <div
            className="w-full rounded-t-xl opacity-80 transition duration-300 group-hover:opacity-100"
            style={{
              height: `${Math.max(10, (value / max) * 100)}%`,
              background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 22%, transparent))`
            }}
          />
        </div>
      ))}
    </div>
  );
}

function ProgressLine({ label, value }: { label: string; value: number }) {
  return <div><div className="mb-1 flex justify-between text-sm"><span className="font-bold">{label}</span><span className="text-zinc-500">{value}%</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${value}%`, boxShadow: "0 0 18px color-mix(in srgb, var(--brand) 24%, transparent)" }} /></div></div>;
}

function ActivityItem({ text }: { text: string }) {
  return <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 transition hover:bg-white/[0.04]"><span className="mt-1 size-2 rounded-full bg-[var(--brand)] shadow-[0_0_14px_var(--brand)]" /><div><p className="text-sm font-semibold">{text}</p><p className="mt-1 text-xs text-zinc-500">Updated just now · demo data</p></div></div>;
}

function computeStats(data: DemoState) {
  const revenue = data.revenue.reduce((sum, row) => sum + Number(row.gross || 0), 0);
  const pendingRoyalties = data.revenue.filter(row => row.status !== "Paid").reduce((sum, row) => sum + (Number(row.gross || 0) - Number(row.expenses || 0)) * (Number(row.artistPct || 0) + Number(row.collabPct || 0)) / 100, 0);
  return {
    demos: data.demos.length,
    approved: data.demos.filter(row => row.status === "Aprobado").length,
    activeReleases: data.releases.filter(row => !["Publicado", "Archivado"].includes(row.status)).length,
    published: data.releases.filter(row => row.status === "Publicado").length,
    artists: data.artists.filter(row => row.status === "Activo").length,
    revenue,
    pendingRoyalties,
    campaigns: data.campaigns.filter(row => row.status === "Active").length,
    contents: data.content.filter(row => row.status !== "Publicado").length,
    posts: data.social.filter(row => row.status === "Scheduled").length,
    forecast: revenue * 0.72
  };
}

function recentActivity(data: DemoState) {
  return [
    `${data.demos[1]?.track ?? "Demo"} moved to approved in A&R Inbox`,
    `${data.releases[1]?.title ?? "Release"} campaign performance synced`,
    `${data.social[4]?.hook ?? "Social post"} published on Instagram`,
    `${data.revenue[0]?.release ?? "Release"} revenue report imported`,
    `${data.content[0]?.topic ?? "Content"} updated in Content Master`
  ];
}

function computeAlerts(data: DemoState) {
  const alerts: string[] = [];
  data.releases.forEach(row => {
    if (row.contract !== "Sí" && row.status !== "Idea") alerts.push(`${row.title}: release sin contrato firmado`);
    if (row.master !== "Sí" && row.status !== "Idea") alerts.push(`${row.title}: release sin master`);
    if (row.artwork !== "Sí") alerts.push(`${row.title}: release sin artwork`);
    if (row.campaign === "No iniciada") alerts.push(`${row.title}: release sin campaña`);
  });
  data.revenue.filter(row => row.status !== "Paid").forEach(row => alerts.push(`${row.release}: royalties pendientes`));
  data.social.filter(row => !row.date).forEach(row => alerts.push(`${row.hook}: post sin fecha`));
  data.demos.filter(row => row.status === "Aprobado").forEach(row => {
    if (!data.releases.some(release => release.title === row.track || release.artist === row.artist)) alerts.push(`${row.track}: track aprobado sin release`);
  });
  return alerts.slice(0, 14);
}

function normalizeRow(table: string, row: Row) {
  const normalized = { ...row };
  (fields[table] ?? []).forEach(field => {
    if (field.type === "number") normalized[field.key] = Number(normalized[field.key] || 0);
  });
  return normalized;
}

function format(value: any) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })}€`;
}
