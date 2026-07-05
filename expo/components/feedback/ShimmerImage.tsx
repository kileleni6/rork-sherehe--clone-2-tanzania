import { Image } from "expo-image";
import React, { useRef, useState } from "react";
import { Animated, StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";

import { C } from "@/constants/colors";
import { MOTION } from "@/constants/motion";
import { R } from "@/constants/spacing";
import { Skeleton } from "@/components/feedback/Skeleton";

interface ShimmerImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  borderRadius?: number;
}

/** Image with skeleton placeholder and fade-in reveal. */
export function ShimmerImage({ uri, style, borderRadius = R.lg }: ShimmerImageProps) {
  const [loaded, setLoaded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: MOTION.normal,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[styles.wrap, style, { borderRadius }]}>
      {!loaded ? (
        <Skeleton height="100%" borderRadius={borderRadius} style={StyleSheet.absoluteFillObject} />
      ) : null}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity }]}>
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
          contentFit="cover"
          transition={MOTION.normal}
          onLoad={onLoad}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: C.cardHi },
});
