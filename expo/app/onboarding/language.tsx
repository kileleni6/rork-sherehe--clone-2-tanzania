import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ArrowRight, Check, Search } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { OnboardShell } from "@/components/OnboardShell";
import { PrimaryButton } from "@/components/ui";
import { C } from "@/constants/colors";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { useOnboarding } from "@/providers/OnboardingProvider";

export default function LanguageScreen() {
  const router = useRouter();
  const { language, update, t } = useOnboarding();
  const [selected, setSelected] = useState<LangCode>(language);
  const [q, setQ] = useState<string>("");

  const filtered = useMemo(() => {
    if (!q.trim()) return LANGUAGES;
    const s = q.trim().toLowerCase();
    return LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(s) || l.native.toLowerCase().includes(s)
    );
  }, [q]);

  const choose = (code: LangCode) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setSelected(code);
  };

  const next = async () => {
    await update({ language: selected });
    router.push("/onboarding/role" as never);
  };

  return (
    <OnboardShell
      step={2}
      total={9}
      kicker="LANGUAGE"
      title={t("choose_language")}
      subtitle={t("language_sub")}
      footer={<PrimaryButton title={t("continue")} icon={ArrowRight} onPress={next} />}
    >
      <View style={styles.search}>
        <Search color={C.mute} size={16} />
        <TextInput
          placeholder={t("search")}
          placeholderTextColor={C.mute}
          value={q}
          onChangeText={setQ}
          style={styles.searchInput}
        />
      </View>
      <View style={{ gap: 8, marginTop: 14 }}>
        {filtered.map((l) => {
          const active = selected === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => choose(l.code)}
              style={[styles.row, active ? styles.rowActive : null]}
            >
              <Text style={styles.flag}>{l.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{l.native}</Text>
                <Text style={styles.sub}>{l.name}</Text>
              </View>
              {active ? (
                <View style={styles.check}>
                  <Check color={C.text} size={14} />
                </View>
              ) : (
                <View style={styles.checkEmpty} />
              )}
            </Pressable>
          );
        })}
      </View>
    </OnboardShell>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
  },
  rowActive: { borderColor: C.pink, backgroundColor: "rgba(255,45,122,0.08)" },
  flag: { fontSize: 26 },
  name: { color: C.text, fontWeight: "700" as const, fontSize: 15 },
  sub: { color: C.mute, fontSize: 12, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: C.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  checkEmpty: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.hair,
  },
});
