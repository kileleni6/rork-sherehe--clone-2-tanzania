import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Apple, ShieldCheck, Sparkles } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardShell } from "@/components/OnboardShell";
import { C } from "@/constants/colors";
import { signInWithProvider, type OAuthProvider } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useOnboarding } from "@/providers/OnboardingProvider";

function GoogleG() {
  return (
    <View style={styles.gIcon}>
      <Text style={{ fontWeight: "900" as const, color: "#1A1A1A", fontSize: 14 }}>G</Text>
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { update, t } = useOnboarding();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const finish = async (method: OAuthProvider | "guest") => {
    await update({ authed: method !== "guest", authMethod: method, completed: true });
    router.replace("/(tabs)" as never);
  };

  const pick = async (method: OAuthProvider) => {
    if (busy) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});

    if (!isSupabaseConfigured) {
      Alert.alert(
        "Sign-in unavailable",
        "Supabase is not configured. You can continue without an account for now.",
      );
      return;
    }

    setBusy(method);
    try {
      const result = await signInWithProvider(method);
      if (result.ok) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        await finish(method);
      } else if (!result.cancelled) {
        Alert.alert("Sign-in failed", result.error ?? "Please try again.");
      }
    } finally {
      setBusy(null);
    }
  };

  const skip = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    await finish("guest");
  };

  return (
    <OnboardShell
      step={8}
      total={9}
      kicker="ACCOUNT"
      title={t("sign_in")}
      subtitle="Sign in to save events across devices and keep your guest lists safe."
    >
      <View style={styles.hero}>
        <LinearGradient
          colors={[C.pinkHi, C.pinkDeep]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Sparkles color={C.gold} size={28} />
        <Text style={styles.heroTitle}>Almost there</Text>
        <Text style={styles.heroSub}>One tap to secure your account and unlock cloud sync.</Text>
      </View>

      <View style={{ gap: 12, marginTop: 22 }}>
        <Pressable
          onPress={() => pick("google")}
          disabled={!!busy}
          style={[styles.btn, { backgroundColor: C.text }, busy && busy !== "google" ? { opacity: 0.5 } : null]}
        >
          {busy === "google" ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <>
              <GoogleG />
              <Text style={[styles.btnText, { color: "#1A1A1A" }]}>{t("cont_google")}</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => pick("apple")}
          disabled={!!busy}
          style={[styles.btn, { backgroundColor: "#000", borderWidth: 1, borderColor: C.hair }, busy && busy !== "apple" ? { opacity: 0.5 } : null]}
        >
          {busy === "apple" ? (
            <ActivityIndicator color={C.text} />
          ) : (
            <>
              <Apple color={C.text} size={20} fill={C.text} />
              <Text style={[styles.btnText, { color: C.text }]}>{t("cont_apple")}</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={skip} disabled={!!busy} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 10 }}>
          <Text style={styles.skip}>Continue without an account</Text>
        </Pressable>
      </View>

      <View style={styles.trust}>
        <View style={styles.trustIcon}>
          <ShieldCheck color={C.success} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.trustTitle}>Private by default</Text>
          <Text style={styles.trustSub}>
            We never post on your behalf. Your guest list, photos and RSVPs stay in your event.
          </Text>
        </View>
      </View>

      <Text style={styles.legal}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </OnboardShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 22,
    padding: 22,
    overflow: "hidden",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(244,201,123,0.3)",
  },
  heroTitle: { color: C.text, fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.5, textAlign: "center", marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center", lineHeight: 18, paddingHorizontal: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 54,
  },
  btnText: { fontSize: 15, fontWeight: "700" as const },
  gIcon: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: C.text,
    borderWidth: 1.5,
    borderColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  skip: { color: C.subtext, fontSize: 13, fontWeight: "600" as const, textDecorationLine: "underline" },
  trust: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hair,
    padding: 16,
    marginTop: 22,
  },
  trustIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(61,214,140,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustTitle: { color: C.text, fontWeight: "700" as const, fontSize: 14, marginBottom: 2 },
  trustSub: { color: C.subtext, fontSize: 12, lineHeight: 17 },
  legal: { color: C.mute, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 22, paddingHorizontal: 12 },
});
