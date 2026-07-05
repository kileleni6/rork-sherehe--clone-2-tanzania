import type { LucideIcon } from "lucide-react-native";
import React, { memo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/pressable/PressableScale";
import { C } from "@/constants/colors";
import type { HapticKind } from "@/lib/haptics";

interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  variant?: "ghost" | "filled" | "glass";
  haptic?: HapticKind | false;
  testID?: string;
}

export const IconButton = memo(function IconButton({
  icon: Icon,
  onPress,
  size = 42,
  iconSize = 20,
  color = C.text,
  style,
  variant = "ghost",
  haptic = "light",
  testID,
}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      haptic={haptic}
      pressedScale={0.94}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === "filled" && styles.filled,
        variant === "glass" && styles.glass,
        variant === "ghost" && styles.ghost,
        style,
      ]}
      testID={testID}
      hitSlop={6}
    >
      <Icon color={color} size={iconSize} />
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
  },
  filled: {
    backgroundColor: C.cardHi,
  },
  glass: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
});
