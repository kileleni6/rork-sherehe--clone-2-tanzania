import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft, Images, Sparkles, Timer, Zap, ZapOff } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { C } from "@/constants/colors";
import { CAMERA_STYLES, STOCK_SHOTS, type CameraStyleId } from "@/constants/templates";
import { useEvents } from "@/providers/EventsProvider";
import type { Photo } from "@/types/event";

export default function CameraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { findById, addPhoto } = useEvents();
  const event = findById(id);

  const [flash, setFlash] = useState<boolean>(false);
  const [timer, setTimer] = useState<boolean>(false);
  const [styleId, setStyleId] = useState<CameraStyleId>("disposable");
  const [counting, setCounting] = useState<number>(0);
  const [lastShot, setLastShot] = useState<Photo | null>(null);
  const [flashAnim] = useState<Animated.Value>(new Animated.Value(0));
  const [shutterAnim] = useState<Animated.Value>(new Animated.Value(1));
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const camStyle = useMemo(
    () => CAMERA_STYLES.find((c) => c.id === styleId) ?? CAMERA_STYLES[0],
    [styleId]
  );

  if (!event) {
    return (
      <View style={s.container}>
        <Text style={{ color: C.text, padding: 30 }}>Event not found.</Text>
      </View>
    );
  }

  const shotsLeft = event.shotsPerGuest - event.photos.length;
  const previewUri = STOCK_SHOTS[event.photos.length % STOCK_SHOTS.length];
  const isPolaroid = camStyle.frame === "polaroid";

  const doCapture = async () => {
    cleanup();
    setCounting(0);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    Animated.sequence([
      Animated.timing(shutterAnim, { toValue: 0.85, duration: 60, useNativeDriver: true }),
      Animated.timing(shutterAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    if (flash) {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    }

    const uri = STOCK_SHOTS[Math.floor(Math.random() * STOCK_SHOTS.length)];
    const p = await addPhoto(event.id, { uri, guestName: "You", style: styleId });
    setLastShot(p);
  };

  const shutter = () => {
    if (shotsLeft <= 0) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    if (!timer) {
      doCapture();
      return;
    }
    let n = 3;
    setCounting(n);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    countdownRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        cleanup();
        doCapture();
      } else {
        setCounting(n);
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      }
    }, 1000);
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
            <ChevronLeft color={C.text} size={22} />
          </Pressable>
          <View style={s.eventPill}>
            <View style={s.dotLive} />
            <Text style={s.eventPillText} numberOfLines={1}>{event.name}</Text>
          </View>
          <Pressable
            onPress={() => router.push(`/gallery/${event.id}` as never)}
            style={s.iconBtn}
            hitSlop={10}
          >
            <Images color={C.text} size={18} />
          </Pressable>
        </View>

        <View style={s.viewfinder}>
          <View
            style={[
              s.viewfinderInner,
              isPolaroid ? s.polaroidFrame : null,
              isPolaroid ? null : { borderColor: C.hair, borderWidth: 1 },
            ]}
          >
            <View style={[s.imageArea, isPolaroid ? s.imageAreaPolaroid : null]}>
              <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFillObject as never} contentFit="cover" />
              {/* Filter overlay */}
              <View style={[StyleSheet.absoluteFillObject as never, { backgroundColor: camStyle.overlay }]} />
              {/* Vignette */}
              <LinearGradient
                colors={["transparent", `rgba(0,0,0,${camStyle.vignette})`]}
                start={{ x: 0.5, y: 0.3 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject as never}
              />
              {/* Grain (cheap) */}
              <View style={[s.grain, { opacity: camStyle.grain }]} />

              {/* Corner frame — only on non-polaroid */}
              {!isPolaroid
                ? (["tl", "tr", "bl", "br"] as const).map((p) => (
                    <View key={p} style={[s.corner, s[p]]} />
                  ))
                : null}

              {/* Counter & frame info */}
              <View style={s.topInfo}>
                <View style={s.infoPill}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={s.recDot} />
                    <Text style={s.infoText}>{camStyle.filmLabel}</Text>
                  </View>
                </View>
                <View style={s.infoPill}>
                  <Text style={s.infoText}>
                    EXP {String(event.photos.length + 1).padStart(2, "0")}/{event.shotsPerGuest}
                  </Text>
                </View>
              </View>

              {counting > 0 ? (
                <View style={s.countdownOverlay}>
                  <Text style={s.countdownNum}>{counting}</Text>
                </View>
              ) : null}

              <Animated.View pointerEvents="none" style={[s.flashOverlay, { opacity: flashAnim }]} />
            </View>

            {isPolaroid ? (
              <View style={s.polaroidCaption}>
                <Text style={s.polaroidText}>{event.name}</Text>
                <Text style={s.polaroidDate}>
                  {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Last shot peek */}
          {lastShot ? (
            <View style={s.lastShot}>
              <Image source={{ uri: lastShot.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              <View style={s.lastShotBadge}>
                <Check color={C.text} size={12} />
              </View>
            </View>
          ) : null}
        </View>

        {/* Style strip */}
        <View style={{ paddingTop: 6 }}>
          <Text style={s.stripKicker}>{camStyle.tagline.toUpperCase()}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            {CAMERA_STYLES.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  setStyleId(f.id);
                }}
                style={[s.filterChip, styleId === f.id ? s.filterChipActive : null]}
              >
                <Text style={[s.filterChipText, styleId === f.id ? { color: C.text } : null]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Controls */}
        <View style={s.controls}>
          <Pressable onPress={() => setFlash((v) => !v)} style={[s.sideBtn, flash ? s.sideBtnActive : null]}>
            {flash ? <Zap color={C.gold} size={22} /> : <ZapOff color={C.text} size={22} />}
            <Text style={s.sideBtnText}>{flash ? "On" : "Off"}</Text>
          </Pressable>

          <Pressable onPress={shutter} disabled={shotsLeft <= 0}>
            <Animated.View style={[s.shutter, { transform: [{ scale: shutterAnim }] }]}>
              <LinearGradient
                colors={[C.pinkHi, C.pink, C.pinkDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.shutterInner}
              >
                <View style={s.shutterCore}>
                  <Text style={s.shutterCount}>{shotsLeft}</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </Pressable>

          <Pressable onPress={() => setTimer((v) => !v)} style={[s.sideBtn, timer ? s.sideBtnActive : null]}>
            <Timer color={timer ? C.gold : C.text} size={22} />
            <Text style={s.sideBtnText}>{timer ? "3s" : "Off"}</Text>
          </Pressable>
        </View>

        <View style={s.bottomRow}>
          <Sparkles color={C.pinkHi} size={14} />
          <Text style={s.bottomText}>
            {shotsLeft > 0
              ? `${shotsLeft} shot${shotsLeft === 1 ? "" : "s"} left · locks until reveal`
              : "Roll complete. See you at the reveal ✦"}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
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
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hair,
    maxWidth: 220,
  },
  dotLive: { width: 8, height: 8, borderRadius: 999, backgroundColor: C.pink },
  eventPillText: { color: C.text, fontWeight: "600" as const, fontSize: 12 },
  viewfinder: { flex: 1, paddingHorizontal: 14, paddingTop: 6, alignItems: "center" },
  viewfinderInner: {
    flex: 1,
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 32,
    overflow: "hidden",
  },
  polaroidFrame: {
    backgroundColor: "#FFF8F0",
    borderRadius: 8,
    padding: 14,
    paddingBottom: 56,
    borderColor: "rgba(0,0,0,0.08)",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  imageArea: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  imageAreaPolaroid: { borderRadius: 2 },
  polaroidCaption: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    alignItems: "center",
  },
  polaroidText: { color: "#0A0A0B", fontSize: 14, fontWeight: "700" as const, letterSpacing: 0.4 },
  polaroidDate: { color: "#6E6E78", fontSize: 11, marginTop: 2, letterSpacing: 0.6 },
  grain: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF" },
  corner: { position: "absolute", width: 22, height: 22, borderColor: "rgba(255,255,255,0.9)" },
  tl: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 },
  topInfo: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between" },
  infoPill: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6 },
  infoText: { color: C.text, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.2 },
  recDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: C.pink },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  countdownNum: { color: C.text, fontSize: 120, fontWeight: "800" as const, textShadowColor: "rgba(255,45,122,0.7)", textShadowRadius: 30 },
  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF" },
  lastShot: {
    position: "absolute",
    bottom: 16,
    right: 24,
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#FFF8F0",
    transform: [{ rotate: "-4deg" }],
  },
  lastShotBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: C.success,
    alignItems: "center",
    justifyContent: "center",
  },
  stripKicker: {
    color: C.gold,
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hair,
  },
  filterChipActive: { backgroundColor: C.pink, borderColor: C.pink },
  filterChipText: { color: C.subtext, fontWeight: "700" as const, fontSize: 12, letterSpacing: 0.5 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  sideBtn: {
    alignItems: "center",
    gap: 4,
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
    justifyContent: "center",
  },
  sideBtnActive: { borderColor: C.gold },
  sideBtnText: { color: C.subtext, fontSize: 10, fontWeight: "700" as const, letterSpacing: 0.3 },
  shutter: {
    width: 96,
    height: 96,
    borderRadius: 999,
    padding: 4,
    backgroundColor: C.text,
  },
  shutterInner: { flex: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  shutterCore: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: "#0A0A0B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  shutterCount: { color: C.text, fontSize: 22, fontWeight: "800" as const },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  bottomText: { color: C.subtext, fontSize: 12 },
});
