export type TierId = "starter" | "celebration" | "premium" | "large" | "enterprise" | "super";

export interface Tier {
  id: TierId;
  name: string;
  blurb: string;
  price: string;
  per: "free" | "one_time";
  guests: string;
  storage: string;
  /** RevenueCat package lookup key in the current offering. */
  rcPackage?: Exclude<TierId, "starter">;
  /** Store product identifier shared across RevenueCat apps. */
  rcProductId?: string;
  highlight?: boolean;
  free?: boolean;
}

/** One-time event plans shown on onboarding and the main paywall. */
export const EVENT_TIERS: Tier[] = [
  {
    id: "starter",
    name: "Free Plan",
    blurb: "0–5 guests",
    price: "Free",
    per: "free",
    guests: "5 guests",
    storage: "1 GB",
    free: true,
  },
  {
    id: "celebration",
    name: "Celebration",
    blurb: "6–100 guests",
    price: "$24.99",
    per: "one_time",
    guests: "100 guests",
    storage: "25 GB",
    highlight: true,
    rcPackage: "celebration",
    rcProductId: "sherehe_celebration",
  },
  {
    id: "premium",
    name: "Premium",
    blurb: "101–250 guests",
    price: "$89.99",
    per: "one_time",
    guests: "250 guests",
    storage: "75 GB",
    rcPackage: "premium",
    rcProductId: "sherehe_premium",
  },
  {
    id: "large",
    name: "Business",
    blurb: "251–500 guests",
    price: "$149.99",
    per: "one_time",
    guests: "500 guests",
    storage: "150 GB",
    rcPackage: "large",
    rcProductId: "sherehe_large",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "501–1,000 guests",
    price: "$299.99",
    per: "one_time",
    guests: "1,000 guests",
    storage: "500 GB",
    rcPackage: "enterprise",
    rcProductId: "sherehe_enterprise",
  },
  {
    id: "super",
    name: "Scale",
    blurb: "1,001–2,000 guests",
    price: "$499.99",
    per: "one_time",
    guests: "2,000 guests",
    storage: "Unlimited",
    rcPackage: "super",
    rcProductId: "sherehe_super",
  },
];
