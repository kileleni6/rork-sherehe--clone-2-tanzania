import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Camera as CameraIcon,
  ChevronRight,
  Crown,
  Plus,
  Send,
  Sparkles,
  Ticket,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconButton } from "@/components/pressable/IconButton";
import { PressableScale } from "@/components/pressable/PressableScale";
import {
  Card,
  Chip,
  EmptyState,
  EventRowSkeleton,
  FadeInView,
  HeroSkeleton,
  PrimaryButton,
  SectionTitle,
  ShimmerImage,
  Tag,
} from "@/components/ui";
import { C } from "@/constants/colors";
import { EVENT_TYPES } from "@/constants/templates";
import { rsvpStats, useEvents } from "@/providers/EventsProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";
import type { Event } from "@/types/event";

function countdown(ts: number, tr: (k: string, vars?: Record<string, string | number>) => string) {
  const diff = ts - Date.now();
  if (diff < 0) return tr("countdown_live");
  const day = 24 * 3600 * 1000;
  const days = Math.floor(diff / day);
  const hours = Math.floor((diff % day) / (3600 * 1000));
  if (days > 0) return tr("countdown_in_days", { d: days, h: hours });
  const mins = Math.floor((diff % (3600 * 1000)) / 60000);
  return tr("countdown_in_hours", { h: hours, m: mins });
}

function EventRow({ event, onPress }: { event: Event; onPress: () => void }) {
  const stats = rsvpStats(event.rsvps);
  const { t } = useOnboarding();
  return (
    <PressableScale onPress={onPress} haptic="selection" pressedScale={0.99} style={styles.row}>
      <View style={styles.rowImg}>
        <ShimmerImage uri={event.cover} style={styles.rowImgInner} borderRadius={16} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.rowImgOverlay} />
        <View style={styles.rowImgBadge}>
          <Text style={styles.rowImgBadgeText}>{countdown(event.date, t)}</Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {event.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {event.venue}
        </Text>
        <View style={styles.rowMeta}>
          <View style={styles.rowMetaItem}>
            <Users color={C.subtext} size={12} />
            <Text style={styles.rowMetaText}>{t("home_going", { n: stats.attendingCount })}</Text>
          </View>
          <View style={styles.rowDot} />
          <View style={styles.rowMetaItem}>
            <CameraIcon color={C.subtext} size={12} />
            <Text style={styles.rowMetaText}>{t("home_photos", { n: event.photos.length })}</Text>
          </View>
        </View>
      </View>
      <ChevronRight color={C.mute} size={20} />
    </PressableScale>
  );
}

const HOW_IT_WORKS_KEY = "sherehe.how_dismissed.v1";

