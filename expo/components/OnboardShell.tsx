import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { memo, useEffect, useRef } from "react";
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { FadeInView } from "@/components/feedback/FadeInView";
import { IconButton } from "@/components/pressable/IconButton";
import { C } from "@/constants/colors";
import { S } from "@/constants/spacing";
import { T } from "@/constants/typography";

interface Props {
  step: number;
  total: number;
  kicker?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

function ProgressPip({ active }: { active: boolean }) {
  const opacity = useRef(new Animated.Value(active ? 1 : 0.35)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: active ? 1 : 0.35,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [active, opacity]);

  return (
    <Animated.View
      style={[
        styles.pip,
        { opacity, backgroundColor: active ? C.pink : C.hair },
      ]}
    />
  );
}

export const OnboardShell = memo(function OnboardShell({
  step,
  total,
  kicker,
  title,
  subtitle,
  children,
  footer,
  showBack = true,
  onBack,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const back = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(255,45,122,0.18)", "rgba(10,10,11,0)", "rgba(10,10,11,0)"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          {showBack && step > 1 ? (
            <IconButton icon={ChevronLeft} onPress={back} haptic="light" />
          ) : (
            <View style={{ width: 42 }} />
          )}
          <View style={styles.progressRow}>
            {Array.from({ length: total }, (_, i) => (
              <ProgressPip key={i} active={i < step} />
            ))}
          </View>
          <View style={styles.stepBadge}>
            <Text style={styles.stepCount}>
              {step}/{total}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
        >
          <ScrollView
            contentContainerStyle={{ padding: S.xxl, paddingBottom: 40, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <FadeInView delay={40}>
              {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </FadeInView>
            <FadeInView delay={100} style={{ marginTop: S.xxl, flex: 1 }}>
              {children}
            </FadeInView>
          </ScrollView>

          {footer ? (
            <View style={[styles.footer, { paddingBottom: S.lg + Math.max(insets.bottom, 8) }]}>
              {footer}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg - 2,
    paddingVertical: S.sm,
  },
  stepBadge: {
    minWidth: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCount: { color: C.mute, fontSize: 12, fontWeight: "700" as const },
  progressRow: { flexDirection: "row", gap: 5, flex: 1, marginHorizontal: S.sm + 2, height: 3 },
  pip: { flex: 1, height: 3, borderRadius: 4 },
  kicker: { ...T.kicker, marginBottom: S.sm + 2 },
  title: { ...T.screenTitle },
  subtitle: { ...T.body, marginTop: S.sm + 2 },
  footer: {
    paddingHorizontal: S.xl,
    paddingTop: S.lg,
    gap: S.sm + 2,
    borderTopWidth: 1,
    borderTopColor: C.hair,
    backgroundColor: "rgba(10,10,11,0.94)",
  },
});
