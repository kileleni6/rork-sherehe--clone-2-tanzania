import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowRight, Check, Crown, Sparkles } from "lucide-react-native";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { OnboardShell } from "@/components/OnboardShell";
import { PrimaryButton } from "@/components/ui";
import { C } from "@/constants/colors";
import { useOnboarding } from "@/providers/OnboardingProvider";

const PERKS = [
  "Build elegant invitations in minutes",
  "Collect RSVPs and guest counts effortlessly",
  "Curate a shared, locked memory gallery",
];

export default function RoleScreen() {
  const router = useRouter();
  const { update, t } = useOnboarding();

  useEffect(() => {
    // Host-only flow — set role immediately so downstream logic is correct.
    update({ role: "host" }).catch(() => {});
  }, [update]);

  const next = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    await update({ role: "host" });
    router.push("/onboarding/notifications" as never);
  };

  return (
    <OnboardShell
      step={3}
      total={9}
      kicker="ROLE"
      title={t("who_are_you")}
      subtitle="You're setting SHEREHE up as a host. Guests don't need an account — they join through your invite link."
      footer={<PrimaryButton title={t("continue")} icon={ArrowRight} onPress={next} />}
    >
      <View style={styles.card}>
        <LinearGradient
          colors={[C.pinkHi, C.pinkDeep]}
          style={styles.iconWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Crown color={C.text} size={28} />
        </LinearGradient>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.title}>{t("role_host")}</Text>
          <Text style={styles.sub}>{t("role_host_sub")}</Text>
        </View>
        <View style={styles.check}>
          <Check color={C.text} size={14} />
        </View>
      </View>

      <View style={styles.perks}>
        {PERKS.map((p) => (
          <View key={p} style={styles.perkRow}>
            <View style={styles.perkDot}>
              <Sparkles color={C.gold} size={12} />
            </View>
            <Text style={styles.perkText}>{p}</Text>
          </View>
        ))}
      </View>
    </OnboardShell>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    backgroundColor: "rgba(255,45,122,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.pink,
  },
  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { color: C.text, fontWeight: "800" as const, fontSize: 19, letterSpacing: -0.3 },
  sub: { color: C.subtext, fontSize: 13, lineHeight: 18 },
  check: { width: 28, height: 28, borderRadius: 999, backgroundColor: C.pink, alignItems: "center", justifyContent: "center" },
  perks: { marginTop: 24, gap: 14, padding: 18, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.hair },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  perkDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(244,201,123,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(244,201,123,0.3)",
  },
  perkText: { color: C.text, fontSize: 14, flex: 1, fontWeight: "500" as const },
});
