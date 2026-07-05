import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { C } from "@/constants/colors";
import { MOTION } from "@/constants/motion";
import { R } from "@/constants/spacing";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shimmer pulse placeholder for loading states. */
export function Skeleton({ width = "100%", height = 16, borderRadius = R.md, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.65, duration: MOTION.slow, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: MOTION.slow, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, opacity: pulse },
        style,
      ]}
    />
  );
}

export function EventRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={76} height={76} borderRadius={R.lg} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="50%" height={12} />
        <Skeleton width="40%" height={10} />
      </View>
    </View>
  );
}

export function HeroSkeleton() {
  return <Skeleton width="100%" height={380} borderRadius={R.xxl} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: C.cardHi },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    padding: 12,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.hair,
  },
});
