import type { LucideIcon } from "lucide-react-native";
import React, { memo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/pressable/PressableScale";
import { C } from "@/constants/colors";
import { R, S } from "@/constants/spacing";

interface ActionTileProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Quick action tile for event dashboards. */
export const ActionTile = memo(function ActionTile({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
  style,
}: ActionTileProps) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      pressedScale={0.97}
      style={[styles.tile, style]}
    >
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={18} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: R.xl,
    padding: S.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: "flex-start",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: C.text, fontWeight: "700" as const, fontSize: 13 },
  sub: { color: C.subtext, fontSize: 11 },
});
