import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar as CalendarIcon,
  Camera as CameraIcon,
  CheckCircle2,
  ChevronLeft,
  Copy,
  MapPin,
  Sparkles,
  Ticket,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { GhostButton, PrimaryButton, Tag } from "@/components/ui";
import { C } from "@/constants/colors";
import { addToCalendar } from "@/lib/calendar";
import { useEvents } from "@/providers/EventsProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";

export default function GuestPassScreen() {
  const { id } = useLocalSearchParams<{ id: string; rsvp?: string }>();
  const params = useLocalSearchParams<{ rsvp?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { findById } = useEvents();
  const { t, formatDate, formatTime } = useOnboarding();
  const event = findById(id);

  const rsvp = useMemo(() => {
    if (!event) return undefined;
    if (params.rsvp) return event.rsvps.find((r) => r.id === params.rsvp);
    return event.rsvps[0];
  }, [event, params.rsvp]);

  if (!event || !rsvp) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView edges={["top"]} style={{ flex: 1, padding: 24, gap: 14 }}>
          <Pressable onPress={() => router.back()} style={s.iconBtn}>
            <ChevronLeft color={C.text} size={22} />
          </Pressable>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: "700" as const }}>{t("pass_not_found_title")}</Text>
          <Text style={{ color: C.subtext }}>{t("pass_not_found_sub")}</Text>
        </SafeAreaView>
      </View>
    );
  }

  const passData = `SHEREHE:${event.id}:${rsvp.passCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&color=0A0A0B&bgcolor=FFFFFF&qzone=2&data=${encodeURIComponent(passData)}`;

  const checkedIn = typeof rsvp.checkedInAt === "number";
  const shotsLeft = event.shotsPerGuest === 0
    ? "∞"
    : Math.max(event.shotsPerGuest - (rsvp.shotsUsed ?? 0), 0);
  const galleryUnlocked = event.revealAt <= Date.now();

  const copyCode = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    try {
      await Clipboard.setStringAsync(rsvp.passCode);
      Alert.alert(t("pass_copied_title"), t("pass_copied_body", { code: rsvp.passCode }));
    } catch (e) {
      console.log("[pass-copy]", e);
    }
  };

  const onAddCalendar = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    await addToCalendar({
      id: event.id,
      title: event.name,
      startTs: event.date,
      venue: event.venue,
      description: event.message,
      url: `https://sherehe.app/i/${event.id}`,
    });
  };

  const onOpenCamera = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push(`/camera/${event.id}` as never);
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["rgba(255,45,122,0.28)", "rgba(28,28,36,0.85)", "rgba(10,10,11,1)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360 }}
      />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
            <ChevronLeft color={C.text} size={22} />
          </Pressable>
          <Text style={s.topTitle}>{t("pass_title")}</Text>
          <View style={s.iconBtn} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 + Math.max(insets.bottom, 8) }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.passCard}>
            <LinearGradient
              colors={["#FFFFFF", "#FFF8F0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.passTop}
            >
              <View style={s.passKickerRow}>
                <Ticket color={C.pinkDeep} size={14} />
                <Text style={s.passKicker}>{t("pass_kicker")}</Text>
              </View>
              <Text style={s.passEvent}>{event.name}</Text>
              <Text style={s.passDate}>
                {formatDate(event.date, { weekday: "long", month: "long", day: "numeric" })}
                {" · "}
                {formatTime(event.date)}
              </Text>
              <View style={s.passVenueRow}>
                <MapPin color={C.pinkDeep} size={13} />
                <Text style={s.passVenue} numberOfLines={1}>{event.venue}</Text>
              </View>
            </LinearGradient>

            <View style={s.perforation}>
              <View style={[s.notch, { left: -10 }]} />
              <View style={s.dashLine} />
              <View style={[s.notch, { right: -10 }]} />
            </View>

            <View style={s.passBottom}>
              <View style={s.qrFrame}>
                <Image source={{ uri: qrUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
              </View>
              <Text style={s.guestName}>{rsvp.name}</Text>
              <Pressable onPress={copyCode} style={s.codePill} hitSlop={6}>
                <Text style={s.codeText}>{rsvp.passCode}</Text>
                <Copy color={C.pinkDeep} size={14} />
              </Pressable>
              <Text style={s.passFootnote}>{t("pass_show_at_door")}</Text>
            </View>
          </View>

          {checkedIn ? (
            <View style={[s.statusCard, { borderColor: "rgba(61,214,140,0.35)", backgroundColor: "rgba(61,214,140,0.08)" }]}>
              <CheckCircle2 color={C.success} size={20} />
              <View style={{ flex: 1 }}>
                <Text style={s.statusTitle}>{t("pass_checked_in")}</Text>
                <Text style={s.statusSub}>
                  {t("pass_checked_in_sub", { time: formatTime(rsvp.checkedInAt ?? Date.now()) })}
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.statusCard}>
              <Sparkles color={C.gold} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={s.statusTitle}>{t("pass_not_checked_in")}</Text>
                <Text style={s.statusSub}>{t("pass_not_checked_in_sub")}</Text>
              </View>
            </View>
          )}

          <View style={s.statsRow}>
            <View style={s.statTile}>
              <Text style={s.statValue}>{shotsLeft}</Text>
              <Text style={s.statLabel}>{t("pass_photos_left")}</Text>
            </View>
            <View style={s.statTile}>
              <Text style={s.statValue}>{event.rsvps.find((r) => r.id === rsvp.id)?.guests ?? 1}</Text>
              <Text style={s.statLabel}>{t("pass_in_party")}</Text>
            </View>
            <View style={s.statTile}>
              <Tag
                label={rsvp.status === "yes" ? t("pass_rsvp_going") : rsvp.status === "maybe" ? t("pass_rsvp_maybe") : t("pass_rsvp_no")}
                tone={rsvp.status === "yes" ? "success" : rsvp.status === "maybe" ? "gold" : "mute"}
              />
              <Text style={[s.statLabel, { marginTop: 6 }]}>{t("pass_rsvp")}</Text>
            </View>
          </View>

          <PrimaryButton
            title={galleryUnlocked ? t("pass_open_camera") : t("pass_open_camera_later")}
            icon={CameraIcon}
            onPress={onOpenCamera}
            style={{ marginTop: 16 }}
          />
          <GhostButton
            title={t("pass_add_calendar")}
            icon={CalendarIcon}
            onPress={onAddCalendar}
            style={{ marginTop: 10 }}
          />

          {event.schedule.length > 0 ? (
            <View style={s.schedCard}>
              <Text style={s.schedTitle}>{t("pass_run_of_show")}</Text>
              {event.schedule.map((it) => (
                <View key={it.id} style={s.schedRow}>
                  <Text style={s.schedTime}>{it.time}</Text>
                  <Text style={s.schedItem}>{it.title}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 8,
  },
  topTitle: { color: C.text, fontWeight: "700" as const, fontSize: 16 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  passCard: {
    backgroundColor: C.ivory, borderRadius: 28, overflow: "hidden",
    marginTop: 8,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 16 },
  },
  passTop: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18, gap: 6 },
  passKickerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  passKicker: { color: C.pinkDeep, fontSize: 10, fontWeight: "800" as const, letterSpacing: 2 },
  passEvent: { color: "#0A0A0B", fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.5 },
  passDate: { color: "#3A3A40", fontSize: 13, fontWeight: "600" as const },
  passVenueRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  passVenue: { color: "#3A3A40", fontSize: 12, flex: 1 },
  perforation: {
    height: 22, backgroundColor: C.ivory,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    overflow: "visible",
  },
  notch: {
    position: "absolute", top: 1, width: 20, height: 20, borderRadius: 999,
    backgroundColor: C.bg,
  },
  dashLine: {
    flex: 1, marginHorizontal: 14, height: 1, borderTopWidth: 2, borderStyle: "dashed", borderColor: "#D5C9B5",
  },
  passBottom: { padding: 22, alignItems: "center", gap: 10 },
  qrFrame: {
    width: 220, height: 220, padding: 10, backgroundColor: "#FFFFFF",
    borderRadius: 20, borderWidth: 1, borderColor: "#E8DFCB",
  },
  guestName: { color: "#0A0A0B", fontSize: 20, fontWeight: "800" as const, marginTop: 4 },
  codePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: "rgba(255,45,122,0.12)",
    borderWidth: 1, borderColor: "rgba(255,45,122,0.3)",
  },
  codeText: { color: C.pinkDeep, fontSize: 14, fontWeight: "800" as const, letterSpacing: 3 },
  passFootnote: { color: "#6E6E78", fontSize: 11, fontWeight: "600" as const, marginTop: 4 },
  statusCard: {
    marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 18, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.hair,
  },
  statusTitle: { color: C.text, fontSize: 14, fontWeight: "700" as const },
  statusSub: { color: C.subtext, fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  statTile: {
    flex: 1, padding: 14, borderRadius: 16,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.hair,
    alignItems: "center", gap: 2,
  },
  statValue: { color: C.text, fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.5 },
  statLabel: { color: C.subtext, fontSize: 11, fontWeight: "600" as const },
  schedCard: {
    marginTop: 18, padding: 16, borderRadius: 18,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.hair, gap: 10,
  },
  schedTitle: { color: C.text, fontWeight: "800" as const, fontSize: 15, marginBottom: 4 },
  schedRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  schedTime: { color: C.gold, fontSize: 12, fontWeight: "700" as const, width: 70 },
  schedItem: { color: C.text, fontSize: 14, fontWeight: "600" as const, flex: 1 },
});
