import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar as CalendarIcon,
  Camera as CameraIcon,
  ChevronLeft,
  Edit3,
  Eye,
  Lock,
  MapPin,
  ScanLine,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Unlock,
  Users,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { InvitationCard } from "@/components/InvitationCard";
import { PressableScale } from "@/components/pressable/PressableScale";
import {
  ActionTile,
  Card,
  EmptyState,
  Hair,
  IconButton,
  PrimaryButton,
  SectionTitle,
  ShimmerImage,
  Tag,
  useToast,
} from "@/components/ui";
import { C } from "@/constants/colors";
import { TIME_OF_DAY, timeOfDayFromDate } from "@/constants/templates";
import { addToCalendar } from "@/lib/calendar";
import { triggerHaptic } from "@/lib/haptics";
import { getTemplate, rsvpStats, useEvents } from "@/providers/EventsProvider";

interface Countdown {
  d: number;
  h: number;
  m: number;
  sec: number;
  live: boolean;
  ended: boolean;
}

function computeCountdown(ts: number, now: number): Countdown {
  const diff = ts - now;
  const live = diff <= 0 && diff > -6 * 3600 * 1000;
  const ended = diff <= -6 * 3600 * 1000;
  if (diff <= 0) return { d: 0, h: 0, m: 0, sec: 0, live, ended };
  const day = 24 * 3600 * 1000;
  const d = Math.floor(diff / day);
  const h = Math.floor((diff % day) / (3600 * 1000));
  const m = Math.floor((diff % (3600 * 1000)) / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return { d, h, m, sec, live: false, ended: false };
}

function useLiveCountdown(ts: number): Countdown {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => computeCountdown(ts, now), [ts, now]);
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef<number>(value);
  useEffect(() => {
    if (prev.current !== value) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]).start();
      prev.current = value;
    }
  }, [value, scale]);
  return (
    <View style={s.cdCell}>
      <LinearGradient colors={["#1F1F28", "#14141A"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.cdTile}>
        <Animated.Text style={[s.cdValue, { transform: [{ scale }] }]}>{String(value).padStart(2, "0")}</Animated.Text>
        <View style={s.cdShine} />
      </LinearGradient>
      <Text style={s.cdLabel}>{label}</Text>
    </View>
  );
}

