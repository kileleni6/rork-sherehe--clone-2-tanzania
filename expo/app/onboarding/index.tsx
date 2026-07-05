import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShereheLogo } from "@/components/ShereheLogo";
import { PrimaryButton } from "@/components/ui";
import { C } from "@/constants/colors";
import { useOnboarding } from "@/providers/OnboardingProvider";

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useOnboarding();

  const start = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push("/onboarding/language" as never);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[C.pinkDeep, "#1A0410", C.bg]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <View style={styles.center}>
          <ShereheLogo size={104} showWordmark />
          <Text style={styles.tag}>{t("welcome_tag")}</Text>

          <View style={styles.previewWrap}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.previewCard,
                  {
                    transform: [
                      { rotate: `${(i - 1) * 6}deg` },
                      { translateY: i * 4 },
                    ],
                    zIndex: 3 - i,
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    i === 0
                      ? [C.pinkHi, C.pinkDeep]
                      : i === 1
                      ? ["#1A0410", "#3D0A24"]
                      : ["#F8D9E5", "#F4C97B"]
                  }
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={[styles.previewLabel, { color: i === 2 ? "#1A1A1A" : C.text }]}>
                  {i === 0 ? "Save the date" : i === 1 ? "You're invited" : "Celebrate"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton title={t("get_started")} icon={ArrowRight} onPress={start} />
          <Text style={styles.fineprint}>Hosts only. Guests join by invite link — no signup needed.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 28 },
  tag: {
    color: C.subtext,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: -8,
  },
  previewWrap: {
    height: 200,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  previewCard: {
    position: "absolute",
    width: 160,
    height: 200,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 2,
  },
  footer: { padding: 24, gap: 14, alignItems: "center" },
  fineprint: { color: C.mute, fontSize: 12, textAlign: "center" },
});
