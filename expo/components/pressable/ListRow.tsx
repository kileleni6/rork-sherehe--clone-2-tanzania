import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import React, { memo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/pressable/PressableScale";
import { C } from "@/constants/colors";
import { R, S } from "@/constants/spacing";
import type { HapticKind } from "@/lib/haptics";

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: HapticKind | false;
}

export const ListRow = memo(function ListRow({
  title,
  subtitle,
  icon: Icon,
  iconColor = C.pinkHi,
  onPress,
  showChevron = !!onPress,
  trailing,
  style,
  haptic = "selection",
}: ListRowProps) {
  const content = (
    <>
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon color={iconColor} size={18} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (showChevron ? <ChevronRight color={C.mute} size={18} /> : null)}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, style]}>{content}</View>;
  }

  return (
    <PressableScale onPress={onPress} haptic={haptic} style={[styles.row, style]}>
      {content}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    padding: S.lg,
    backgroundColor: C.card,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.hair,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    backgroundColor: "rgba(255,45,122,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  title: { color: C.text, fontWeight: "700" as const, fontSize: 14 },
  subtitle: { color: C.subtext, fontSize: 12, lineHeight: 17 },
});
