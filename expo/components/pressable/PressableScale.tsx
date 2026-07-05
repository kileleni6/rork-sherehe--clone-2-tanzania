import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { MOTION } from "@/constants/motion";
import { triggerHaptic, type HapticKind } from "@/lib/haptics";

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Target scale when pressed (default 0.97). */
  pressedScale?: number;
  /** Opacity when pressed (default 0.92). Set to 1 to disable. */
  pressedOpacity?: number;
  /** Haptic on press-in. Pass false to disable. */
  haptic?: HapticKind | false;
}

/** Premium press feedback with spring scale + optional haptic. */
export function PressableScale({
  children,
  style,
  pressedScale = 0.97,
  pressedOpacity = 0.92,
  haptic = "selection",
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale: number, toOpacity: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: toScale,
        useNativeDriver: true,
        ...MOTION.pressSpring,
      }),
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration: MOTION.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={(e) => {
        onPress?.(e);
      }}
      onPressIn={(e) => {
        if (!disabled && haptic) triggerHaptic(haptic);
        if (!disabled) animateTo(pressedScale, pressedOpacity);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1, 1);
        onPressOut?.(e);
      }}
      style={({ pressed: _ }) => [{ opacity: disabled ? 0.5 : 1 }]}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
