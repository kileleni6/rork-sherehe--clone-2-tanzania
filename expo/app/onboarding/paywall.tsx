import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Building2, Check, Crown, HardDrive, Mail, Sparkles, Tag as TagIcon, Users } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardShell } from "@/components/OnboardShell";
import { PrimaryButton } from "@/components/ui";
import { C } from "@/constants/colors";
import { useEvents } from "@/providers/EventsProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";


type TierId = "starter" | "celebration" | "premium" | "large" | "enterprise" | "super";

interface Tier {
  id: TierId;
  name: string;
  blurb: string;
  price: string;
  per: string;
  guests: string;
  storage: string;
  highlight?: boolean;
  free?: boolean;
}

const TIERS: Tier[] = [
  { id: "starter", name: "Starter", blurb: "Up to 5 guests", price: "Free", per: "forever", guests: "5 guests", storage: "1 GB", free: true },
  { id: "celebration", name: "Celebration", blurb: "Up to 100 guests", price: "$24.99", per: "one-time", guests: "100 guests", storage: "25 GB", highlight: true },
  { id: "premium", name: "Premium Event", blurb: "Up to 250 guests", price: "$89.99", per: "one-time", guests: "250 guests", storage: "75 GB" },
  { id: "large", name: "Large Event", blurb: "Up to 500 guests", price: "$149.99", per: "one-time", guests: "500 guests", storage: "150 GB" },
  { id: "enterprise", name: "Enterprise Event", blurb: "Up to 1,000 guests", price: "$299.99", per: "one-time", guests: "1,000 guests", storage: "500 GB" },
  { id: "super", name: "Super Event", blurb: "Up to 2,000 guests", price: "$499.99", per: "one-time", guests: "2,000 guests", storage: "Unlimited" },
];

const PERKS = [
  "All 50+ premium invitation templates",
  "HD photo downloads & album ZIP",
  "Custom branding (remove SHEREHE mark)",
  "Advanced RSVP analytics & insights",
  "AI invitation writer & best-moments curation",
];

