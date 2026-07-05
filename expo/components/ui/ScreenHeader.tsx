import { ChevronLeft } from "lucide-react-native";
import React, { memo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { IconButton } from "@/components/pressable/IconButton";
import { C } from "@/constants/colors";
import { S } from "@/constants/spacing";

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Consistent screen top bar with premium back button. */
export const ScreenHeader = memo(function ScreenHeader({
  title,
  onBack,
  right,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.bar, style]}>
      {onBack ? (
        <IconButton icon={ChevronLeft} onPress={onBack} variant="glass" iconSize={22} haptic="light" />
      ) : (
        <View style={styles.spacer} />
      )}
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right ?? <View style={styles.spacer} />}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    gap: S.sm,
  },
  spacer: { width: 42 },
  title: {
    flex: 1,
    color: C.text,
    fontWeight: "700" as const,
    fontSize: 16,
    textAlign: "center",
  },
});
