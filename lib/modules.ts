export type Role = "owner" | "admin" | "ar" | "marketing" | "finance" | "viewer";
export type FieldType = "text" | "number" | "date" | "textarea" | "select" | "file" | "url" | "boolean";

export type FieldConfig = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  bucket?: "covers" | "audio" | "documents" | "promo-assets";
};

export type ModuleConfig = {
  key: string;
  label: string;
  table: string;
  icon: string;
  allowed: Role[];
  fields: FieldConfig[];
};

const allRoles: Role[] = ["owner", "admin", "ar", "marketing", "finance", "viewer"];
const arRoles: Role[] = ["owner", "admin", "ar"];
const marketingRoles: Role[] = ["owner", "admin", "marketing"];
const financeRoles: Role[] = ["owner", "admin", "finance"];

export const modules: ModuleConfig[] = [
  {
    key: "demos",
    label: "Demos",
    table: "demos",
    icon: "♪",
    allowed: arRoles,
    fields: [
      { key: "artist_name", label: "Artist" },
      { key: "track_title", label: "Track title" },
      { key: "genre", label: "Genre" },
      { key: "bpm", label: "BPM", type: "number" },
      { key: "musical_key", label: "Key" },
      { key: "mood", label: "Mood" },
      { key: "energy", label: "Energy", type: "select", options: ["Low", "Medium", "High", "Peak"] },
      { key: "status", label: "Status", type: "select", options: ["Pending", "In Review", "Approved", "Rejected", "Needs Changes"] },
      { key: "ar_score", label: "A&R Score", type: "number" },
      { key: "label_fit", label: "Label Fit", type: "select", options: ["Low", "Medium", "High", "Perfect"] },
      { key: "decision", label: "Decision", type: "select", options: ["Yes", "No", "Maybe"] },
      { key: "assigned_release", label: "Assigned Release" },
      { key: "soundcloud_link", label: "SoundCloud Private Link", type: "url" },
      { key: "drive_link", label: "Drive Link", type: "url" },
      { key: "cover_url", label: "Cover Image", type: "file", bucket: "covers" },
      { key: "audio_file_url", label: "Audio Upload", type: "file", bucket: "audio" },
      { key: "internal_comments", label: "Internal Comments", type: "textarea" }
    ]
  },
  {
    key: "tracks",
    label: "Tracks",
    table: "tracks",
    icon: "◍",
    allowed: arRoles,
    fields: [
      { key: "artist_name", label: "Artist" },
      { key: "track_title", label: "Track title" },
      { key: "bpm", label: "BPM", type: "number" },
      { key: "musical_key", label: "Key" },
      { key: "genre", label: "Genre" },
      { key: "mood", label: "Mood" },
      { key: "energy", label: "Energy", type: "select", options: ["Low", "Medium", "High", "Peak"] },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Approved", "Rejected", "Needs Changes", "Signed"] },
      { key: "ar_score", label: "A&R Score", type: "number" },
      { key: "label_fit", label: "Label Fit", type: "select", options: ["Low", "Medium", "High", "Perfect"] },
      { key: "decision", label: "Decision", type: "select", options: ["Yes", "No", "Maybe"] },
      { key: "assigned_release", label: "Assigned Release" },
      { key: "soundcloud_link", label: "SoundCloud Private Link", type: "url" },
      { key: "drive_link", label: "Drive Link", type: "url" },
      { key: "audio_file_url", label: "Audio File URL", type: "file", bucket: "audio" },
      { key: "premaster_file_url", label: "Premaster File", type: "file", bucket: "audio" },
      { key: "master_file_url", label: "Master File", type: "file", bucket: "audio" },
      { key: "stems_folder_link", label: "Stems Folder Link", type: "url" },
      { key: "artwork_link", label: "Artwork Link", type: "file", bucket: "covers" },
      { key: "contract_file_url", label: "Contract / Document", type: "file", bucket: "documents" },
      { key: "contract_status", label: "Contract Status", type: "select", options: ["Pending", "Sent", "Signed"] },
      { key: "master_status", label: "Master Status", type: "select", options: ["Pending", "Premaster", "Approved"] },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  {
    key: "artists",
    label: "Artists",
    table: "artists",
    icon: "◎",
    allowed: arRoles,
    fields: [
      { key: "name", label: "Artist name" },
      { key: "country", label: "Country" },
      { key: "email", label: "Email" },
      { key: "instagram", label: "Instagram" },
      { key: "soundcloud", label: "SoundCloud" },
      { key: "photo_url", label: "Artist Photo", type: "file", bucket: "covers" },
      { key: "status", label: "Status", type: "select", options: ["New", "Active", "Negotiating", "Archived"] },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  {
    key: "releases",
    label: "Releases",
    table: "releases",
    icon: "◈",
    allowed: arRoles,
    fields: [
      { key: "title", label: "Title" },
      { key: "artist_name", label: "Artist" },
      { key: "cover_url", label: "Cover Artwork", type: "file", bucket: "covers" },
      { key: "release_type", label: "Release Type", type: "select", options: ["Single", "EP", "Album", "Compilation"] },
      { key: "status", label: "Status", type: "select", options: ["Idea", "Approved", "Contract Pending", "Premaster Received", "Master Approved", "Artwork Ready", "Uploaded", "Campaign Active", "Published", "Archived"] },
      { key: "release_date", label: "Release Date", type: "date" },
      { key: "distribution_date", label: "Distribution Date", type: "date" },
      { key: "tracks_included", label: "Tracks Included", type: "textarea" },
      { key: "contract_status", label: "Contract Status", type: "select", options: ["Pending", "Sent", "Signed"] },
      { key: "master_status", label: "Master Status", type: "select", options: ["Pending", "Received", "Approved"] },
      { key: "artwork_status", label: "Artwork Status", type: "select", options: ["Missing", "Uploaded", "Approved"] },
      { key: "metadata_status", label: "Metadata Status", type: "select", options: ["Incomplete", "Complete"] },
      { key: "campaign_status", label: "Campaign Status", type: "select", options: ["Not Started", "Active", "Completed"] },
      { key: "isrc", label: "ISRC" },
      { key: "upc", label: "UPC" },
      { key: "label_copy", label: "Label Copy", type: "textarea" },
      { key: "credits", label: "Credits", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  {
    key: "revenue",
    label: "Revenue System",
    table: "revenue_records",
    icon: "€",
    allowed: financeRoles,
    fields: [
      { key: "release_title", label: "Release" },
      { key: "artist_name", label: "Artist" },
      { key: "platform", label: "Platform", type: "select", options: ["Spotify", "Beatport", "Apple Music", "SoundCloud", "YouTube", "Bandcamp", "Other"] },
      { key: "gross_revenue", label: "Gross Revenue", type: "number" },
      { key: "expenses", label: "Expenses", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Pending", "Paid", "Partially Paid"] },
      { key: "payment_date", label: "Payment Date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  {
    key: "royalties",
    label: "Royalties & Splits",
    table: "royalty_splits",
    icon: "٪",
    allowed: financeRoles,
    fields: [
      { key: "release_title", label: "Release" },
      { key: "participant_name", label: "Participant" },
      { key: "participant_type", label: "Type", type: "select", options: ["Label", "Artist", "Collaborator", "Remixer"] },
      { key: "percentage", label: "Percentage", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Pending", "Paid", "Disputed"] },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  {
    key: "editorial",
    label: "Editorial Calendar",
    table: "editorial_calendar",
    icon: "□",
    allowed: marketingRoles,
    fields: [
      { key: "date", label: "Date", type: "date" },
      { key: "category", label: "Category", type: "select", options: ["Release", "Track Selection", "Session", "Academy", "Blog", "Artist Promo", "Behind the Scenes", "Community", "Event"] },
      { key: "title", label: "Title" },
      { key: "channel", label: "Channel", type: "select", options: ["Instagram", "YouTube", "SoundCloud", "Spotify", "Blog", "Newsletter", "TikTok"] },
      { key: "status", label: "Status", type: "select", options: ["Idea", "In Production", "Designed", "Scheduled", "Published"] },
      { key: "owner_name", label: "Owner" },
      { key: "cta", label: "CTA" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  {
    key: "social",
    label: "Social Media",
    table: "social_posts",
    icon: "↗",
    allowed: marketingRoles,
    fields: [
      { key: "platform", label: "Platform" },
      { key: "format", label: "Format", type: "select", options: ["Reel", "Story", "Carousel", "Post", "Short", "Live"] },
      { key: "hook", label: "Hook" },
      { key: "caption", label: "Caption", type: "textarea" },
      { key: "hashtags", label: "Hashtags" },
      { key: "cta", label: "CTA" },
      { key: "asset_url", label: "Preview Asset", type: "file", bucket: "promo-assets" },
      { key: "publish_date", label: "Publish Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Designed", "Scheduled", "Published"] },
      { key: "reach", label: "Reach", type: "number" },
      { key: "likes", label: "Likes", type: "number" },
      { key: "comments", label: "Comments", type: "number" },
      { key: "saves", label: "Saves", type: "number" },
      { key: "shares", label: "Shares", type: "number" },
      { key: "clicks", label: "Clicks", type: "number" }
    ]
  },
  {
    key: "content",
    label: "Content Master",
    table: "content_items",
    icon: "✦",
    allowed: marketingRoles,
    fields: [
      { key: "content_code", label: "Content ID" },
      { key: "topic", label: "Topic" },
      { key: "pillar", label: "Pillar", type: "select", options: ["A&R", "Production", "Mixing", "Mastering", "Distribution", "Electronic Culture", "Track Selection", "Releases", "Events", "Community"] },
      { key: "type", label: "Type", type: "select", options: ["Reel", "Blog", "Carousel", "Story", "Newsletter", "YouTube Video", "Short"] },
      { key: "objective", label: "Objective", type: "select", options: ["Awareness", "Education", "Conversion", "Community", "Authority"] },
      { key: "status", label: "Status", type: "select", options: ["Idea", "Script", "Design", "Recorded", "Edited", "Scheduled", "Published"] },
      { key: "owner_name", label: "Owner" },
      { key: "target_date", label: "Target Date", type: "date" },
      { key: "asset_url", label: "Visual Asset", type: "file", bucket: "promo-assets" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  {
    key: "campaigns",
    label: "Campaign DB",
    table: "campaigns",
    icon: "◌",
    allowed: marketingRoles,
    fields: [
      { key: "name", label: "Campaign" },
      { key: "type", label: "Type", type: "select", options: ["Release Campaign", "Demo Submission Campaign", "Brand Awareness", "Event Campaign", "Academy Campaign", "Playlist Growth", "Website Traffic"] },
      { key: "objective", label: "Objective", type: "textarea" },
      { key: "start_date", label: "Start", type: "date" },
      { key: "end_date", label: "End", type: "date" },
      { key: "budget", label: "Budget", type: "number" },
      { key: "primary_channel", label: "Primary Channel" },
      { key: "audience", label: "Audience" },
      { key: "release_title", label: "Related Release" },
      { key: "image_url", label: "Main Image", type: "file", bucket: "promo-assets" },
      { key: "status", label: "Status", type: "select", options: ["Planning", "Active", "Paused", "Completed"] },
      { key: "reach", label: "Reach", type: "number" },
      { key: "clicks", label: "Clicks", type: "number" },
      { key: "conversions", label: "Conversions", type: "number" }
    ]
  },
  {
    key: "reports",
    label: "A&R Reports",
    table: "ar_reports",
    icon: "▣",
    allowed: arRoles,
    fields: [
      { key: "period", label: "Period" },
      { key: "demos_reviewed", label: "Demos Reviewed", type: "number" },
      { key: "tracks_recommended", label: "Tracks Recommended" },
      { key: "artists_contacted", label: "Artists Contacted" },
      { key: "releases_tracking", label: "Releases Tracking" },
      { key: "problems_detected", label: "Problems", type: "textarea" },
      { key: "next_actions", label: "Next Actions", type: "textarea" },
      { key: "general_comments", label: "Comments", type: "textarea" }
    ]
  },
  {
    key: "distribution",
    label: "Distribution",
    table: "distribution_records",
    icon: "⇄",
    allowed: allRoles,
    fields: [
      { key: "release_title", label: "Release" },
      { key: "distributor", label: "Distributor" },
      { key: "upload_date", label: "Upload Date", type: "date" },
      { key: "approval_date", label: "Approval Date", type: "date" },
      { key: "dsps_active", label: "DSPs Active", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Published"] },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  }
];

export function canWrite(role: Role, module: ModuleConfig) {
  return role !== "viewer" && module.allowed.includes(role);
}