export default function OnboardingPaywallScreen() {
  const router = useRouter();
  const { t } = useOnboarding();
  const { retentionDays } = useEvents();
  const { guestTier } = useLocalSearchParams<{ guestTier: string }>();

  // Pre-select the tier based on guest count from onboarding, if available
  const initialTier = useMemo<TierId>(() => {
    if (guestTier === "enterprise_custom") return "super";
    if (guestTier && TIERS.some((tr) => tr.id === guestTier)) return guestTier as TierId;
    return "celebration";
  }, [guestTier]);

  const [tier, setTier] = useState<TierId>(initialTier);

  const shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(shine, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ).start();
  }, [shine]);
  const shimmer = shine.interpolate({ inputRange: [0, 1], outputRange: [-200, 260] });

  const selected = TIERS.find((t) => t.id === tier);

  const subscribe = () => {
    if (!selected) return;
    // Free tier: no purchase needed — go straight to auth
    if (selected.free) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.push("/onboarding/auth" as never);
      return;
    }
    // Paid tier: show plan-detail confirmation, then purchase
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push({
      pathname: "/plan-detail" as never,
      params: { tier: selected.id, fromOnboarding: "1" } as never,
    });
  };

  const skip = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    router.push("/onboarding/auth" as never);
  };
  const ctaTitle = selected?.free
    ? t("paywall_cta_start_free", { name: selected.name })
    : t("paywall_cta_unlock", { name: selected?.name ?? "", price: selected?.price ?? "" });

  const enterpriseCTA = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    Linking.openURL("mailto:events@sherehe.net?subject=Custom%20Enterprise%20Event%20Inquiry").catch(() => {
      Alert.alert("Contact us", "Please email events@sherehe.net for custom enterprise event pricing.");
    });
  };

  return (
    <OnboardShell
      step={8}
      total={9}
      kicker="UNLOCK"
      title="Host like a star"
      subtitle="One payment per event. Pick your size — or start free and upgrade later."
      footer={
        <View style={{ gap: 10 }}>
          <PrimaryButton
            title={ctaTitle}
            icon={Crown}
            onPress={subscribe}
          />
          {!selected?.free ? (
            <Pressable onPress={skip} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 4 }}>
              <Text style={styles.skip}>{t("paywall_skip_free")}</Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      <View style={styles.heroCard}>
        <LinearGradient
          colors={["#3D0A24", "#8B0030", C.pinkDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmer }, { rotate: "18deg" }] },
          ]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.18)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <View style={styles.crownBadge}>
          <Crown color={C.gold} size={14} />
          <Text style={styles.crownText}>SHEREHE PRO</Text>
        </View>
        <Sparkles color={C.gold} size={28} />
        <Text style={styles.heroTitle}>Make it unforgettable</Text>
        <Text style={styles.heroSub}>Premium templates, bigger guest lists, HD memories.</Text>
      </View>

      {/* How SHEREHE pricing works */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>{t("paywall_intro_title")}</Text>
        <Text style={styles.howBody}>{t("paywall_intro_p1")}</Text>
        <View style={styles.howRow}>
          <View style={styles.howIcon}><Users color={C.pinkHi} size={13} /></View>
          <Text style={styles.howRowText}>{t("paywall_bullet_guests")}</Text>
        </View>
        <View style={styles.howRow}>
          <View style={styles.howIcon}><Sparkles color={C.gold} size={13} /></View>
          <Text style={styles.howRowText}>{t("paywall_bullet_features")}</Text>
        </View>
        <View style={styles.howRow}>
          <View style={styles.howIcon}><HardDrive color={C.success} size={13} /></View>
          <Text style={styles.howRowText}>{t("paywall_bullet_storage")}</Text>
        </View>
        <View style={styles.howRow}>
          <View style={styles.howIcon}><TagIcon color={C.text} size={13} /></View>
          <Text style={styles.howRowText}>{t("paywall_bullet_event")}</Text>
        </View>
        <Text style={styles.howFoot}>{t("paywall_storage_note", { days: retentionDays })}</Text>
      </View>

      <View style={{ gap: 12, marginTop: 18 }}>
        {TIERS.map((tr) => {
          const active = tier === tr.id;
          const per = tr.free ? t("paywall_free_forever") : t("paywall_one_time");
          return (
            <Pressable key={tr.id} onPress={() => setTier(tr.id)} style={[styles.tier, active ? styles.tierActive : null]}>
              {tr.highlight ? (
                <View style={styles.popular}>
                  <Text style={styles.popularText}>{t("paywall_most_popular")}</Text>
                </View>
              ) : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.tierName}>{tr.name}</Text>
                <Text style={styles.tierBlurb}>{tr.blurb}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{tr.guests}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{tr.storage}</Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.tierPrice, tr.free ? { color: C.gold } : null]}>{tr.price}</Text>
                <Text style={styles.tierPer}>{per}</Text>
                <View style={[styles.radio, active ? styles.radioOn : null]}>
                  {active ? <Check color={C.text} size={14} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}

        {/* ── Enterprise Section ── */}
        <View style={styles.enterpriseDivider}>
          <View style={styles.enterpriseLine} />
          <Text style={styles.enterpriseLabel}>ENTERPRISE</Text>
          <View style={styles.enterpriseLine} />
        </View>

        <Pressable onPress={enterpriseCTA} style={styles.enterpriseCard}>
          <LinearGradient
            colors={["rgba(244,201,123,0.12)", "rgba(244,201,123,0.04)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.enterpriseBadge}>
            <Building2 color={C.gold} size={14} />
            <Text style={styles.enterpriseBadgeText}>FOR LARGE EVENTS</Text>
          </View>
          <Text style={styles.enterpriseName}>Custom Enterprise Plan</Text>
          <Text style={styles.enterpriseBlurb}>
            For events with 2,000+ guests — dedicated support, scalable infrastructure, and tailored pricing.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <View style={styles.enterpriseTag}><Text style={styles.enterpriseTagText}>2,000+ guests</Text></View>
            <View style={styles.enterpriseTag}><Text style={styles.enterpriseTagText}>Unlimited storage</Text></View>
            <View style={styles.enterpriseTag}><Text style={styles.enterpriseTagText}>Dedicated support</Text></View>
            <View style={styles.enterpriseTag}><Text style={styles.enterpriseTagText}>Custom pricing</Text></View>
          </View>
          <View style={styles.enterpriseCTA}>
            <Mail color={C.gold} size={16} />
            <Text style={styles.enterpriseCTAText}>Contact Us for Pricing</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.perks}>
        {PERKS.map((p) => (
          <View key={p} style={styles.perkRow}>
            <View style={styles.perkCheck}>
              <Check color={C.bg} size={12} />
            </View>
            <Text style={styles.perkText}>{p}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.legal}>
        Pay with Apple Pay, Google Pay or card via Stripe. Cancel anytime — it's a one-time per event.
      </Text>
    </OnboardShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 22,
    padding: 22,
    overflow: "hidden",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(244,201,123,0.3)",
  },
  shimmer: {
    position: "absolute",
    top: -40,
    width: 120,
    height: 320,
  },
  crownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244,201,123,0.4)",
  },
  crownText: { color: C.gold, fontSize: 10, fontWeight: "800" as const, letterSpacing: 2 },
  heroTitle: { color: C.text, fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.5, textAlign: "center", marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center", lineHeight: 18, paddingHorizontal: 8 },

  tier: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.hair,
  },
  tierActive: { borderColor: C.gold, backgroundColor: "rgba(244,201,123,0.06)" },
  popular: {
    position: "absolute",
    top: -10,
    left: 16,
    backgroundColor: C.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  popularText: { color: "#0A0A0B", fontSize: 9, fontWeight: "800" as const, letterSpacing: 1 },
  tierName: { color: C.text, fontSize: 18, fontWeight: "800" as const, letterSpacing: -0.3 },
  tierBlurb: { color: C.subtext, fontSize: 12 },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hair,
  },
  tagText: { color: C.text, fontSize: 10, fontWeight: "600" as const },
  tierPrice: { color: C.text, fontSize: 20, fontWeight: "800" as const },
  tierPer: { color: C.subtext, fontSize: 10, marginTop: -2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.hair,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  radioOn: { backgroundColor: C.pink, borderColor: C.pink },

  perks: { marginTop: 20, gap: 12, padding: 16, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.hair },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  perkCheck: { width: 20, height: 20, borderRadius: 999, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" },
  perkText: { color: C.text, fontSize: 13, flex: 1, fontWeight: "500" as const },

  legal: { color: C.mute, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16, paddingHorizontal: 8 },
  howCard: { marginTop: 18, padding: 16, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.hair, gap: 8 },
  howTitle: { color: C.text, fontSize: 14, fontWeight: "800" as const, letterSpacing: -0.2 },
  howBody: { color: C.subtext, fontSize: 12, lineHeight: 17 },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 4 },
  howIcon: { width: 22, height: 22, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center", marginTop: 1, borderWidth: 1, borderColor: C.hair },
  howRowText: { color: C.text, fontSize: 12, lineHeight: 17, flex: 1, fontWeight: "500" as const },
  howFoot: { color: C.mute, fontSize: 11, lineHeight: 15, marginTop: 6 },
  skip: { color: C.subtext, fontSize: 13, fontWeight: "600" as const, textDecorationLine: "underline" },

  // -- Enterprise section --
  enterpriseDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, marginBottom: 10 },
  enterpriseLine: { flex: 1, height: 1, backgroundColor: "rgba(244,201,123,0.2)" },
  enterpriseLabel: { color: C.gold, fontSize: 10, fontWeight: "800" as const, letterSpacing: 2 },
  enterpriseCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(244,201,123,0.3)",
    backgroundColor: "rgba(244,201,123,0.04)",
    overflow: "hidden",
    gap: 4,
  },
  enterpriseBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  enterpriseBadgeText: { color: C.gold, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.5 },
  enterpriseName: { color: C.text, fontSize: 18, fontWeight: "800" as const, letterSpacing: -0.3 },
  enterpriseBlurb: { color: "rgba(255,255,255,0.78)", fontSize: 12, lineHeight: 17 },
  enterpriseTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(244,201,123,0.1)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244,201,123,0.25)",
  },
  enterpriseTagText: { color: C.gold, fontSize: 10, fontWeight: "600" as const },
  enterpriseCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(244,201,123,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,201,123,0.3)",
  },
  enterpriseCTAText: { color: C.gold, fontSize: 13, fontWeight: "700" as const },
});
