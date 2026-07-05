export type TemplateId = string;

export type TemplateCategory =
  | "modern"
  | "minimal"
  | "luxury"
  | "elegant"
  | "dark"
  | "floral"
  | "retro"
  | "corporate"
  | "neon"
  | "cultural"
  | "kids"
  | "party";

export interface TemplateCategoryDef {
  id: TemplateCategory;
  label: string;
  emoji: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategoryDef[] = [
  { id: "modern", label: "Modern", emoji: "▲" },
  { id: "minimal", label: "Minimal", emoji: "○" },
  { id: "luxury", label: "Luxury", emoji: "♛" },
  { id: "elegant", label: "Elegant", emoji: "✦" },
  { id: "dark", label: "Dark", emoji: "◐" },
  { id: "floral", label: "Floral", emoji: "❀" },
  { id: "retro", label: "Retro", emoji: "✺" },
  { id: "corporate", label: "Corporate", emoji: "◇" },
  { id: "neon", label: "Neon", emoji: "✦" },
  { id: "cultural", label: "Cultural", emoji: "❁" },
  { id: "kids", label: "Kids", emoji: "★" },
  { id: "party", label: "Party", emoji: "♪" },
];

export interface InvitationTemplate {
  id: TemplateId;
  name: string;
  tagline: string;
  category: TemplateCategory;
  bg: readonly [string, string, ...string[]];
  ink: string;
  accent: string;
  subInk: string;
  hair: string;
  serif: boolean;
  ornament: "ribbon" | "floral" | "lines" | "monogram";
}

// 50+ curated invitation templates spanning twelve aesthetic categories.
export const TEMPLATES: InvitationTemplate[] = [
  // Luxury
  { id: "noir", name: "Noir Luxe", tagline: "Black tie energy", category: "luxury",
    bg: ["#0A0A0B", "#1A0410", "#3D0A24"] as const,
    ink: "#FFF8F0", subInk: "#D9B879", accent: "#F4C97B", hair: "rgba(244,201,123,0.4)", serif: true, ornament: "monogram" },
  { id: "champagne", name: "Champagne Toast", tagline: "Pop, fizz, clink", category: "luxury",
    bg: ["#1B1308", "#3A2916", "#7A5A2E"] as const,
    ink: "#FFF8F0", subInk: "#F4C97B", accent: "#F4C97B", hair: "rgba(244,201,123,0.45)", serif: true, ornament: "monogram" },
  { id: "velvet", name: "Velvet Royale", tagline: "Plum opulence", category: "luxury",
    bg: ["#1F0A2E", "#3A0F4F", "#6B1773"] as const,
    ink: "#FFF8F0", subInk: "#E8C8F5", accent: "#F4C97B", hair: "rgba(244,201,123,0.4)", serif: true, ornament: "monogram" },
  { id: "marble", name: "Marble & Gold", tagline: "Carrara classic", category: "luxury",
    bg: ["#F2EDE6", "#E0D6C5", "#C9B98F"] as const,
    ink: "#1A1A1A", subInk: "#7A6A4A", accent: "#B68A2E", hair: "rgba(26,26,26,0.18)", serif: true, ornament: "monogram" },
  { id: "obsidian", name: "Obsidian Gold", tagline: "Midnight luxury", category: "luxury",
    bg: ["#000000", "#0E0E12", "#1A1A22"] as const,
    ink: "#F4C97B", subInk: "#D9B879", accent: "#F4C97B", hair: "rgba(244,201,123,0.5)", serif: true, ornament: "monogram" },

  // Elegant
  { id: "rose", name: "Rosé", tagline: "Romantic & warm", category: "elegant",
    bg: ["#FF6FA8", "#FF2D7A", "#8B0030"] as const,
    ink: "#FFFFFF", subInk: "#FFE2EE", accent: "#FFF8F0", hair: "rgba(255,255,255,0.5)", serif: true, ornament: "ribbon" },
  { id: "blush", name: "Blush Garden", tagline: "Soft & dreamy", category: "elegant",
    bg: ["#FBE2EC", "#F4C2D5", "#E89BB8"] as const,
    ink: "#5A1E36", subInk: "#8A3A56", accent: "#C71153", hair: "rgba(90,30,54,0.18)", serif: true, ornament: "ribbon" },
  { id: "sage", name: "Sage Whisper", tagline: "Organic romance", category: "elegant",
    bg: ["#E8EEDD", "#C8D5B0", "#8FA77F"] as const,
    ink: "#2A3A24", subInk: "#5C6E50", accent: "#7A9263", hair: "rgba(42,58,36,0.18)", serif: true, ornament: "floral" },
  { id: "dune", name: "Dune", tagline: "Warm terracotta", category: "elegant",
    bg: ["#F5E6D3", "#E3B585", "#B5774D"] as const,
    ink: "#3A1F0E", subInk: "#7A4F2F", accent: "#B5774D", hair: "rgba(58,31,14,0.2)", serif: true, ornament: "lines" },
  { id: "pearl", name: "Pearl Lace", tagline: "Vintage gentility", category: "elegant",
    bg: ["#F8F4EE", "#EDE2D0", "#D9C8AE"] as const,
    ink: "#3A2A18", subInk: "#7A6048", accent: "#B58F4A", hair: "rgba(58,42,24,0.18)", serif: true, ornament: "ribbon" },

  // Minimal
  { id: "minimal", name: "Minima", tagline: "Clean & quiet", category: "minimal",
    bg: ["#FFF8F0", "#F3E9DE", "#E8D9C6"] as const,
    ink: "#0A0A0B", subInk: "#6E6E78", accent: "#C71153", hair: "rgba(10,10,11,0.2)", serif: false, ornament: "lines" },
  { id: "linen", name: "Linen", tagline: "Soft neutrals", category: "minimal",
    bg: ["#FAF6F0", "#EFE7DA", "#D9CDB8"] as const,
    ink: "#222018", subInk: "#6D6657", accent: "#2A2A2A", hair: "rgba(34,32,24,0.18)", serif: false, ornament: "lines" },
  { id: "ivory", name: "Ivory Lines", tagline: "Editorial calm", category: "minimal",
    bg: ["#FFFFFF", "#F6F2EC", "#EAE2D6"] as const,
    ink: "#0A0A0B", subInk: "#5A5A60", accent: "#FF2D7A", hair: "rgba(10,10,11,0.16)", serif: false, ornament: "lines" },
  { id: "fog", name: "Fog", tagline: "Cool greys", category: "minimal",
    bg: ["#F0F2F5", "#D8DBE3", "#A8B0BD"] as const,
    ink: "#10131A", subInk: "#4C5566", accent: "#3B6EFF", hair: "rgba(16,19,26,0.18)", serif: false, ornament: "lines" },
  { id: "paper", name: "Paper White", tagline: "Pure & airy", category: "minimal",
    bg: ["#FFFFFF", "#FAFAFA", "#F0F0F0"] as const,
    ink: "#111111", subInk: "#666666", accent: "#FF2D7A", hair: "rgba(17,17,17,0.14)", serif: false, ornament: "lines" },

  // Modern
  { id: "gradient-pop", name: "Gradient Pop", tagline: "Bold abstract", category: "modern",
    bg: ["#FF2D7A", "#7A2CFF", "#1E90FF"] as const,
    ink: "#FFFFFF", subInk: "#FFE2EE", accent: "#FFF8F0", hair: "rgba(255,255,255,0.45)", serif: false, ornament: "lines" },
  { id: "duotone", name: "Duotone", tagline: "Editorial split", category: "modern",
    bg: ["#0A0A0B", "#0A0A0B", "#FF2D7A"] as const,
    ink: "#FFFFFF", subInk: "#FFB6CC", accent: "#FF2D7A", hair: "rgba(255,255,255,0.3)", serif: false, ornament: "lines" },
  { id: "mono-bold", name: "Mono Bold", tagline: "Brutalist headline", category: "modern",
    bg: ["#0A0A0B", "#101015", "#1A1A22"] as const,
    ink: "#FFFFFF", subInk: "#A0A0AB", accent: "#FFFFFF", hair: "rgba(255,255,255,0.18)", serif: false, ornament: "lines" },
  { id: "skyline", name: "Skyline", tagline: "Modern fade", category: "modern",
    bg: ["#0A1A2B", "#1E3A5F", "#5C8AC4"] as const,
    ink: "#FFFFFF", subInk: "#B7CDE5", accent: "#F4C97B", hair: "rgba(255,255,255,0.28)", serif: false, ornament: "lines" },
  { id: "citrus", name: "Citrus Sun", tagline: "Vibrant warmth", category: "modern",
    bg: ["#FFB347", "#FF7E47", "#E63946"] as const,
    ink: "#FFFFFF", subInk: "#FFE8C9", accent: "#FFF8F0", hair: "rgba(255,255,255,0.4)", serif: false, ornament: "lines" },

  // Dark
  { id: "midnight", name: "Midnight", tagline: "Deep blue calm", category: "dark",
    bg: ["#070B1A", "#0F1733", "#1A2A55"] as const,
    ink: "#F0F2FF", subInk: "#9AAAD8", accent: "#FF6FA8", hair: "rgba(255,255,255,0.18)", serif: false, ornament: "lines" },
  { id: "ink", name: "Ink", tagline: "Pure black", category: "dark",
    bg: ["#000000", "#050505", "#0F0F12"] as const,
    ink: "#FFFFFF", subInk: "#A0A0AB", accent: "#FF2D7A", hair: "rgba(255,255,255,0.22)", serif: false, ornament: "lines" },
  { id: "carbon", name: "Carbon", tagline: "Industrial dark", category: "dark",
    bg: ["#101013", "#1A1A20", "#2A2A33"] as const,
    ink: "#FFFFFF", subInk: "#9D9DA8", accent: "#3DD68C", hair: "rgba(255,255,255,0.18)", serif: false, ornament: "lines" },
  { id: "aurora", name: "Aurora", tagline: "Night sky shimmer", category: "dark",
    bg: ["#0A0A22", "#1B1450", "#3E1F70"] as const,
    ink: "#FFFFFF", subInk: "#C9C0F0", accent: "#7AE0FF", hair: "rgba(255,255,255,0.22)", serif: false, ornament: "monogram" },
  { id: "ember", name: "Ember", tagline: "Charcoal & ember", category: "dark",
    bg: ["#100808", "#1F0E0B", "#3A1A12"] as const,
    ink: "#FFE9D6", subInk: "#D9A98E", accent: "#FF6A33", hair: "rgba(255,233,214,0.2)", serif: true, ornament: "monogram" },

  // Floral
  { id: "bloom", name: "Cultural Bloom", tagline: "Vibrant tradition", category: "cultural",
    bg: ["#3D0A24", "#8B0030", "#C71153"] as const,
    ink: "#FFF8F0", subInk: "#F8D9E5", accent: "#F4C97B", hair: "rgba(244,201,123,0.4)", serif: true, ornament: "floral" },
  { id: "wild-floral", name: "Wildflower", tagline: "Garden romance", category: "floral",
    bg: ["#FFE5E0", "#F5B8C2", "#D88B9C"] as const,
    ink: "#3A1E2A", subInk: "#7A4458", accent: "#C71153", hair: "rgba(58,30,42,0.2)", serif: true, ornament: "floral" },
  { id: "peony", name: "Peony", tagline: "Lush blooms", category: "floral",
    bg: ["#FFD8E0", "#F39FB4", "#C8537A"] as const,
    ink: "#3F1024", subInk: "#7A3050", accent: "#7A3050", hair: "rgba(63,16,36,0.2)", serif: true, ornament: "floral" },
  { id: "magnolia", name: "Magnolia", tagline: "Cream petals", category: "floral",
    bg: ["#FFF8F0", "#F4E1C7", "#D9B377"] as const,
    ink: "#3A2A14", subInk: "#7A5A2E", accent: "#B5874A", hair: "rgba(58,42,20,0.2)", serif: true, ornament: "floral" },
  { id: "lavender", name: "Lavender Fields", tagline: "Soft purple bloom", category: "floral",
    bg: ["#EDE6F8", "#C8B5E8", "#8B6FB8"] as const,
    ink: "#2E1A4D", subInk: "#6B5295", accent: "#8B6FB8", hair: "rgba(46,26,77,0.2)", serif: true, ornament: "floral" },

  // Retro
  { id: "retro-70s", name: "Groovy 70s", tagline: "Mustard & rust", category: "retro",
    bg: ["#E9A23B", "#C8632C", "#7A2E1A"] as const,
    ink: "#FFF8F0", subInk: "#FFE2C2", accent: "#FFF8F0", hair: "rgba(255,255,255,0.35)", serif: true, ornament: "ribbon" },
  { id: "vhs", name: "VHS Dream", tagline: "80s synthwave", category: "retro",
    bg: ["#1A0B3A", "#5C1A8B", "#FF2D7A"] as const,
    ink: "#FFFFFF", subInk: "#FFC1E0", accent: "#7AE0FF", hair: "rgba(255,255,255,0.3)", serif: false, ornament: "lines" },
  { id: "polaroid", name: "Polaroid", tagline: "Faded film", category: "retro",
    bg: ["#F3E9D2", "#D9C49A", "#8C6F4A"] as const,
    ink: "#2B1A0A", subInk: "#6E5232", accent: "#C7544A", hair: "rgba(43,26,10,0.2)", serif: false, ornament: "lines" },
  { id: "diner", name: "Diner Neon", tagline: "Mid-century cool", category: "retro",
    bg: ["#0E1530", "#1F2A5C", "#E63946"] as const,
    ink: "#FFF8F0", subInk: "#F2C9C9", accent: "#F4C97B", hair: "rgba(255,248,240,0.25)", serif: true, ornament: "ribbon" },
  { id: "sepia", name: "Sepia Letter", tagline: "Old paper love", category: "retro",
    bg: ["#E9D9B8", "#C9A87A", "#8A6A3F"] as const,
    ink: "#2E1E0A", subInk: "#6E5430", accent: "#8A4A1F", hair: "rgba(46,30,10,0.2)", serif: true, ornament: "lines" },

  // Corporate
  { id: "exec-navy", name: "Executive Navy", tagline: "Polished corporate", category: "corporate",
    bg: ["#0B1B33", "#143058", "#1F4B86"] as const,
    ink: "#FFFFFF", subInk: "#B7CDE5", accent: "#F4C97B", hair: "rgba(255,255,255,0.22)", serif: false, ornament: "lines" },
  { id: "boardroom", name: "Boardroom", tagline: "Slate professional", category: "corporate",
    bg: ["#1E232D", "#2A323F", "#3A4452"] as const,
    ink: "#FFFFFF", subInk: "#B0BAC8", accent: "#3DD68C", hair: "rgba(255,255,255,0.18)", serif: false, ornament: "lines" },
  { id: "blueprint", name: "Blueprint", tagline: "Crisp & confident", category: "corporate",
    bg: ["#F4F7FC", "#DDE5F0", "#A8BAD5"] as const,
    ink: "#0B1B33", subInk: "#4C6285", accent: "#1F4B86", hair: "rgba(11,27,51,0.2)", serif: false, ornament: "lines" },
  { id: "summit", name: "Summit", tagline: "Tech keynote", category: "corporate",
    bg: ["#0A0F1A", "#1A2238", "#2D3A5A"] as const,
    ink: "#FFFFFF", subInk: "#9AAAD8", accent: "#3B6EFF", hair: "rgba(255,255,255,0.2)", serif: false, ornament: "lines" },
  { id: "monogram-co", name: "Monogram Co.", tagline: "Brand classic", category: "corporate",
    bg: ["#FFFFFF", "#F2F2F2", "#D9D9D9"] as const,
    ink: "#0A0A0B", subInk: "#4A4A55", accent: "#C71153", hair: "rgba(10,10,11,0.18)", serif: true, ornament: "monogram" },

  // Neon
  { id: "neon-night", name: "Neon Night", tagline: "Electric club", category: "neon",
    bg: ["#0A0220", "#1B0345", "#FF2D7A"] as const,
    ink: "#FFFFFF", subInk: "#FF9BCB", accent: "#7AE0FF", hair: "rgba(122,224,255,0.4)", serif: false, ornament: "lines" },
  { id: "cyber", name: "Cyber", tagline: "Glitch chrome", category: "neon",
    bg: ["#000814", "#001D3D", "#7AE0FF"] as const,
    ink: "#FFFFFF", subInk: "#A6E9FF", accent: "#FF2D7A", hair: "rgba(122,224,255,0.4)", serif: false, ornament: "lines" },
  { id: "miami", name: "Miami", tagline: "Pastel neon", category: "neon",
    bg: ["#FF6FA8", "#7AE0FF", "#FFB347"] as const,
    ink: "#1A0A2E", subInk: "#4D2E5E", accent: "#FFFFFF", hair: "rgba(26,10,46,0.3)", serif: false, ornament: "lines" },
  { id: "neon-lime", name: "Lime Pulse", tagline: "Glow stick green", category: "neon",
    bg: ["#0A1A05", "#1F4D14", "#A8FF2D"] as const,
    ink: "#0A0A0B", subInk: "#2E4D14", accent: "#FFFFFF", hair: "rgba(10,10,11,0.3)", serif: false, ornament: "lines" },
  { id: "tokyo", name: "Tokyo", tagline: "Neon midnight", category: "neon",
    bg: ["#0A0A22", "#3E0F70", "#FF2D7A"] as const,
    ink: "#FFFFFF", subInk: "#FFC1E0", accent: "#7AE0FF", hair: "rgba(255,255,255,0.32)", serif: false, ornament: "lines" },

  // Cultural
  { id: "henna", name: "Henna", tagline: "South Asian elegance", category: "cultural",
    bg: ["#3A0E14", "#7A1E2E", "#C7384F"] as const,
    ink: "#FFF8F0", subInk: "#F8D9E5", accent: "#F4C97B", hair: "rgba(244,201,123,0.45)", serif: true, ornament: "floral" },
  { id: "kente", name: "Kente Gold", tagline: "African royalty", category: "cultural",
    bg: ["#1F0A05", "#5C2E0F", "#D9A23B"] as const,
    ink: "#FFF8F0", subInk: "#F4C97B", accent: "#3DD68C", hair: "rgba(244,201,123,0.45)", serif: true, ornament: "monogram" },
  { id: "andes", name: "Andes", tagline: "South American heritage", category: "cultural",
    bg: ["#3A0F1F", "#7A2238", "#D9A23B"] as const,
    ink: "#FFF8F0", subInk: "#F4C97B", accent: "#7AE0FF", hair: "rgba(255,248,240,0.3)", serif: true, ornament: "floral" },
  { id: "sakura", name: "Sakura", tagline: "Japanese spring", category: "cultural",
    bg: ["#FFE5EC", "#F5B8C8", "#7A1E2E"] as const,
    ink: "#3A0E1A", subInk: "#7A3050", accent: "#7A1E2E", hair: "rgba(58,14,26,0.22)", serif: true, ornament: "floral" },
  { id: "mehndi", name: "Mehndi Garden", tagline: "Intricate tradition", category: "cultural",
    bg: ["#1A3A1F", "#2E5C36", "#D9A23B"] as const,
    ink: "#FFF8F0", subInk: "#F4C97B", accent: "#F4C97B", hair: "rgba(244,201,123,0.4)", serif: true, ornament: "floral" },

  // Kids
  { id: "candy", name: "Candy Pop", tagline: "Sweet & playful", category: "kids",
    bg: ["#FFD1E0", "#FFB6CC", "#FF8AB8"] as const,
    ink: "#3A0E2E", subInk: "#7A3056", accent: "#7AE0FF", hair: "rgba(58,14,46,0.2)", serif: false, ornament: "ribbon" },
  { id: "bubblegum", name: "Bubblegum", tagline: "Fun & bright", category: "kids",
    bg: ["#FF9BCB", "#7AE0FF", "#FFF59B"] as const,
    ink: "#1A0A2E", subInk: "#4D2E5E", accent: "#FFFFFF", hair: "rgba(26,10,46,0.25)", serif: false, ornament: "ribbon" },
  { id: "starry-fun", name: "Starry Fun", tagline: "Magical adventure", category: "kids",
    bg: ["#1B0454", "#5C1A8B", "#7AE0FF"] as const,
    ink: "#FFFFFF", subInk: "#C9C0F0", accent: "#FFD93B", hair: "rgba(255,255,255,0.35)", serif: false, ornament: "monogram" },
  { id: "rainbow", name: "Rainbow", tagline: "Joy in colour", category: "kids",
    bg: ["#FF6FA8", "#FFB347", "#7AE0FF"] as const,
    ink: "#1A0A2E", subInk: "#4D2E5E", accent: "#FFFFFF", hair: "rgba(26,10,46,0.25)", serif: false, ornament: "ribbon" },

  // Party / Nightlife
  { id: "club", name: "Club Night", tagline: "Velvet rope", category: "party",
    bg: ["#0A0A0B", "#1A0410", "#FF2D7A"] as const,
    ink: "#FFFFFF", subInk: "#FFB6CC", accent: "#F4C97B", hair: "rgba(255,255,255,0.25)", serif: false, ornament: "monogram" },
  { id: "disco", name: "Disco Ball", tagline: "Glitter & gloss", category: "party",
    bg: ["#1A0A2E", "#5C1A8B", "#F4C97B"] as const,
    ink: "#FFFFFF", subInk: "#F4C97B", accent: "#FFFFFF", hair: "rgba(244,201,123,0.45)", serif: false, ornament: "monogram" },
  { id: "rooftop", name: "Rooftop", tagline: "City skyline party", category: "party",
    bg: ["#0F1733", "#3A1A55", "#FF6FA8"] as const,
    ink: "#FFFFFF", subInk: "#FFB6CC", accent: "#7AE0FF", hair: "rgba(255,255,255,0.3)", serif: false, ornament: "lines" },
  { id: "festival", name: "Festival", tagline: "Open-air vibes", category: "party",
    bg: ["#FF7E47", "#E63946", "#7A1E2E"] as const,
    ink: "#FFF8F0", subInk: "#FFE2C2", accent: "#7AE0FF", hair: "rgba(255,255,255,0.3)", serif: false, ornament: "lines" },
];

export const EVENT_TYPES = [
  { id: "wedding", label: "Wedding", emoji: "💍" },
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "engagement", label: "Engagement", emoji: "💎" },
  { id: "baby", label: "Baby Shower", emoji: "👶" },
  { id: "graduation", label: "Graduation", emoji: "🎓" },
  { id: "corporate", label: "Corporate", emoji: "🏢" },
  { id: "concert", label: "Concert", emoji: "🎤" },
  { id: "festival", label: "Festival", emoji: "🎪" },
  { id: "religious", label: "Religious", emoji: "🕊" },
  { id: "vacation", label: "Vacation", emoji: "🏝" },
  { id: "private", label: "Private Party", emoji: "🥂" },
  { id: "brand", label: "Brand Event", emoji: "✨" },
  { id: "custom", label: "Custom", emoji: "✦" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

export type TimeOfDayId = "morning" | "afternoon" | "evening" | "night";

export const TIME_OF_DAY: { id: TimeOfDayId; label: string; emoji: string; hint: string }[] = [
  { id: "morning", label: "Morning", emoji: "🌅", hint: "5am – 11am" },
  { id: "afternoon", label: "Afternoon", emoji: "☀️", hint: "12pm – 4pm" },
  { id: "evening", label: "Evening", emoji: "🌆", hint: "5pm – 8pm" },
  { id: "night", label: "Night", emoji: "🌙", hint: "9pm – late" },
];

export function timeOfDayFromDate(ts: number): TimeOfDayId {
  const h = new Date(ts).getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export type CameraStyleId =
  | "disposable"
  | "polaroid"
  | "vintage"
  | "retro"
  | "digital"
  | "clean";

export interface CameraStyle {
  id: CameraStyleId;
  label: string;
  tagline: string;
  filmLabel: string;
  overlay: string;
  tint: string;
  vignette: number;
  grain: number;
  frame: "none" | "polaroid" | "film";
  border: string;
}

export const CAMERA_STYLES: CameraStyle[] = [
  { id: "disposable", label: "Disposable", tagline: "Single-use party film", filmLabel: "DISPOSABLE 400",
    overlay: "rgba(255,150,80,0.20)", tint: "#FFB070", vignette: 0.45, grain: 0.10, frame: "film", border: "#FFF8F0" },
  { id: "polaroid", label: "Polaroid", tagline: "Instant white frame", filmLabel: "INSTANT SX-70",
    overlay: "rgba(255,230,200,0.18)", tint: "#FDE6C7", vignette: 0.30, grain: 0.06, frame: "polaroid", border: "#FFFFFF" },
  { id: "vintage", label: "Vintage", tagline: "Faded 70s memories", filmLabel: "KODAK GOLD 200",
    overlay: "rgba(180,120,60,0.30)", tint: "#C49066", vignette: 0.55, grain: 0.14, frame: "none", border: "#0A0A0B" },
  { id: "retro", label: "Retro", tagline: "Punchy 90s point-shoot", filmLabel: "FUJI SUPERIA 400",
    overlay: "rgba(255,80,140,0.18)", tint: "#FF6FA8", vignette: 0.40, grain: 0.12, frame: "none", border: "#0A0A0B" },
  { id: "digital", label: "Digi-Vintage", tagline: "Early 2000s digicam", filmLabel: "DIGITAL CCD",
    overlay: "rgba(120,180,255,0.16)", tint: "#9CC4FF", vignette: 0.20, grain: 0.04, frame: "none", border: "#0A0A0B" },
  { id: "clean", label: "Clean", tagline: "Crisp & natural", filmLabel: "FILM 35mm",
    overlay: "transparent", tint: "#FFFFFF", vignette: 0.15, grain: 0.03, frame: "none", border: "#0A0A0B" },
];

export const STOCK_SHOTS: string[] = [
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80",
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80",
  "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=1200&q=80",
  "https://images.unsplash.com/photo-1521543387181-7b076ee0d49b?w=1200&q=80",
  "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=80",
  "https://images.unsplash.com/photo-1543158266-0066955047b1?w=1200&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=1200&q=80",
  "https://images.unsplash.com/photo-1511795409834-432f31197ce5?w=1200&q=80",
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80",
  "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1200&q=80",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80",
];

export interface CoverCategory {
  id: string;
  label: string;
  emoji: string;
  images: string[];
}

export const COVER_CATEGORIES: CoverCategory[] = [
  {
    id: "wedding",
    label: "Wedding",
    emoji: "💍",
    images: [
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600&q=80",
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1600&q=80",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&q=80",
    ],
  },
  {
    id: "birthday",
    label: "Birthday",
    emoji: "🎂",
    images: [
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80",
      "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1600&q=80",
      "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1600&q=80",
      "https://images.unsplash.com/photo-1533294455009-a77b7557d2d1?w=1600&q=80",
      "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=1600&q=80",
    ],
  },
  {
    id: "corporate",
    label: "Corporate",
    emoji: "💼",
    images: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&q=80",
      "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1600&q=80",
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&q=80",
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1600&q=80",
    ],
  },
  {
    id: "graduation",
    label: "Graduation",
    emoji: "🎓",
    images: [
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1600&q=80",
      "https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?w=1600&q=80",
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80",
      "https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1600&q=80",
    ],
  },
  {
    id: "baby",
    label: "Baby Shower",
    emoji: "👶",
    images: [
      "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1600&q=80",
      "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1600&q=80",
      "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=1600&q=80",
      "https://images.unsplash.com/photo-1544126592-807ade215a0b?w=1600&q=80",
    ],
  },
  {
    id: "concert",
    label: "Concert",
    emoji: "🎤",
    images: [
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80",
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600&q=80",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=80",
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1600&q=80",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80",
    ],
  },
  {
    id: "religious",
    label: "Religious",
    emoji: "🕊",
    images: [
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1600&q=80",
      "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1600&q=80",
      "https://images.unsplash.com/photo-1519491050282-7d19794dac9a?w=1600&q=80",
      "https://images.unsplash.com/photo-1543674892-7d64d45df18b?w=1600&q=80",
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    emoji: "💖",
    images: [
      "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1600&q=80",
      "https://images.unsplash.com/photo-1529636798458-92182e662485?w=1600&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=1600&q=80",
      "https://images.unsplash.com/photo-1517722014278-c256a91a6fba?w=1600&q=80",
    ],
  },
  {
    id: "luxury",
    label: "Luxury",
    emoji: "🥂",
    images: [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
      "https://images.unsplash.com/photo-1543158266-0066955047b1?w=1600&q=80",
      "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1600&q=80",
    ],
  },
  {
    id: "beach",
    label: "Beach Party",
    emoji: "🏝",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&q=80",
      "https://images.unsplash.com/photo-1533760881669-80db4d7b341a?w=1600&q=80",
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1600&q=80",
    ],
  },
  {
    id: "festival",
    label: "Festival",
    emoji: "🎪",
    images: [
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600&q=80",
      "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=1600&q=80",
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&q=80",
      "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1600&q=80",
    ],
  },
  {
    id: "networking",
    label: "Networking",
    emoji: "🤝",
    images: [
      "https://images.unsplash.com/photo-1511795409834-432f31197ce5?w=1600&q=80",
      "https://images.unsplash.com/photo-1559223607-a43c990c692c?w=1600&q=80",
      "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=1600&q=80",
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1600&q=80",
    ],
  },
];

// Flat list for backwards compatibility.
export const COVER_PRESETS: string[] = COVER_CATEGORIES.flatMap((c) => c.images);
