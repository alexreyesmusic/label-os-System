"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { modules } from "@/lib/modules";

type SeedRow = Record<string, string | number | boolean | null>;

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      label_name: String(formData.get("label_name") ?? ""),
      country: String(formData.get("country") ?? "") || null,
      currency: String(formData.get("currency") ?? "EUR"),
      main_genre: String(formData.get("main_genre") ?? "") || null,
      brand_color: String(formData.get("brand_color") ?? "#B6FF1A")
    })
    .select("*")
    .single();

  if (workspaceError || !workspace) redirect(`/onboarding?error=${encodeURIComponent(workspaceError?.message ?? "Could not create workspace")}`);

  await supabase.from("profiles").upsert({
    id: authData.user.id,
    email: authData.user.email,
    full_name: String(formData.get("owner_name") ?? authData.user.user_metadata?.full_name ?? authData.user.email ?? "")
  });

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: authData.user.id,
    role: "owner"
  });

  if (memberError) redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);

  if (formData.get("load_sample_data") === "on") {
    await seedSampleData(supabase, workspace.id, authData.user.id);
  }

  redirect("/dashboard");
}

async function seedSampleData(supabase: Awaited<ReturnType<typeof createClient>>, workspaceId: string, userId: string) {
  const samples: Record<string, SeedRow[]> = {
    artists: [
      { name: "Miro Delta", country: "Spain", email: "miro@example.com", instagram: "@mirodelta", soundcloud: "https://soundcloud.com", status: "Active", notes: "Signature groove." },
      { name: "Nora Vela", country: "Mexico", email: "nora@example.com", instagram: "@noravela", soundcloud: "https://soundcloud.com", status: "Negotiating", notes: "Great demo pipeline." }
    ],
    demos: [
      { artist_name: "Nora Vela", track_title: "Sub Basement Signal", genre: "Deep Tech", bpm: 126, musical_key: "Fmin", mood: "Hypnotic", energy: "High", status: "Pending", ar_score: 8, label_fit: "High", decision: "Maybe", soundcloud_link: "https://soundcloud.com", internal_comments: "Strong low-end identity." },
      { artist_name: "Miro Delta", track_title: "Warehouse Bloom", genre: "Minimal House", bpm: 124, musical_key: "Amin", mood: "Warm", energy: "Medium", status: "Approved", ar_score: 9, label_fit: "Perfect", decision: "Yes" }
    ],
    tracks: [
      { artist_name: "Miro Delta", track_title: "Warehouse Bloom", bpm: 124, musical_key: "Amin", genre: "Minimal House", mood: "Warm", energy: "Medium", status: "Approved", ar_score: 9, label_fit: "Perfect", decision: "Yes", contract_status: "Sent", master_status: "Premaster", notes: "Ready for final master." }
    ],
    releases: [
      { title: "Warehouse Bloom", artist_name: "Miro Delta", release_type: "Single", status: "Master Approved", release_date: "2026-06-21", distribution_date: "2026-06-01", tracks_included: "Warehouse Bloom", contract_status: "Signed", master_status: "Approved", artwork_status: "Approved", metadata_status: "Complete", campaign_status: "Active", isrc: "ES-LO6-26-00001", upc: "198765432101", notes: "Lead single." }
    ],
    revenue_records: [
      { release_title: "Warehouse Bloom", artist_name: "Miro Delta", platform: "Beatport", gross_revenue: 1340, expenses: 180, status: "Paid", payment_date: "2026-05-10", notes: "Launch week." }
    ],
    campaigns: [
      { name: "Warehouse Bloom Launch", type: "Release Campaign", objective: "Drive Beatport sales and saves", start_date: "2026-05-20", end_date: "2026-06-25", budget: 450, primary_channel: "Instagram", audience: "Deep tech DJs", release_title: "Warehouse Bloom", status: "Active", reach: 22000, clicks: 920, conversions: 84 }
    ],
    content_items: [
      { content_code: "CNT-001", topic: "How we select deep tech demos", pillar: "A&R", type: "Carousel", objective: "Authority", status: "Design", owner_name: "A&R", target_date: "2026-05-25", notes: "Use demo criteria." }
    ],
    social_posts: [
      { platform: "Instagram", format: "Reel", hook: "This bassline was built for basements", caption: "Warehouse Bloom incoming.", hashtags: "#deeptech #housemusic", cta: "Pre-save now", publish_date: "2026-06-01", status: "Scheduled", reach: 12000, likes: 820, comments: 64, saves: 140, shares: 51, clicks: 220 }
    ],
    editorial_calendar_items: [
      { date: "2026-06-01", category: "Release", title: "Warehouse Bloom pre-save", channel: "Instagram", status: "Scheduled", owner_name: "Marketing", cta: "Pre-save" }
    ],
    ar_reports: [
      { period: "May 1-15", demos_reviewed: 42, tracks_recommended: "Warehouse Bloom, Sub Basement Signal", artists_contacted: "Miro Delta, Nora Vela", releases_tracking: "Warehouse Bloom", problems_detected: "Two contracts pending", next_actions: "Follow up masters", general_comments: "Strong month." }
    ],
    distribution_records: [
      { release_title: "Warehouse Bloom", distributor: "Label Engine", upload_date: "2026-05-18", approval_date: "2026-05-20", dsps_active: 34, status: "Approved", notes: "Beatport genre confirmed." }
    ]
  };

  for (const module of modules) {
    const rows = samples[module.table] ?? [];
    if (rows.length) {
      await supabase.from(module.table).insert(rows.map(row => ({ ...row, workspace_id: workspaceId, created_by: userId })));
    }
  }
}
