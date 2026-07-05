import { Link, Stack } from "expo-router";
import { Sparkles } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { C } from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Lost invite" }} />
      <View style={s.container}>
        <View style={s.circle}>
          <Sparkles color={C.pinkHi} size={32} />
        </View>
        <Text style={s.title}>This invite doesn't exist</Text>
        <Text style={s.sub}>The link may have expired or been removed.</Text>
        <Link href="/(tabs)" style={s.link}>
          <Text style={s.linkText}>Back to events</Text>
        </Link>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, gap: 12, padding: 24 },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { color: C.text, fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.3, textAlign: "center" },
  sub: { color: C.subtext, fontSize: 14, textAlign: "center" },
  link: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 22, backgroundColor: C.pink, borderRadius: 999 },
  linkText: { color: C.text, fontWeight: "700" as const, fontSize: 14 },
});
