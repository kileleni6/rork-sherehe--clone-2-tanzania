import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ArrowRight, Check, Plus, X } from "lucide-react-native";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { OnboardShell } from "@/components/OnboardShell";
import { GhostButton, PrimaryButton } from "@/components/ui";
import { C } from "@/constants/colors";
import { useOnboarding } from "@/providers/OnboardingProvider";

const OPTIONS = [
  { id: "wedding", emoji: "💍", label: "Weddings" },
  { id: "birthday", emoji: "🎂", label: "Birthdays" },
  { id: "baby", emoji: "👶", label: "Baby showers" },
  { id: "graduation", emoji: "🎓", label: "Graduations" },
  { id: "corporate", emoji: "🏢", label: "Corporate" },
  { id: "vacation", emoji: "🏝️", label: "Travel" },
  { id: "engagement", emoji: "💎", label: "Engagement" },
  { id: "religious", emoji: "🕊️", label: "Religious" },
  { id: "concert", emoji: "🎤", label: "Concerts" },
  { id: "festival", emoji: "🎪", label: "Festivals" },
  { id: "private", emoji: "🥂", label: "Private" },
  { id: "brand", emoji: "✨", label: "Brand" },
];

export default function InterestsScreen() {
  const router = useRouter();
  const { interests, update, t } = useOnboarding();
  const initial = interests[0] ?? "";
  const [picked, setPicked] = useState<string>(initial);
  const [draft, setDraft] = useState<string>("");

  const choose = (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setPicked(id);
  };

  const addCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setPicked(`custom:${trimmed}`);
    setDraft("");
  };

  const clearCustom = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setPicked("");
  };

  const next = async () => {
    await update({ interests: picked ? [picked] : [] });
    router.push("/onboarding/guests" as never);
  };

  const skip = async () => {
    await update({ interests: [] });
    router.push("/onboarding/guests" as never);
  };

  const customLabel = picked.startsWith("custom:") ? picked.slice(7) : null;

  return (
    <OnboardShell
      step={6}
      total={9}
      kicker="INTERESTS"
      title={t("interests_title")}
      subtitle={t("interests_sub")}
      footer={
        <View style={{ gap: 10 }}>
          <PrimaryButton
            title={t("continue")}
            icon={ArrowRight}
            onPress={next}
            disabled={!picked}
          />
          <GhostButton title={t("skip_now")} onPress={skip} />
        </View>
      }
    >
      <View style={styles.grid}>
        {OPTIONS.map((o) => {
          const active = picked === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => choose(o.id)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={styles.emoji}>{o.emoji}</Text>
              <Text style={[styles.label, active ? { color: C.text } : null]}>{o.label}</Text>
              {active ? (
                <View style={styles.tick}>
                  <Check color={C.text} size={10} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.customSection}>
        <Text style={styles.sectionLabel}>Add your own</Text>
        <Text style={styles.sectionHint}>
          Got a category we missed? Add it here — you'll be able to pick it when you create an event.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. Reunion, Anniversary…"
            placeholderTextColor={C.mute}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={addCustom}
            maxLength={28}
          />
          <Pressable
            onPress={addCustom}
            disabled={!draft.trim()}
            style={[styles.addBtn, !draft.trim() ? { opacity: 0.4 } : null]}
          >
            <Plus color={C.text} size={16} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {customLabel ? (
          <View style={styles.customsWrap}>
            <View style={styles.customChip}>
              <Check color={C.text} size={14} />
              <Text style={styles.customChipText} numberOfLines={1}>
                {customLabel}
              </Text>
              <Pressable onPress={clearCustom} hitSlop={6}>
                <X color={C.text} size={14} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </OnboardShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    width: "31%",
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: "center",
    gap: 6,
  },
  chipActive: { backgroundColor: "rgba(255,45,122,0.12)", borderColor: C.pink },
  emoji: { fontSize: 24 },
  label: { color: C.subtext, fontSize: 12, fontWeight: "700" as const, textAlign: "center" },
  tick: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: C.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  customSection: {
    marginTop: 26,
    padding: 16,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.hair,
    gap: 10,
  },
  sectionLabel: { color: C.text, fontWeight: "800" as const, fontSize: 14, letterSpacing: -0.2 },
  sectionHint: { color: C.subtext, fontSize: 12, lineHeight: 17 },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  input: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.pink,
  },
  addBtnText: { color: C.text, fontWeight: "800" as const, fontSize: 13 },
  customsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  customChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,45,122,0.18)",
    borderWidth: 1,
    borderColor: C.pink,
    maxWidth: "100%",
    flexShrink: 1,
  },
  customChipText: { color: C.text, fontSize: 12, fontWeight: "700" as const, flexShrink: 1 },
});
