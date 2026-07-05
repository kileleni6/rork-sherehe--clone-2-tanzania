import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Crown,
  HardDrive,
  MessageSquareText,
  Palette,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/ui";
import { C } from "@/constants/colors";
import { purchasePackageByKey } from "@/lib/purchases";
import { useEvents } from "@/providers/EventsProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";
import { TIERS, type TierId } from "./paywall";

interface PlanFeature {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const ALL_FEATURES: PlanFeature[] = [
  {
    icon: <Sparkles color={C.gold} size={18} />,
    label: "Premium Templates",
    description: "20+ professionally designed invitation templates for every occasion.",
  },
  {
    icon: <Palette color={C.pinkHi} size={18} />,
    label: "Custom Branding",
    description: "Add your own logos, colors, and personal touches to invitations and passes.",
  },
  {
    icon: <Users color={C.success} size={18} />,
    label: "RSVP Analytics",
    description: "Track responses, guest counts, meal preferences, and attendance in real time.",
  },
  {
    icon: <HardDrive color={C.pinkHi} size={18} />,
    label: "HD Photo Export",
    description: "Download all event photos in full resolution after your event.",
  },
  {
    icon: <MessageSquareText color={C.gold} size={18} />,
    label: "AI Invitation Writer",
    description: "Generate elegant, personalized invitation copy with a single tap.",
  },
  {
    icon: <TrendingUp color={C.success} size={18} />,
    label: "Priority Support",
    description: "Get fast help from our team whenever you need it — before, during, and after your event.",
  },
];

export default function PlanDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tier: tierId, fromOnboarding } = useLocalSearchParams<{ tier: string; fromOnboarding?: string }>();
  const { setProfile } = useEvents();
  const { t } = useOnboarding();
  const [purchasing, setPurchasing] = useState<boolean>(false);

  const tier = TIERS.find((tr) => tr.id === (tierId as TierId));

  if (!tier) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView edges={["top", "bottom"]} style={s.center}>
          <Text style={s.errorText}>Plan not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={s.backLink}>Go back to plans</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const isFree = tier.free === true;

  const handlePurchase = async () => {
    if (isFree) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await setProfile({ premium: false });
      router.dismissAll();
      return;
    }

    if (!tier.rcPackage) return;

    setPurchasing(true);
    try {
      const result = await purchasePackageByKey(tier.rcPackage, tier.rcProductId);
      if (result.success) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await setProfile({ premium: true });
        if (result.mocked && Platform.OS !== "web") {
          console.log("[plan-detail] mock unlock (Expo Go / dev)");
        }
        // When coming from onboarding, continue to auth screen instead of dismissing
        if (fromOnboarding === "1") {
          router.replace("/onboarding/auth" as never);
        } else {
          router.dismissAll();
        }
      } else if (result.error === "user_cancelled") {
        // silent — user backed out of the native sheet
      } else {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert(t("paywall_purchase_failed_title"), t("paywall_purchase_failed_body"));
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#1A0410", "#3D0A24", "#8B0030", "#0A0A0B"]}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
            <ArrowLeft color={C.text} size={20} />
          </Pressable>
          <Text style={s.topTitle}>Plan Details</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero: Plan Name + Price ── */}
          <View style={s.heroCard}>
            {tier.highlight ? (
              <View style={s.popularBadge}>
                <Crown color="#0A0A0B" size={12} />
                <Text style={s.popularText}>{t("paywall_most_popular")}</Text>
              </View>
            ) : null}
            <Text style={s.planName}>{tier.name}</Text>
            <Text style={s.planBlurb}>{tier.blurb}</Text>
            <View style={s.priceRow}>
              <Text style={s.price}>{tier.price}</Text>
              <Text style={s.priceLabel}>
                {isFree ? t("paywall_free_forever") : t("paywall_one_time")}
              </Text>
            </View>
            <View style={s.capacityRow}>
              <View style={s.capacityTag}>
                <Users color={C.gold} size={14} />
                <Text style={s.capacityText}>{tier.guests}</Text>
              </View>
              <View style={s.capacityTag}>
                <HardDrive color={C.success} size={14} />
                <Text style={s.capacityText}>{tier.storage}</Text>
              </View>
            </View>
          </View>

          {/* ── Section: What's Included ── */}
          <Text style={s.sectionTitle}>What's Included</Text>
          <View style={s.featureList}>
            {ALL_FEATURES.map((feat, i) => (
              <View key={feat.label} style={s.featureRow}>
                <View style={s.featureIcon}>{feat.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureLabel}>{feat.label}</Text>
                  <Text style={s.featureDesc}>{feat.description}</Text>
                </View>
                <Check color={C.success} size={16} style={{ opacity: 0.7 }} />
              </View>
            ))}
            {!isFree && (
              <>
                <View style={s.featureDivider} />
                <View style={s.featureRow}>
                  <View style={s.featureIcon}>
                    <HardDrive color={C.text} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.featureLabel}>{tier.storage} photo storage</Text>
                    <Text style={s.featureDesc}>
                      Photos are kept for 30 days after your event. Download anytime before they expire.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* ── Section: How It Works ── */}
          <Text style={s.sectionTitle}>How It Works</Text>
          <View style={s.howCard}>
            <View style={s.howStep}>
              <View style={s.howNum}>
                <Text style={s.howNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.howStepTitle}>One event, one payment</Text>
                <Text style={s.howStepBody}>
                  Each plan covers a single event. No subscriptions, no auto-renewals — just pay once and you're set.
                </Text>
              </View>
            </View>
            <View style={s.howStep}>
              <View style={s.howNum}>
                <Text style={s.howNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.howStepTitle}>Confirm via {Platform.OS === "ios" ? "Apple" : "Google"} Pay</Text>
                <Text style={s.howStepBody}>
                  You'll see a final confirmation on the next screen. Nothing is charged until you approve.
                </Text>
              </View>
            </View>
            <View style={s.howStep}>
              <View style={s.howNum}>
                <Text style={s.howNumText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.howStepTitle}>Instant unlock</Text>
                <Text style={s.howStepBody}>
                  All premium features unlock immediately. Create your invitation, manage RSVPs, and more — right away.
                </Text>
              </View>
            </View>
          </View>

          {/* ── Trust badge ── */}
          <View style={s.trustBadge}>
            <View style={s.trustIcon}>
              <ShieldCheck color={C.success} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.trustTitle}>Secure payment</Text>
              <Text style={s.trustSub}>
                Cancel anytime before confirming. Payment processed securely via {Platform.OS === "ios" ? "Apple" : "Google"}.
              </Text>
            </View>
          </View>

          {/* Spacer for fixed footer */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* ── Footer ── */}
        <View style={[s.footer, { paddingBottom: 18 + Math.max(insets.bottom, 6) }]}>
          <PrimaryButton
            title={
              purchasing
                ? t("paywall_processing")
                : isFree
                ? "Get Started — Free"
                : `Pay ${tier.price} — One Time`
            }
            icon={isFree ? Sparkles : Crown}
            onPress={handlePurchase}
            disabled={purchasing}
          />
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.backToPlans}>
            <ChevronRight
              color="rgba(255,255,255,0.5)"
              size={14}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
            <Text style={s.backToPlansText}>Back to all plans</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { color: C.text, fontSize: 16, fontWeight: "600" as const },

  // Header
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },

  // Hero plan card
  heroCard: {
    marginTop: 10,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1.5,
    borderColor: C.gold,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.gold,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 4,
  },
  popularText: { color: "#0A0A0B", fontSize: 11, fontWeight: "800" as const, letterSpacing: 1 },
  planName: { color: C.text, fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5, marginTop: 4 },
  planBlurb: { color: "rgba(255,255,255,0.75)", fontSize: 14, textAlign: "center" },
  priceRow: { alignItems: "center", marginTop: 8 },
  price: { color: C.gold, fontSize: 40, fontWeight: "900" as const, letterSpacing: -1 },
  priceLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: -2, fontWeight: "600" as const },
  capacityRow: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
  capacityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  capacityText: { color: C.text, fontSize: 13, fontWeight: "600" as const },

  // Sections
  sectionTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800" as const,
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 12,
  },

  // Feature list
  featureList: {
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    gap: 14,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  featureLabel: { color: C.text, fontSize: 14, fontWeight: "700" as const, marginBottom: 2 },
  featureDesc: { color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 17 },
  featureDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 2 },

  // How it works
  howCard: {
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 18,
    gap: 16,
  },
  howStep: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  howNum: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  howNumText: { color: "#0A0A0B", fontSize: 14, fontWeight: "800" as const },
  howStepTitle: { color: C.text, fontSize: 14, fontWeight: "700" as const, marginBottom: 3 },
  howStepBody: { color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 18 },

  // Trust badge
  trustBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: "rgba(61,214,140,0.06)",
    borderWidth: 1,
    borderColor: "rgba(61,214,140,0.2)",
    padding: 14,
  },
  trustIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(61,214,140,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustTitle: { color: C.text, fontSize: 13, fontWeight: "700" as const, marginBottom: 2 },
  trustSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 17 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    backgroundColor: "rgba(10,10,11,0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  backToPlans: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  backToPlansText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" as const },
  backLink: { color: C.gold, fontSize: 14, fontWeight: "600" as const },
});
