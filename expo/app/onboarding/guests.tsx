import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowRight, Building2, Users } from "lucide-react-native";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardShell } from "@/components/OnboardShell";
import { PrimaryButton } from "@/components/ui";
import { C } from "@/constants/colors";
import { useOnboarding } from "@/providers/OnboardingProvider";

interface GuestRange {
  label: string;
  min: number;
  max: number | null;
  planName: string;
  planPrice: string;
  tierId: string;
}

const RANGES: GuestRange[] = [
  { label: "0 – 5 guests", min: 0, max: 5, planName: "Starter", planPrice: "Free", tierId: "starter" },
  { label: "6 – 100 guests", min: 6, max: 100, planName: "Celebration", planPrice: "$24.99", tierId: "celebration" },
  { label: "101 – 250 guests", min: 101, max: 250, planName: "Premium Event", planPrice: "$89.99", tierId: "premium" },
  { label: "251 – 500 guests", min: 251, max: 500, planName: "Large Event", planPrice: "$149.99", tierId: "large" },
  { label: "501 – 1,000 guests", min: 501, max: 1000, planName: "Enterprise Event", planPrice: "$299.99", tierId: "enterprise" },
  { label: "1,001 – 2,000 guests", min: 1001, max: 2000, planName: "Super Event", planPrice: "$499.99", tierId: "super" },
  { label: "2,000+ guests", min: 2001, max: null, planName: "Custom Enterprise", planPrice: "Contact Us", tierId: "enterprise_custom" },
];

export default function GuestsScreen() {
  const router = useRouter();
  const { update, t } = useOnboarding();
  const [selected, setSelected] = useState<number | null>(null);

  const range = selected !== null ? RANGES[selected] : null;

  const next = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    if (range) {
      await update({
        interests: range.tierId ? [range.tierId] : [],
      } as Partial<import("@/providers/OnboardingProvider").OnboardingState>);
    }
    // Pass the tierId as a param so the paywall can pre-select
    router.push({
      pathname: "/onboarding/paywall" as never,
      params: { guestTier: range?.tierId ?? "" } as never,
    });
  };

  return (
    <OnboardShell
      step={7}
      total={9}
      kicker="GUESTS"
      title="How many guests do you expect?"
      subtitle="This helps us recommend the right plan for your event. You can always change it later."
      footer={
        <PrimaryButton
          title={selected !== null ? t("continue") : t("select_option")}
          icon={ArrowRight}
          onPress={next}
          disabled={selected === null}
        />
      }
    >
      <View style={styles.rangeList}>
        {RANGES.map((r, i) => {
          const active = selected === i;
          return (
            <Pressable
              key={r.label}
              onPress={() => setSelected(i)}
              style={[styles.rangeCard, active ? styles.rangeCardActive : null]}
            >
              <View style={styles.rangeHeader}>
                <View style={[styles.rangeIcon, active ? styles.rangeIconActive : null]}>
                  {r.max === null ? (
                    <Building2 color={active ? C.text : C.gold} size={18} />
                  ) : (
                    <Users color={active ? C.text : C.subtext} size={18} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rangeLabel}>{r.label}</Text>
                </View>
                <View style={styles.rangePlan}>
                  <Text style={[styles.rangePlanName, active ? { color: C.gold } : null]}>
                    {r.planName}
                  </Text>
                  <Text style={[styles.rangePlanPrice, active ? { color: C.text } : null]}>
                    {r.planPrice}
                  </Text>
                </View>
              </View>
              {active ? (
                <LinearGradient
                  colors={["rgba(244,201,123,0.08)", "rgba(244,201,123,0.02)"]}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </OnboardShell>
  );
}

const styles = StyleSheet.create({
  rangeList: { gap: 10, marginTop: 4 },
  rangeCard: {
    flexDirection: "column",
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.hair,
    overflow: "hidden",
  },
  rangeCardActive: { borderColor: C.gold, backgroundColor: "rgba(244,201,123,0.04)" },
  rangeHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  rangeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  rangeIconActive: { backgroundColor: C.pink },
  rangeLabel: { color: C.text, fontSize: 15, fontWeight: "700" as const },
  rangePlan: { alignItems: "flex-end" },
  rangePlanName: { color: C.subtext, fontSize: 12, fontWeight: "600" as const },
  rangePlanPrice: { color: C.subtext, fontSize: 13, fontWeight: "800" as const, marginTop: 1 },
});
