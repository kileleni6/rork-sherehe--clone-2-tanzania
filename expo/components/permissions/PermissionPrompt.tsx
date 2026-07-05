import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ListRow } from "@/components/pressable/ListRow";
import { C } from "@/constants/colors";
import { R, S } from "@/constants/spacing";
import { T } from "@/constants/typography";

interface BenefitRow {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

interface PermissionPromptProps {
  icon: LucideIcon;
  iconGradient?: [string, string];
  title: string;
  subtitle: string;
  benefits: BenefitRow[];
  privacyNote?: string;
}

/** Pre-permission explainer — show before system dialog. */
export const PermissionPrompt = memo(function PermissionPrompt({
  icon: HeroIcon,
  iconGradient = [C.pinkHi, C.pinkDeep],
  title,
  subtitle,
  benefits,
  privacyNote,
}: PermissionPromptProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.heroWrap}>
        <LinearGradient colors={["rgba(255,45,122,0.18)", "rgba(255,45,122,0)"]} style={styles.heroGlow} />
        <LinearGradient colors={iconGradient} style={styles.heroIcon}>
          <HeroIcon color={C.text} size={40} />
        </LinearGradient>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.benefits}>
        {benefits.map((b) => (
          <ListRow key={b.title} icon={b.icon} title={b.title} subtitle={b.subtitle} showChevron={false} />
        ))}
      </View>

      {privacyNote ? (
        <View style={styles.privacy}>
          <Text style={styles.privacyText}>{privacyNote}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: S.md },
  heroWrap: { alignItems: "center", paddingVertical: S.xl },
  heroGlow: { position: "absolute", width: 220, height: 220, borderRadius: R.pill },
  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: R.xxl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.pink,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  title: { ...T.sectionTitle, fontSize: 18, textAlign: "center" as const },
  subtitle: { ...T.body, textAlign: "center" as const, marginTop: -4 },
  benefits: { gap: S.sm, marginTop: S.sm },
  privacy: {
    padding: S.lg,
    backgroundColor: "rgba(61,214,140,0.08)",
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: "rgba(61,214,140,0.22)",
  },
  privacyText: { ...T.caption, color: C.subtext, lineHeight: 19 },
});