function LiveCountdown({ ts }: { ts: number }) {
  const cd = useLiveCountdown(ts);
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const kicker = cd.ended ? "Event has ended" : cd.live ? "Happening now" : "Counting down to your event";
  const tone = cd.ended ? C.mute : cd.live ? C.success : C.pinkHi;

  return (
    <LinearGradient
      colors={["rgba(255,45,122,0.18)", "rgba(28,28,36,0.95)", "rgba(10,10,11,0.95)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.countdownCard}
    >
      <View style={s.countdownHeader}>
        <Animated.View style={[s.liveDot, { backgroundColor: tone, opacity: pulse }]} />
        <Text style={[s.countdownKicker, { color: tone }]}>{kicker}</Text>
      </View>
      {cd.ended ? (
        <Text style={s.endedText}>Thanks for celebrating with us</Text>
      ) : cd.live ? (
        <View style={s.liveBig}>
          <Text style={s.liveBigText}>LIVE</Text>
          <Text style={s.liveSub}>Doors are open — capture every moment</Text>
        </View>
      ) : (
        <View style={s.countdownRow}>
          <CountdownCell value={cd.d} label="DAYS" />
          <Text style={s.cdColon}>:</Text>
          <CountdownCell value={cd.h} label="HRS" />
          <Text style={s.cdColon}>:</Text>
          <CountdownCell value={cd.m} label="MIN" />
          <Text style={s.cdColon}>:</Text>
          <CountdownCell value={cd.sec} label="SEC" />
        </View>
      )}
      <Text style={s.countdownDate}>
        {new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        {" · "}
        {new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
      </Text>
    </LinearGradient>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { findById, unlockGallery, deleteEvent } = useEvents();
  const event = findById(id);

  const tpl = useMemo(() => (event ? getTemplate(event.template) : undefined), [event]);
  const stats = useMemo(() => (event ? rsvpStats(event.rsvps) : null), [event]);
  const galleryUnlocked = (event?.revealAt ?? Infinity) <= Date.now();

  if (!event || !tpl || !stats) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon={Sparkles}
          title="Event not found"
          subtitle="It may have been deleted or the link is incorrect."
          action={{ label: "Go back", onPress: () => router.back() }}
        />
      </View>
    );
  }

  const shareInvite = async () => {
    triggerHaptic("selection");
    const url = `https://sherehe.app/i/${event.id}`;
    const message = `You're invited to ${event.name} \u2014 ${event.venue}. RSVP: ${url}`;
    try {
      if (Platform.OS === "web") {
        const navAny = (globalThis as unknown as { navigator?: { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> } }).navigator;
        if (navAny?.share) {
          await navAny.share({ title: event.name, text: message, url });
          return;
        }
        await Clipboard.setStringAsync(url);
        toast.success("Invite link copied");
        return;
      }
      const result = await Share.share({ message, url, title: event.name });
      if (result.action === Share.dismissedAction) {
        // user dismissed — no-op
      }
    } catch (e) {
      console.log("[share]", e);
      try {
        await Clipboard.setStringAsync(url);
        Alert.alert("Link copied", `We copied your invite link so you can paste it anywhere:\n\n${url}`);
      } catch {
        Alert.alert("Share invite", `Share this link with your guests:\n\n${url}`);
      }
    }
  };

  const confirmDelete = () => {
    Alert.alert("Delete event?", "This will remove the event and all photos.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEvent(event.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={s.coverWrap}>
          <ShimmerImage uri={event.cover} style={StyleSheet.absoluteFillObject as never} borderRadius={0} />
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "transparent", "rgba(10,10,11,1)"]}
            style={StyleSheet.absoluteFillObject as never}
          />
          <SafeAreaView edges={["top"]} style={s.coverHeader}>
            <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="glass" iconSize={22} haptic="light" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <IconButton icon={Share2} onPress={shareInvite} variant="glass" iconSize={18} haptic="light" />
              <IconButton icon={Trash2} onPress={confirmDelete} variant="glass" iconSize={18} color={C.danger} haptic="warning" />
            </View>
          </SafeAreaView>

          <View style={s.coverBottom}>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              <Tag
                label={(event.type === "custom" ? event.customLabel ?? "Custom" : event.type).toUpperCase()}
                tone="pink"
              />
              {(() => {
                const todId = event.timeOfDay ?? timeOfDayFromDate(event.date);
                const tod = TIME_OF_DAY.find((t) => t.id === todId);
                if (!tod) return null;
                return <Tag label={`${tod.emoji} ${tod.label}`} tone="gold" />;
              })()}
            </View>
            <Text style={s.heroTitle}>{event.name}</Text>
            <View style={s.heroMeta}>
              <MapPin color={C.text} size={13} />
              <Text style={s.heroMetaText}>{event.venue}</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>
          <LiveCountdown ts={event.date} />

          <View style={s.actionsRow}>
            <ActionTile
              icon={Send}
              iconBg="rgba(255,45,122,0.18)"
              iconColor={C.pinkHi}
              title="Share invite"
              subtitle="Email · SMS · Link"
              onPress={() => router.push(`/guest-list/${event.id}` as never)}
            />
            <ActionTile
              icon={CameraIcon}
              iconBg="rgba(244,201,123,0.18)"
              iconColor={C.gold}
              title="Open camera"
              subtitle={`${event.photos.length}/${event.shotsPerGuest}`}
              onPress={() => router.push(`/camera/${event.id}` as never)}
            />
            <ActionTile
              icon={galleryUnlocked ? Unlock : Lock}
              iconBg="rgba(61,214,140,0.18)"
              iconColor={C.success}
              title="Gallery"
              subtitle={galleryUnlocked ? "Open" : "Locked"}
              onPress={() => router.push(`/gallery/${event.id}` as never)}
            />
          </View>

          <View style={s.sectionRow}>
            <SectionTitle>Invitation</SectionTitle>
            <PressableScale onPress={() => router.push(`/invite/${event.id}` as never)} haptic="selection" style={s.linkBtn}>
              <Edit3 color={C.pinkHi} size={14} />
              <Text style={s.linkText}>Customize</Text>
            </PressableScale>
          </View>
          <InvitationCard event={event} template={tpl} compact />

          <View style={s.sectionRow}>
            <SectionTitle>RSVP Pulse</SectionTitle>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Eye color={C.subtext} size={13} />
              <Text style={s.viewsText}>{event.views} views</Text>
            </View>
          </View>
          <Card>
            <View style={s.statGrid}>
              <View style={s.statBig}>
                <Text style={s.statBigValue}>{stats.attendingCount}</Text>
                <Text style={s.statBigLabel}>Attending</Text>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <BarRow label="Yes" value={stats.yes} total={Math.max(stats.total, 1)} color={C.success} />
                <BarRow label="Maybe" value={stats.maybe} total={Math.max(stats.total, 1)} color={C.gold} />
                <BarRow label="No" value={stats.no} total={Math.max(stats.total, 1)} color={C.danger} />
              </View>
            </View>
            <Hair />
            <View style={{ gap: 10 }}>
              {event.rsvps.slice(0, 4).map((r) => (
                <View key={r.id} style={s.guestRow}>
                  <View style={s.guestAvatar}>
                    <Text style={s.guestAvatarText}>{r.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.guestName}>{r.name}</Text>
                    {r.note ? (
                      <Text style={s.guestNote} numberOfLines={1}>
                        “{r.note}”
                      </Text>
                    ) : (
                      <Text style={s.guestNote}>
                        {r.status === "yes" ? `+${r.guests} guest${r.guests === 1 ? "" : "s"}` : r.status === "no" ? "Can't make it" : "Maybe"}
                      </Text>
                    )}
                  </View>
                  <Tag
                    label={r.status === "yes" ? "Going" : r.status === "maybe" ? "Maybe" : "Declined"}
                    tone={r.status === "yes" ? "success" : r.status === "maybe" ? "gold" : "mute"}
                  />
                </View>
              ))}
              {event.rsvps.length === 0 ? (
                <Text style={{ color: C.subtext, textAlign: "center", paddingVertical: 16 }}>
                  No RSVPs yet. Share your invite to start receiving replies.
                </Text>
              ) : null}
            </View>
          </Card>

          {event.checkInEnabled ? (
            <PressableScale
              onPress={() => router.push(`/checkin/${event.id}` as never)}
              haptic="light"
              pressedScale={0.99}
              style={s.checkinBanner}
            >
              <LinearGradient
                colors={["rgba(255,45,122,0.22)", "rgba(199,17,83,0.15)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject as never}
              />
              <View style={s.checkinBannerIcon}>
                <ScanLine color={C.text} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.checkinBannerTitle}>Check in guests</Text>
                <Text style={s.checkinBannerSub}>
                  {event.rsvps.filter((r) => r.checkedInAt).length} of{" "}
                  {event.rsvps.filter((r) => r.status !== "no").length} arrived
                </Text>
              </View>
              <Text style={s.checkinBannerCta}>Open</Text>
            </PressableScale>
          ) : null}

          <View style={s.sectionRow}>
            <SectionTitle>Host controls</SectionTitle>
          </View>
          <Card style={{ gap: 12 }}>
            <View style={s.controlRow}>
              <Users color={C.text} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={s.controlTitle}>Guest list</Text>
                <Text style={s.controlSub}>{stats.total} replies · {event.invited} invited</Text>
              </View>
            </View>
            <View style={s.controlRow}>
              <CameraIcon color={C.text} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={s.controlTitle}>Shots per guest</Text>
                <Text style={s.controlSub}>{event.shotsPerGuest} photos</Text>
              </View>
            </View>
            <View style={s.controlRow}>
              {galleryUnlocked ? <Unlock color={C.success} size={18} /> : <Lock color={C.text} size={18} />}
              <View style={{ flex: 1 }}>
                <Text style={s.controlTitle}>Gallery reveal</Text>
                <Text style={s.controlSub}>
                  {galleryUnlocked ? "Unlocked" : `Reveals ${new Date(event.revealAt).toLocaleString()}`}
                </Text>
              </View>
              {!galleryUnlocked ? (
                <PressableScale
                  onPress={() => {
                    triggerHaptic("success");
                    unlockGallery(event.id);
                    toast.success("Gallery unlocked");
                  }}
                  haptic={false}
                  pressedScale={0.96}
                  style={s.smallBtn}
                >
                  <Text style={s.smallBtnText}>Unlock now</Text>
                </PressableScale>
              ) : null}
            </View>
          </Card>

          <PressableScale
            onPress={() => {
              triggerHaptic("selection");
              addToCalendar({
                id: event.id,
                title: event.name,
                startTs: event.date,
                venue: event.venue,
                description: event.message,
                url: `https://sherehe.app/i/${event.id}`,
              });
            }}
            haptic={false}
            style={s.calRow}
          >
            <CalendarIcon color={C.gold} size={18} />
            <Text style={s.calRowText}>Add to my calendar</Text>
            <Text style={s.calRowHint}>iCal · Google</Text>
          </PressableScale>

          {event.schedule.length > 0 ? (
            <>
              <View style={s.sectionRow}>
                <SectionTitle>Schedule</SectionTitle>
              </View>
              <Card style={{ gap: 14 }}>
                {event.schedule.map((it, idx) => (
                  <View key={it.id} style={s.schedRow}>
                    <View style={{ alignItems: "center", width: 64 }}>
                      <Text style={s.schedTime}>{it.time}</Text>
                    </View>
                    <View style={s.schedLine}>
                      <View style={s.schedDot} />
                      {idx < event.schedule.length - 1 ? <View style={s.schedStem} /> : null}
                    </View>
                    <Text style={s.schedTitle}>{it.title}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <View style={s.sectionRow}>
            <SectionTitle>AI moments</SectionTitle>
          </View>
          <Card style={s.aiCard}>
            <Sparkles color={C.pinkHi} size={20} />
            <View style={{ flex: 1 }}>
              <Text style={s.aiTitle}>Best moments curation</Text>
              <Text style={s.aiSub}>After the reveal, we'll surface a highlight reel with blur & duplicate filtering.</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: 14 + Math.max(insets.bottom, 6) }]}>
        <PrimaryButton title="Share invitation" icon={Share2} onPress={shareInvite} />
      </View>
    </View>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.round((value / total) * 100);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: C.subtext, fontSize: 12, fontWeight: "600" as const }}>{label}</Text>
        <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" as const }}>{value}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: C.hair, borderRadius: 4, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  coverWrap: { height: 360, backgroundColor: C.card, overflow: "hidden" },
  coverHeader: { paddingHorizontal: 12, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverBottom: { position: "absolute", bottom: 18, left: 18, right: 18, gap: 8 },
  heroTitle: { color: C.text, fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroMetaText: { color: C.text, fontSize: 13, opacity: 0.9 },
  body: { padding: 16, gap: 14, marginTop: -30 },
  countdownCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,45,122,0.25)",
    gap: 14,
    overflow: "hidden",
  },
  countdownHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 999 },
  countdownKicker: { letterSpacing: 2, fontWeight: "800" as const, fontSize: 10, textTransform: "uppercase" as const },
  countdownRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cdCell: { alignItems: "center", flex: 1 },
  cdTile: {
    width: "100%",
    aspectRatio: 0.95,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  cdShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cdValue: {
    color: C.text,
    fontSize: 28,
    fontWeight: "800" as const,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  cdColon: { color: C.pink, fontSize: 22, fontWeight: "800" as const, marginHorizontal: 2, marginTop: -18 },
  cdLabel: { color: C.subtext, fontSize: 9, letterSpacing: 1.5, marginTop: 6, fontWeight: "700" as const },
  countdownDate: { color: C.subtext, fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.5, textAlign: "center" as const },
  endedText: { color: C.text, fontSize: 18, fontWeight: "700" as const, textAlign: "center" as const, paddingVertical: 12 },
  liveBig: { alignItems: "center", gap: 6, paddingVertical: 14 },
  liveBigText: { color: C.success, fontSize: 44, fontWeight: "900" as const, letterSpacing: 6 },
  liveSub: { color: C.subtext, fontSize: 12, textAlign: "center" as const },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderColor: C.hair,
    borderWidth: 1,
    padding: 12,
    borderRadius: 18,
    gap: 6,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionTitle: { color: C.text, fontSize: 13, fontWeight: "700" as const },
  actionSub: { color: C.subtext, fontSize: 11 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { color: C.pinkHi, fontWeight: "600" as const, fontSize: 13 },
  viewsText: { color: C.subtext, fontSize: 12 },
  statGrid: { flexDirection: "row", gap: 16, alignItems: "center" },
  statBig: {
    backgroundColor: C.cardHi,
    borderRadius: 18,
    padding: 16,
    minWidth: 100,
    alignItems: "center",
  },
  statBigValue: { color: C.text, fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  statBigLabel: { color: C.subtext, fontSize: 11, letterSpacing: 1, marginTop: 4 },
  guestRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  guestAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: C.cardHi,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.hair,
  },
  guestAvatarText: { color: C.text, fontWeight: "700" as const },
  guestName: { color: C.text, fontWeight: "600" as const, fontSize: 14 },
  guestNote: { color: C.subtext, fontSize: 12, marginTop: 2 },
  controlRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  controlTitle: { color: C.text, fontSize: 14, fontWeight: "600" as const },
  controlSub: { color: C.subtext, fontSize: 12, marginTop: 2 },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.pink,
    borderRadius: 999,
  },
  smallBtnText: { color: C.text, fontWeight: "700" as const, fontSize: 12 },
  schedRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  schedTime: { color: C.gold, fontWeight: "700" as const, fontSize: 13 },
  schedLine: { alignItems: "center", width: 10, paddingTop: 4 },
  schedDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: C.pink },
  schedStem: { width: 2, flex: 1, backgroundColor: C.hair, marginTop: 4 },
  schedTitle: { color: C.text, fontSize: 14, fontWeight: "600" as const, flex: 1, paddingBottom: 12 },
  aiCard: { flexDirection: "row", gap: 14, alignItems: "center" },
  aiTitle: { color: C.text, fontWeight: "700" as const, fontSize: 14 },
  aiSub: { color: C.subtext, fontSize: 12, marginTop: 4, lineHeight: 17 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(10,10,11,0.92)",
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },
  checkinBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,45,122,0.35)",
  },
  checkinBannerIcon: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: C.pink, alignItems: "center", justifyContent: "center",
  },
  checkinBannerTitle: { color: C.text, fontSize: 15, fontWeight: "800" as const },
  checkinBannerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  checkinBannerCta: { color: C.text, fontWeight: "800" as const, fontSize: 13, letterSpacing: 0.4 },
  calRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 18,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.hair,
  },
  calRowText: { color: C.text, fontWeight: "700" as const, fontSize: 14, flex: 1 },
  calRowHint: { color: C.mute, fontSize: 11, fontWeight: "700" as const, letterSpacing: 1 },
});
