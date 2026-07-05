import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import React, { memo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { PressableScale } from "@/components/pressable/PressableScale";
import { C } from "@/constants/colors";
import { R, S } from "@/constants/spacing";
import { T } from "@/constants/typography";
import type { HapticKind } from "@/lib/haptics";

// Re-export premium UI primitives
export { PressableScale } from "@/components/pressable/PressableScale";
export { IconButton } from "@/components/pressable/IconButton";
export { ListRow } from "@/components/pressable/ListRow";
export { EmptyState } from "@/components/feedback/EmptyState";
export { Skeleton, EventRowSkeleton, HeroSkeleton } from "@/components/feedback/Skeleton";
export { FadeInView } from "@/components/feedback/FadeInView";
export { ShimmerImage } from "@/components/feedback/ShimmerImage";
export { ToastProvider, useToast, ToastActionButton } from "@/components/feedback/Toast";
export { PermissionPrompt } from "@/components/permissions/PermissionPrompt";
export { TextField } from "@/components/ui/TextField";
export { KeyboardAwareScroll } from "@/components/ui/KeyboardAwareScroll";
export { ScreenHeader } from "@/components/ui/ScreenHeader";
export { ActionTile } from "@/components/ui/ActionTile";

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  haptic?: HapticKind | false;
}

export const PrimaryButton = memo(function PrimaryButton({
  title,
  onPress,
  icon: Icon,
  disabled,
  loading,
  style,
  testID,
  haptic = "light",
}: PrimaryButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      pressedScale={0.98}
      testID={testID}
      style={[styles.btnWrap, style]}
    >
      <LinearGradient
        colors={[C.pinkHi, C.pink, C.pinkDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        {loading ? (
          <ActivityIndicator color={C.text} size="small" />
        ) : Icon ? (
          <Icon color={C.text} size={18} />
        ) : null}
        <Text style={styles.btnText}>{loading ? "…" : title}</Text>
      </LinearGradient>
    </PressableScale>
  );
});

interface GhostButtonProps {
  title: string;
  onPress?: () => void;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
  haptic?: HapticKind | false;
}

export const GhostButton = memo(function GhostButton({
  title,
  onPress,
  icon: Icon,
  style,
  haptic = "selection",
}: GhostButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      haptic={haptic}
      pressedScale={0.98}
      pressedOpacity={0.88}
      style={[styles.ghost, style]}
    >
      {Icon ? <Icon color={C.text} size={18} /> : null}
      <Text style={styles.ghostText}>{title}</Text>
    </PressableScale>
  );
});

export const Card = memo(function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <PressableScale onPress={onPress} haptic="selection" pressedScale={0.99} style={[styles.card, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
});

export const Chip = memo(function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      pressedScale={0.96}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      {icon ? <Text style={styles.chipEmoji}>{icon}</Text> : null}
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </PressableScale>
  );
});

export function GlassBar({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <BlurView intensity={40} tint="dark" style={[styles.glassBar, style]}>
      {children}
    </BlurView>
  );
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function Hair() {
  return <View style={styles.hair} />;
}

export function Tag({ label, tone = "pink" }: { label: string; tone?: "pink" | "gold" | "mute" | "success" }) {
  const colorMap = {
    pink: { bg: "rgba(255,45,122,0.14)", fg: C.pinkHi },
    gold: { bg: "rgba(244,201,123,0.14)", fg: C.gold },
    mute: { bg: "rgba(255,255,255,0.06)", fg: C.subtext },
    success: { bg: "rgba(61,214,140,0.14)", fg: C.success },
  } as const;
  const c = colorMap[tone];
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.tagText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btnWrap: {
    borderRadius: R.pill,
    overflow: "hidden",
    shadowColor: C.pink,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
  },
  btnText: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
  ghost: {
    borderRadius: R.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  ghostText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: R.xxl,
    padding: S.lg + 2,
    borderWidth: 1,
    borderColor: C.hair,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: R.pill,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: C.hair,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipActive: {
    backgroundColor: C.pink,
    borderColor: C.pink,
  },
  chipEmoji: { fontSize: 14 },
  chipText: { color: C.subtext, fontSize: 13, fontWeight: "600" as const },
  chipTextActive: { color: C.text },
  glassBar: {
    overflow: "hidden",
    borderRadius: R.xxl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sectionTitle: { ...T.sectionTitle },
  hair: { height: 1, backgroundColor: C.hair, marginVertical: S.sm },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: R.pill,
    alignSelf: "flex-start",
  },
  tagText: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.4, textTransform: "uppercase" },
});
