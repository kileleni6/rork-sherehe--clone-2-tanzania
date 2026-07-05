import type { LucideIcon } from "lucide-react-native";
import React, { memo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/pressable/PressableScale";
import { ToastActionButton } from "@/components/feedback/Toast";
import { C } from "@/constants/colors";
import { R, S } from "@/constants/spacing";
import { T } from "@/constants/typography";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void; icon?: LucideIcon };
  secondaryAction?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

export const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
  secondaryAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconRing}>
        <Icon color={C.pinkHi} size={28} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <ToastActionButton title={action.label} onPress={action.onPress} icon={action.icon} />
      ) : null}
      {secondaryAction ? (
        <PressableScale onPress={secondaryAction.onPress} haptic="light" style={styles.secondary}>
          <Text style={styles.secondaryText}>{secondaryAction.label}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: S.xxxl,
    paddingHorizontal: S.xl,
    gap: S.sm,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: R.xxl,
    backgroundColor: "rgba(255,45,122,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,45,122,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S.sm,
  },
  title: { ...T.label, fontSize: 16, textAlign: "center" as const },
  subtitle: { ...T.caption, textAlign: "center" as const, maxWidth: 280 },
  secondary: {
    marginTop: S.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.hair,
  },
  secondaryText: { color: C.text, fontSize: 14, fontWeight: "600" as const },
});