export default function EventsScreen() {
  const router = useRouter();
  const { upcoming, profile, loading } = useEvents();
  const { t } = useOnboarding();
  const [showHow, setShowHow] = useState<boolean>(true);

  useEffect(() => {
    AsyncStorage.getItem(HOW_IT_WORKS_KEY)
      .then((v) => setShowHow(v !== "1"))
      .catch(() => {});
  }, []);

  const dismissHow = useCallback(async () => {
    setShowHow(false);
    try {
      await AsyncStorage.setItem(HOW_IT_WORKS_KEY, "1");
    } catch {}
  }, []);

  const hero = useMemo(() => upcoming[0], [upcoming]);
  const rest = useMemo(() => upcoming.slice(1), [upcoming]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(255,45,122,0.32)", "rgba(139,0,48,0.15)", "transparent"]}
        style={styles.heroGradient}
      />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <FadeInView>
              <Text style={styles.hello}>{t("home_hello", { name: profile.name })}</Text>
              <Text style={styles.title}>{t("home_title")}</Text>
            </FadeInView>
            <IconButton
              icon={Crown}
              onPress={() => router.push("/paywall")}
              color={profile.premium ? C.gold : C.subtext}
              haptic="light"
            />
          </View>

          {showHow ? (
            <FadeInView delay={60}>
            <View style={styles.howCard}>
              <View style={styles.howHeader}>
                <View style={styles.howKickerWrap}>
                  <Sparkles color={C.pinkHi} size={13} />
                  <Text style={styles.howKicker}>{t("home_how_kicker")}</Text>
                </View>
                <IconButton icon={X} onPress={dismissHow} iconSize={14} size={28} color={C.subtext} haptic="light" />
              </View>
              <View style={styles.howStep}>
                <View style={styles.howNum}><Send color={C.pinkHi} size={13} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.howStepTitle}>{t("home_how_step1_title")}</Text>
                  <Text style={styles.howStepSub}>{t("home_how_step1_sub")}</Text>
                </View>
              </View>
              <View style={styles.howStep}>
                <View style={styles.howNum}><Ticket color={C.gold} size={13} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.howStepTitle}>{t("home_how_step2_title")}</Text>
                  <Text style={styles.howStepSub}>{t("home_how_step2_sub")}</Text>
                </View>
              </View>
              <View style={styles.howStep}>
                <View style={styles.howNum}><CameraIcon color={C.success} size={13} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.howStepTitle}>{t("home_how_step3_title")}</Text>
                  <Text style={styles.howStepSub}>{t("home_how_step3_sub")}</Text>
                </View>
              </View>
            </View>
            </FadeInView>
          ) : null}

          {loading ? (
            <FadeInView>
              <HeroSkeleton />
              <View style={{ gap: 12, marginTop: 18 }}>
                <EventRowSkeleton />
                <EventRowSkeleton />
              </View>
            </FadeInView>
          ) : hero ? (
            <PressableScale
              onPress={() => router.push(`/event/${hero.id}` as never)}
              haptic="light"
              pressedScale={0.99}
              style={styles.heroWrap}
            >
              <ShimmerImage uri={hero.cover} style={styles.heroImg} borderRadius={28} />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.95)"]}
                style={styles.heroOverlay}
              />
              <View style={styles.heroContent}>
                <Tag label={t("home_next_up")} tone="pink" />
                <Text style={styles.heroTitle}>{hero.name}</Text>
                <Text style={styles.heroSub}>
                  {hero.venue} · {countdown(hero.date, t)}
                </Text>
                <View style={styles.heroActions}>
                  <PrimaryButton
                    title={t("home_open_event")}
                    icon={ArrowRight}
                    onPress={() => router.push(`/event/${hero.id}` as never)}
                  />
                </View>
              </View>
            </PressableScale>
          ) : null}

          {!loading ? (
          <View style={styles.quickGrid}>
            <PressableScale
              onPress={() => router.push("/create")}
              haptic="light"
              pressedScale={0.98}
              style={styles.quick}
            >
              <LinearGradient
                colors={[C.pinkHi, C.pink, C.pinkDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickIcon}
              >
                <Plus color={C.text} size={22} />
              </LinearGradient>
              <Text style={styles.quickTitle}>{t("home_create_event")}</Text>
              <Text style={styles.quickSub}>{t("home_create_event_sub")}</Text>
            </PressableScale>
            <PressableScale
              onPress={() => router.push("/camera" as never)}
              haptic="selection"
              pressedScale={0.98}
              style={styles.quick}
            >
              <View style={[styles.quickIcon, { backgroundColor: C.cardHi }]}>
                <CameraIcon color={C.gold} size={22} />
              </View>
              <Text style={styles.quickTitle}>{t("home_open_camera")}</Text>
              <Text style={styles.quickSub}>{t("home_open_camera_sub")}</Text>
            </PressableScale>
          </View>
          ) : null}

          <View style={styles.sectionRow}>
            <SectionTitle>{t("home_browse_types")}</SectionTitle>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            style={{ marginHorizontal: -16 }}
          >
            {EVENT_TYPES.map((t) => (
              <Chip key={t.id} label={t.label} icon={t.emoji} />
            ))}
          </ScrollView>

          <View style={styles.sectionRow}>
            <SectionTitle>{t("home_upcoming")}</SectionTitle>
            <PressableScale haptic="selection" pressedScale={0.96}>
              <Text style={styles.seeAll}>{t("home_see_all")}</Text>
            </PressableScale>
          </View>

          {rest.length === 0 && !loading ? (
            <Card>
              <EmptyState
                icon={Sparkles}
                title={t("home_empty_title")}
                subtitle={t("home_empty_sub")}
                action={{ label: t("home_create_event"), onPress: () => router.push("/create"), icon: Plus }}
              />
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              {rest.map((e, i) => (
                <FadeInView key={e.id} delay={i * 40}>
                  <EventRow event={e} onPress={() => router.push(`/event/${e.id}` as never)} />
                </FadeInView>
              ))}
            </View>
          )}

          {!profile.premium ? (
            <PressableScale
              onPress={() => router.push("/paywall")}
              haptic="light"
              pressedScale={0.99}
              style={styles.proCard}
            >
              <LinearGradient
                colors={["#1A0410", "#3D0A24", "#8B0030"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <Crown color={C.gold} size={16} />
                  <Text style={styles.proKicker}>{t("home_pro_kicker")}</Text>
                </View>
                <Text style={styles.proTitle}>{t("home_pro_title")}</Text>
                <Text style={styles.proSub}>{t("home_pro_sub")}</Text>
              </View>
              <ChevronRight color={C.text} size={20} />
            </PressableScale>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      <View style={styles.fab}>
        <PrimaryButton title={t("home_new_event")} icon={Plus} onPress={() => router.push("/create")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  heroGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 400 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  hello: { color: C.subtext, fontSize: 13, letterSpacing: 0.3 },
  title: { color: C.text, fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.6 },
  crown: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: "center",
    justifyContent: "center",
  },
  heroWrap: {
    borderRadius: 28,
    overflow: "hidden",
    height: 380,
    backgroundColor: C.card,
  },
  heroImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: StyleSheet.absoluteFillObject,
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 22, gap: 8 },
  heroTitle: { color: C.text, fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.6 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  heroActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  quickGrid: { flexDirection: "row", gap: 12 },
  quick: {
    flex: 1,
    backgroundColor: C.card,
    borderColor: C.hair,
    borderWidth: 1,
    padding: 16,
    borderRadius: 22,
    gap: 8,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: { color: C.text, fontWeight: "700" as const, fontSize: 15 },
  quickSub: { color: C.subtext, fontSize: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  seeAll: { color: C.pinkHi, fontWeight: "600" as const, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.hair,
  },
  rowImg: { width: 76, height: 76, borderRadius: 16, overflow: "hidden", backgroundColor: C.cardHi },
  rowImgInner: { width: "100%", height: "100%" },
  rowImgOverlay: StyleSheet.absoluteFillObject,
  rowImgBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  rowImgBadgeText: { color: C.text, fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.4 },
  rowTitle: { color: C.text, fontSize: 16, fontWeight: "700" as const, letterSpacing: -0.2 },
  rowSub: { color: C.subtext, fontSize: 13 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowMetaText: { color: C.subtext, fontSize: 12 },
  rowDot: { width: 3, height: 3, borderRadius: 3, backgroundColor: C.mute },
  emptyTitle: { color: C.text, fontWeight: "700" as const, fontSize: 16 },
  emptySub: { color: C.subtext, fontSize: 13 },
  proCard: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(244,201,123,0.25)",
  },
  proKicker: { color: C.gold, fontSize: 11, fontWeight: "800" as const, letterSpacing: 2 },
  proTitle: { color: C.text, fontSize: 16, fontWeight: "700" as const, lineHeight: 21 },
  proSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  fab: { position: "absolute", bottom: 100, right: 16 },
  howCard: {
    padding: 16, borderRadius: 22,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.hair, gap: 12,
  },
  howHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  howKickerWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  howKicker: { color: C.pinkHi, fontSize: 10, letterSpacing: 2, fontWeight: "800" as const },
  howClose: {
    width: 26, height: 26, borderRadius: 999,
    backgroundColor: C.cardHi, alignItems: "center", justifyContent: "center",
  },
  howStep: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  howNum: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: C.cardHi, alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  howStepTitle: { color: C.text, fontWeight: "700" as const, fontSize: 14 },
  howStepSub: { color: C.subtext, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
