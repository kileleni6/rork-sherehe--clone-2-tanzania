import type { LucideIcon } from "lucide-react-native";
import React, { memo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { C } from "@/constants/colors";
import { MOTION } from "@/constants/motion";
import { R, S } from "@/constants/spacing";
import { triggerHaptic } from "@/lib/haptics";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = memo(function TextField({
  label,
  error,
  icon: Icon,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const border = useRef(new Animated.Value(0)).current;

  const setFocusAnim = (on: boolean) => {
    Animated.timing(border, {
      toValue: on ? 1 : 0,
      duration: MOTION.fast,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = border.interpolate({
    inputRange: [0, 1],
    outputRange: [C.hair, C.pinkHi],
  });

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View style={[styles.field, { borderColor }, error ? styles.fieldError : null]}>
        {Icon ? (
          <View style={styles.icon}>
            <Icon color={focused ? C.pinkHi : C.mute} size={18} />
          </View>
        ) : null}
        <TextInput
          {...rest}
          placeholderTextColor={C.mute}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            setFocusAnim(true);
            triggerHaptic("selection");
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            setFocusAnim(false);
            onBlur?.(e);
          }}
        />
      </Animated.View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: S.sm },
  label: { color: C.subtext, fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.3 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1.5,
    paddingHorizontal: S.lg,
    minHeight: 52,
  },
  fieldError: { borderColor: C.danger },
  icon: { marginRight: S.sm },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    paddingVertical: S.md,
  },
  error: { color: C.danger, fontSize: 12, marginTop: 2 },
});
