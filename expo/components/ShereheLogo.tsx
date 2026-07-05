import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { C } from "@/constants/colors";

interface Props {
  size?: number;
  showWordmark?: boolean;
}

/**
 * SHEREHE app mark — a tilted squircle in pink→magenta gradient,
 * with a serif italic "S" monogram, a gold sparkle dot on the top-right,
 * and confetti specks. Designed as the app's distinctive first impression.
 */
export const ShereheLogo = memo(function ShereheLogo({ size = 96, showWordmark = false }: Props) {
  const r = size * 0.28;
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <View style={{ width: size * 1.25, height: size * 1.25, alignItems: "center", justifyContent: "center" }}>
        {/* Glow halo */}
        <View
          style={{
            position: "absolute",
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: 999,
            backgroundColor: C.pink,
            opacity: 0.18,
          }}
        />

        {/* Tilted squircle body */}
        <LinearGradient
          colors={[C.pinkHi, C.pinkDeep, C.magenta]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: r,
            transform: [{ rotate: "-8deg" }],
            alignItems: "center",
            justifyContent: "center",
            shadowColor: C.pink,
            shadowOpacity: 0.55,
            shadowRadius: size * 0.28,
            shadowOffset: { width: 0, height: size * 0.1 },
            elevation: 12,
          }}
        >
          {/* Inner gloss highlight */}
          <LinearGradient
            colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              top: size * 0.06,
              left: size * 0.06,
              right: size * 0.4,
              bottom: size * 0.4,
              borderRadius: r * 0.7,
            }}
          />

          <Text
            style={{
              color: C.ivory,
              fontSize: size * 0.62,
              fontWeight: "900" as const,
              fontStyle: "italic" as const,
              letterSpacing: -2,
              transform: [{ rotate: "8deg" }, { translateY: -size * 0.02 }],
              textShadowColor: "rgba(0,0,0,0.25)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
            }}
          >
            S
          </Text>
        </LinearGradient>

        {/* Gold sparkle bead — top right */}
        <View
          style={{
            position: "absolute",
            top: size * 0.04,
            right: size * 0.04,
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: 999,
            backgroundColor: C.gold,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: C.gold,
            shadowOpacity: 0.8,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <View
            style={{
              width: size * 0.09,
              height: size * 0.09,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.85)",
            }}
          />
        </View>

        {/* Confetti specks */}
        <View style={[styles.dot, { top: size * 0.18, left: size * 0.02, width: 6, height: 6, backgroundColor: C.gold }]} />
        <View style={[styles.dot, { bottom: size * 0.18, right: size * 0.16, width: 4, height: 4, backgroundColor: C.rose }]} />
        <View style={[styles.dot, { bottom: size * 0.04, left: size * 0.32, width: 5, height: 5, backgroundColor: C.text }]} />
        <View style={[styles.dot, { top: size * 0.55, right: size * 0.02, width: 3, height: 3, backgroundColor: C.pinkHi }]} />
      </View>

      {showWordmark ? (
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text
            style={{
              color: C.text,
              fontSize: Math.max(28, size * 0.42),
              fontWeight: "800" as const,
              letterSpacing: 6,
            }}
          >
            SHEREHE
          </Text>
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: C.gold }} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  dot: { position: "absolute", borderRadius: 999 },
});
