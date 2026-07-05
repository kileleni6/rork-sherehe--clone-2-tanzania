import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  Download,
  Lock,
  MoreHorizontal,
  Share2,
  Sparkles,
  Unlock,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, GhostButton, PrimaryButton, SectionTitle, Tag } from "@/components/ui";
import { C } from "@/constants/colors";
import { useEvents } from "@/providers/EventsProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";
import type { Photo } from "@/types/event";

const { width: SCREEN_W } = Dimensions.get("window");
const GAP = 6;
const COLS = 3;
const TILE = (SCREEN_W - 32 - GAP * (COLS - 1)) / COLS;

function CountdownTimer({ target, labels }: { target: number; labels: { d: string; h: string; m: string; s: string } }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const day = 24 * 3600 * 1000;
  const d = Math.floor(diff / day);
  const h = Math.floor((diff % day) / (3600 * 1000));
  const m = Math.floor((diff % (3600 * 1000)) / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return (
    <View style={cs.cdRow}>
      <CdBlock label={labels.d} value={d} />
      <CdBlock label={labels.h} value={h} />
      <CdBlock label={labels.m} value={m} />
      <CdBlock label={labels.s} value={sec} />
    </View>
  );
}

function CdBlock({ label, value }: { label: string; value: number }) {
  return (
    <View style={cs.cdBlock}>
      <Text style={cs.cdValue}>{String(value).padStart(2, "0")}</Text>
      <Text style={cs.cdLabel}>{label}</Text>
    </View>
  );
}

export default function GalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { findById, unlockGallery, removePhoto } = useEvents();
  const { t, formatDateTime } = useOnboarding();
  const event = findById(id);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [fade] = useState<Animated.Value>(new Animated.Value(0));

  const sorted = useMemo(() => (event ? [...event.photos].sort((a, b) => b.takenAt - a.takenAt) : []), [event]);

  const handleUnlock = useCallback(async () => {
    if (!event) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await unlockGallery(event.id);
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [event, unlockGallery, fade]);

  if (!event) {
    return (
      <View style={cs.container}>
        <Text style={{ color: C.text, padding: 30 }}>{t("gallery_event_not_found")}</Text>
      </View>
    );
  }

  const unlocked = event.revealAt <= Date.now();

  return (
    <View style={cs.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={cs.topBar}>
          <Pressable onPress={() => router.back()} style={cs.iconBtn} hitSlop={10}>
            <ChevronLeft color={C.text} size={22} />
          </Pressable>
          <Text style={cs.topTitle} numberOfLines={1}>{event.name}</Text>
          <Pressable style={cs.iconBtn} hitSlop={10}>
            <MoreHorizontal color={C.text} size={20} />
          </Pressable>
        </View>

        {!unlocked ? (
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            <View style={cs.lockHero}>
              <LinearGradient
                colors={["#1A0410", "#3D0A24", "#8B0030"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={cs.lockShield}>
                <Lock color={C.text} size={42} />
              </View>
              <Text style={cs.lockKicker}>{t("gallery_sealed_kicker")}</Text>
              <Text style={cs.lockTitle}>{t("gallery_reveal_coming")}</Text>
              <Text style={cs.lockSub}>
                {event.photos.length === 1
                  ? t("gallery_reveal_sub_one", { n: event.photos.length })
                  : t("gallery_reveal_sub_many", { n: event.photos.length })}
              </Text>

              <CountdownTimer
                target={event.revealAt}
                labels={{ d: t("gallery_days"), h: t("gallery_hrs"), m: t("gallery_min"), s: t("gallery_sec") }}
              />
            </View>

            <Card style={{ marginTop: 18, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Sparkles color={C.gold} size={20} />
                <Text style={cs.aiText}>{t("gallery_host_unlock_note")}</Text>
              </View>
              <PrimaryButton title={t("gallery_unlock_now")} icon={Unlock} onPress={handleUnlock} />
              <GhostButton title={t("gallery_back_event")} onPress={() => router.back()} />
            </Card>

            <SectionTitle style={{ marginTop: 22 }}>{t("gallery_whats_inside")}</SectionTitle>
            <View style={cs.previewRow}>
              {sorted.slice(0, 4).map((p) => (
                <View key={p.id} style={cs.previewTile}>
                  <Image
                    source={{ uri: p.uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    blurRadius={28}
                  />
                  <View style={cs.previewLock}>
                    <Lock color={C.text} size={16} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <>
            <View style={cs.unlockedHeader}>
              <View>
                <Tag label={t("gallery_unlocked_tag")} tone="success" />
                <Text style={cs.unlockedTitle}>
                  {t("gallery_memories_count", { n: sorted.length })}
                </Text>
                <Text style={cs.unlockedSub}>{t("gallery_hint")}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable style={cs.iconBtn}>
                  <Download color={C.text} size={18} />
                </Pressable>
                <Pressable style={cs.iconBtn}>
                  <Share2 color={C.text} size={18} />
                </Pressable>
              </View>
            </View>

            <FlatList
              data={sorted}
              keyExtractor={(p) => p.id}
              numColumns={COLS}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: GAP }}
              columnWrapperStyle={{ gap: GAP }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setViewing(item)}
                  onLongPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    removePhoto(event.id, item.id);
                  }}
                  style={{ width: TILE, height: TILE, borderRadius: 12, overflow: "hidden", backgroundColor: C.card }}
                >
                  <Image source={{ uri: item.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                </Pressable>
              )}
              ListEmptyComponent={
                <Card style={{ alignItems: "center", paddingVertical: 40, marginTop: 20 }}>
                  <Text style={{ color: C.subtext }}>{t("gallery_empty")}</Text>
                </Card>
              }
            />
          </>
        )}
      </SafeAreaView>

      {/* Photo viewer */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={cs.viewerBg}>
          <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
            <View style={cs.viewerHeader}>
              <Pressable onPress={() => setViewing(null)} style={cs.iconBtn}>
                <X color={C.text} size={20} />
              </Pressable>
              <Text style={cs.viewerName}>{viewing?.guestName ?? ""}</Text>
              <Pressable style={cs.iconBtn}>
                <Share2 color={C.text} size={18} />
              </Pressable>
            </View>
            {viewing ? (
              <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
                <Image
                  source={{ uri: viewing.uri }}
                  style={{ width: "100%", aspectRatio: 0.75, borderRadius: 16 }}
                  contentFit="cover"
                />
                <Text style={cs.viewerMeta}>
                  {t("gallery_captured_at", { date: formatDateTime(viewing.takenAt) })}
                </Text>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: C.text, fontWeight: "700" as const, fontSize: 16, flex: 1, textAlign: "center", marginHorizontal: 8 },
  lockHero: {
    overflow: "hidden",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(244,201,123,0.25)",
  },
  lockShield: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginBottom: 8,
  },
  lockKicker: { color: C.gold, letterSpacing: 3, fontWeight: "800" as const, fontSize: 11 },
  lockTitle: { color: C.text, fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5, textAlign: "center" },
  lockSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center", lineHeight: 19, paddingHorizontal: 12 },
  cdRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  cdBlock: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minWidth: 64,
  },
  cdValue: { color: C.text, fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.5 },
  cdLabel: { color: "rgba(255,255,255,0.65)", fontSize: 9, fontWeight: "700" as const, letterSpacing: 1.5, marginTop: 2 },
  aiText: { color: C.subtext, flex: 1, fontSize: 13, lineHeight: 18 },
  previewRow: { marginTop: 14, flexDirection: "row", gap: 8 },
  previewTile: { flex: 1, aspectRatio: 0.85, borderRadius: 12, overflow: "hidden", backgroundColor: C.cardHi },
  previewLock: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  unlockedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginVertical: 12 },
  unlockedTitle: { color: C.text, fontSize: 24, fontWeight: "800" as const, marginTop: 6, letterSpacing: -0.4 },
  unlockedSub: { color: C.subtext, fontSize: 12, marginTop: 2 },
  viewerBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  viewerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  viewerName: { color: C.text, fontWeight: "700" as const },
  viewerMeta: { color: C.subtext, fontSize: 12, marginTop: 16, textAlign: "center" },
});
