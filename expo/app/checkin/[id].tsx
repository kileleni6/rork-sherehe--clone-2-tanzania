import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FlashlightIcon,
  Keyboard as KeyboardIcon,
  ScanLine,
  Search,
  SwitchCamera,
  Undo2,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable/PressableScale";
import { Card, EmptyState, GhostButton, IconButton, PrimaryButton, SectionTitle, Tag, useToast } from "@/components/ui";
import { C } from "@/constants/colors";
import { triggerHaptic } from "@/lib/haptics";
import { useEvents } from "@/providers/EventsProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";

/** Extract the 6-character pass code from either a raw code or a QR payload (`SHEREHE:eventId:CODE`). */
function extractCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.includes(":") ? (trimmed.split(":").pop() ?? trimmed) : trimmed;
}

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { findById, checkInGuest, rejectGuest } = useEvents();
  const { t, formatTime } = useOnboarding();
  const toast = useToast();
  const event = findById(id);

  const [query, setQuery] = useState<string>("");
  const [scanInput, setScanInput] = useState<string>("");
  const [lastChecked, setLastChecked] = useState<{ name: string; at: number } | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [torch, setTorch] = useState<boolean>(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanCooldown, setScanCooldown] = useState<boolean>(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string>("");
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const pulse = useRef(new Animated.Value(0)).current;

  // Sweep line animation for the scanner viewfinder.
  useEffect(() => {
    if (manualMode) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [manualMode, pulse]);

  const cameraSupported = Platform.OS !== "web";
  const eventId = event?.id ?? "";
  const rsvps = useMemo(() => event?.rsvps ?? [], [event?.rsvps]);
  const attending = rsvps.filter((r) => r.status !== "no");
  const rejected = attending.filter((r) => typeof r.rejectionReason === "string");
  const active = attending.filter((r) => typeof r.rejectionReason !== "string");
  const arrived = active.filter((r) => typeof r.checkedInAt === "number");
  const pending = active.filter((r) => typeof r.checkedInAt !== "number");
  const expectedCount = attending.reduce((sum, r) => sum + 1 + (r.guests ?? 0), 0);

  const filteredPending = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter(
      (r) => r.name.toLowerCase().includes(q) || r.passCode.toLowerCase().includes(q)
    );
  }, [pending, query]);

  const checkIn = useCallback(
    async (rsvpId: string, name: string) => {
      if (!eventId) return;
      triggerHaptic("success");
      await checkInGuest(eventId, rsvpId, Date.now());
      setLastChecked({ name, at: Date.now() });
      toast.success(`${name} checked in`);
      setTimeout(() => setLastChecked(null), 2500);
    },
    [checkInGuest, eventId, toast]
  );

  const reject = async (rsvpId: string) => {
    if (!eventId) return;
    triggerHaptic("warning");
    await rejectGuest(eventId, rsvpId, rejectionNote.trim() || null);
    setRejectionNote("");
    setRejectingId(null);
  };

  const undoReject = async (rsvpId: string) => {
    if (!eventId) return;
    triggerHaptic("selection");
    await rejectGuest(eventId, rsvpId, null);
  };

  const undo = async (rsvpId: string) => {
    if (!eventId) return;
    triggerHaptic("selection");
    await checkInGuest(eventId, rsvpId, 0);
  };

  const handleResolvedCode = useCallback(
    async (raw: string) => {
      const code = extractCode(raw).toUpperCase();
      if (!code) return;
      const match = rsvps.find((r) => r.passCode.toUpperCase() === code);
      if (!match) {
        triggerHaptic("error");
        Alert.alert(t("checkin_pass_not_found_title"), t("checkin_pass_not_found_body", { code }));
        return;
      }
      if (typeof match.checkedInAt === "number") {
        triggerHaptic("selection");
        Alert.alert(
          t("checkin_already_title"),
          t("checkin_already_body", { name: match.name, time: formatTime(match.checkedInAt) })
        );
        return;
      }
      await checkIn(match.id, match.name);
    },
    [rsvps, checkIn, t, formatTime]
  );

  const onBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      const data = result.data?.trim();
      if (!data || scanCooldown) return;
      // De-dupe rapid repeated scans of the same QR (most scanners fire 5-10×/sec).
      const now = Date.now();
      if (lastScanRef.current.code === data && now - lastScanRef.current.at < 2500) return;
      lastScanRef.current = { code: data, at: now };
      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 1500);
      handleResolvedCode(data);
    },
    [handleResolvedCode, scanCooldown]
  );

  const submitScan = async () => {
    const raw = scanInput.trim();
    if (!raw) return;
    setScanInput("");
    await handleResolvedCode(raw);
  };

  const arrivedPct = expectedCount > 0 ? (arrived.length / expectedCount) * 100 : 0;

  if (!event) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon={Users}
          title={t("checkin_event_not_found")}
          subtitle=""
          action={{ label: "Go back", onPress: () => router.back() }}
        />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["rgba(255,45,122,0.18)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 240 }}
      />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="glass" iconSize={22} haptic="light" />
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={s.topKicker}>{t("checkin_kicker")}</Text>
            <Text style={s.topTitle} numberOfLines={1}>{event.name}</Text>
          </View>
          <IconButton
            icon={KeyboardIcon}
            onPress={() => { triggerHaptic("selection"); setManualMode((v) => !v); }}
            variant="glass"
            iconSize={18}
            color={manualMode ? C.pinkHi : C.text}
            haptic={false}
          />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 40 + Math.max(insets.bottom, 8) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Live counter */}
          <Card style={s.counterCard}>
            <View style={s.counterTop}>
              <View>
                <Text style={s.counterValue}>
                  {arrived.length}
                  <Text style={s.counterTotal}> / {expectedCount}</Text>
                </Text>
                <Text style={s.counterLabel}>{t("checkin_guests_arrived")}</Text>
              </View>
              <View style={s.counterIcon}>
                <Users color={C.pinkHi} size={24} />
              </View>
            </View>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${arrivedPct}%` }]} />
            </View>
            <View style={s.counterMeta}>
              <View style={s.counterMetaItem}>
                <View style={[s.dot, { backgroundColor: C.success }]} />
                <Text style={s.counterMetaText}>{t("checkin_in", { n: arrived.length })}</Text>
              </View>
              <View style={s.counterMetaItem}>
                <View style={[s.dot, { backgroundColor: C.gold }]} />
                <Text style={s.counterMetaText}>{t("checkin_expected", { n: pending.length })}</Text>
              </View>
            </View>
          </Card>

          {/* Scanner */}
          <SectionTitle style={{ marginTop: 22 }}>{t("checkin_scan_title")}</SectionTitle>
          <Text style={s.helperText}>
            {manualMode ? t("checkin_scan_manual_helper") : t("checkin_scan_helper")}
          </Text>

          {!manualMode ? (
            <View style={s.scannerWrap}>
              {!cameraSupported ? (
                <View style={s.scannerPlaceholder}>
                  <ScanLine color={C.pinkHi} size={32} />
                  <Text style={s.placeholderTitle}>{t("checkin_camera_unavailable")}</Text>
                  <Text style={s.placeholderSub}>{t("checkin_camera_unavailable_body")}</Text>
                  <PrimaryButton title={t("checkin_scan_cta")} icon={KeyboardIcon} onPress={() => setManualMode(true)} />
                </View>
              ) : !permission ? (
                <View style={s.scannerPlaceholder}>
                  <Text style={s.placeholderSub}>…</Text>
                </View>
              ) : !permission.granted ? (
                <View style={s.scannerPlaceholder}>
                  <ScanLine color={C.pinkHi} size={32} />
                  <Text style={s.placeholderTitle}>{t("checkin_permission_title")}</Text>
                  <Text style={s.placeholderSub}>{t("checkin_permission_body")}</Text>
                  <PrimaryButton title={t("checkin_permission_grant")} onPress={() => requestPermission()} />
                </View>
              ) : (
                <View style={s.scannerCamWrap}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing={facing}
                    enableTorch={torch}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={onBarcode}
                  />
                  {/* Frame & sweep */}
                  <View pointerEvents="none" style={s.frameOverlay}>
                    {(["tl", "tr", "bl", "br"] as const).map((p) => (
                      <View key={p} style={[s.frameCorner, s[`corner_${p}`]]} />
                    ))}
                    <Animated.View
                      style={[
                        s.sweep,
                        {
                          transform: [
                            {
                              translateY: pulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 200],
                              }),
                            },
                          ],
                          opacity: pulse.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 0.9, 0],
                          }),
                        },
                      ]}
                    />
                  </View>

                  {/* Floating controls */}
                  <View style={s.camControls}>
                    <Pressable
                      onPress={() => setTorch((v) => !v)}
                      style={[s.camBtn, torch ? s.camBtnActive : null]}
                      hitSlop={10}
                    >
                      <FlashlightIcon color={torch ? C.gold : C.text} size={16} />
                      <Text style={s.camBtnText}>{torch ? t("checkin_torch_on") : t("checkin_torch_off")}</Text>
                    </Pressable>
                    <View style={s.aimHint}>
                      <Text style={s.aimHintText}>{t("checkin_aim_hint")}</Text>
                    </View>
                    <Pressable
                      onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
                      style={s.camBtn}
                      hitSlop={10}
                    >
                      <SwitchCamera color={C.text} size={16} />
                      <Text style={s.camBtnText}>{t("checkin_flip")}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={s.scanCard}>
              <View style={s.scanIcon}>
                <ScanLine color={C.pinkHi} size={22} />
              </View>
              <TextInput
                placeholder={t("checkin_scan_placeholder")}
                placeholderTextColor={C.mute}
                value={scanInput}
                onChangeText={(v) => setScanInput(v.toUpperCase().replace(/[^A-Z0-9:]/g, "").slice(0, 24))}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={submitScan}
                returnKeyType="done"
                style={s.scanInput}
              />
              <Pressable
                onPress={submitScan}
                disabled={!scanInput.trim()}
                style={[s.scanBtn, { opacity: scanInput.trim() ? 1 : 0.4 }]}
              >
                <Text style={s.scanBtnText}>{t("checkin_scan_cta")}</Text>
              </Pressable>
            </View>
          )}

          {lastChecked ? (
            <View style={s.toast}>
              <CheckCircle2 color={C.success} size={18} />
              <Text style={s.toastText}>
                {t("checkin_toast", { name: lastChecked.name, time: formatTime(lastChecked.at) })}
              </Text>
            </View>
          ) : null}

          {/* Search expected */}
          <SectionTitle style={{ marginTop: 22 }}>{t("checkin_not_yet")}</SectionTitle>
          <View style={s.searchRow}>
            <Search color={C.mute} size={16} />
            <TextInput
              placeholder={t("checkin_search_placeholder")}
              placeholderTextColor={C.mute}
              value={query}
              onChangeText={setQuery}
              style={s.searchInput}
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <X color={C.mute} size={16} />
              </Pressable>
            ) : null}
          </View>

          <View style={{ gap: 8, marginTop: 12 }}>
            {filteredPending.map((r) => (
              <View key={r.id} style={s.guestRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{r.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.guestName}>{r.name}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 2, alignItems: "center" }}>
                    <Text style={s.passCode}>{r.passCode}</Text>
                    {r.guests > 0 ? (
                      <Text style={s.guestExtra}>
                        {r.guests === 1
                          ? t("checkin_plus_guests_one", { n: r.guests })
                          : t("checkin_plus_guests_many", { n: r.guests })}
                      </Text>
                    ) : null}
                  </View>
                  {rejectingId === r.id ? (
                    <View style={s.rejectInline}>
                      <TextInput
                        placeholder={t("checkin_reject_reason_placeholder")}
                        placeholderTextColor={C.mute}
                        value={rejectionNote}
                        onChangeText={setRejectionNote}
                        style={s.rejectInput}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => reject(r.id)}
                      />
                      <View style={s.rejectActions}>
                        <Pressable onPress={() => { setRejectingId(null); setRejectionNote(""); }} style={s.rejectCancelBtn}>
                          <X color={C.subtext} size={14} />
                        </Pressable>
                        <Pressable onPress={() => reject(r.id)} style={s.rejectConfirmBtn}>
                          <Ban color={C.text} size={14} />
                          <Text style={s.rejectConfirmText}>{t("checkin_reject_btn")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
                <View style={{ gap: 6 }}>
                  <PressableScale onPress={() => checkIn(r.id, r.name)} haptic="success" pressedScale={0.97} style={s.checkBtn}>
                    <CheckCircle2 color={C.text} size={16} />
                    <Text style={s.checkBtnText}>{t("checkin_scan_cta")}</Text>
                  </PressableScale>
                  <PressableScale
                    onPress={() => { setRejectingId(r.id); setRejectionNote(""); }}
                    style={s.rejectBtn}
                    hitSlop={6}
                  >
                    <Ban color={C.subtext} size={14} />
                  </PressableScale>
                </View>
              </View>
            ))}
            {filteredPending.length === 0 ? (
              <View style={s.empty}>
                <CheckCircle2 color={C.success} size={22} />
                <Text style={s.emptyTitle}>
                  {pending.length === 0 ? t("checkin_everyone_here") : t("checkin_no_matches")}
                </Text>
                <Text style={s.emptySub}>
                  {pending.length === 0 ? t("checkin_everyone_here_sub") : t("checkin_no_matches_sub")}
                </Text>
              </View>
            ) : null}
          </View>

          {arrived.length > 0 ? (
            <>
              <SectionTitle style={{ marginTop: 24 }}>{t("checkin_arrivals")}</SectionTitle>
              <View style={{ gap: 8, marginTop: 8 }}>
                {[...arrived]
                  .sort((a, b) => (b.checkedInAt ?? 0) - (a.checkedInAt ?? 0))
                  .map((r) => (
                    <View key={r.id} style={[s.guestRow, { borderColor: "rgba(61,214,140,0.25)" }]}>
                      <View style={[s.avatar, { backgroundColor: "rgba(61,214,140,0.18)" }]}>
                        <CheckCircle2 color={C.success} size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.guestName}>{r.name}</Text>
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 2, alignItems: "center" }}>
                          <Clock color={C.subtext} size={11} />
                          <Text style={s.guestExtra}>
                            {formatTime(r.checkedInAt ?? 0)}
                          </Text>
                          {r.guests > 0 ? <Tag label={`+${r.guests}`} tone="mute" /> : null}
                        </View>
                      </View>
                      <Pressable onPress={() => undo(r.id)} hitSlop={6} style={s.undoBtn}>
                        <Undo2 color={C.subtext} size={14} />
                      </Pressable>
                    </View>
                  ))}
              </View>
            </>
          ) : null}

          {rejected.length > 0 ? (
            <>
              <SectionTitle style={{ marginTop: 24 }}>{t("checkin_rejected_title")}</SectionTitle>
              <View style={{ gap: 8, marginTop: 8 }}>
                {rejected.map((r) => (
                  <View key={r.id} style={[s.guestRow, { borderColor: "rgba(255,69,58,0.25)" }]}>
                    <View style={[s.avatar, { backgroundColor: "rgba(255,69,58,0.15)" }]}>
                      <Ban color={C.danger} size={15} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.guestName}>{r.name}</Text>
                      <Text style={s.guestExtra}>
                        {r.rejectionReason && r.rejectionReason !== "(no reason)" ? r.rejectionReason : t("checkin_rejected_no_reason")}
                      </Text>
                    </View>
                    <Pressable onPress={() => undoReject(r.id)} hitSlop={6} style={s.undoBtn}>
                      <Undo2 color={C.subtext} size={14} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <GhostButton title={t("checkin_done")} onPress={() => router.back()} style={{ marginTop: 26 }} />
        </ScrollView>
        </KeyboardAvoidingView>
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
  iconBtn: {
    width: 38, height: 38, borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  topKicker: { color: C.pinkHi, fontSize: 9, letterSpacing: 2, fontWeight: "800" as const },
  topTitle: { color: C.text, fontWeight: "700" as const, fontSize: 15, maxWidth: 220 },
  counterCard: { gap: 12 },
  counterTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counterValue: { color: C.text, fontSize: 38, fontWeight: "800" as const, letterSpacing: -1, fontVariant: ["tabular-nums"] },
  counterTotal: { color: C.mute, fontSize: 22, fontWeight: "700" as const },
  counterLabel: { color: C.subtext, fontSize: 12, fontWeight: "600" as const, marginTop: 2 },
  counterIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "rgba(255,45,122,0.16)",
    alignItems: "center", justifyContent: "center",
  },
  progressBar: { height: 8, backgroundColor: C.cardHi, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.pink },
  counterMeta: { flexDirection: "row", gap: 14 },
  counterMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  counterMetaText: { color: C.subtext, fontSize: 12, fontWeight: "600" as const },
  dot: { width: 8, height: 8, borderRadius: 999 },
  helperText: { color: C.subtext, fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 12 },

  // Scanner
  scannerWrap: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: C.hair },
  scannerCamWrap: {
    aspectRatio: 1,
    width: "100%",
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    margin: 40,
  },
  frameCorner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: C.pinkHi,
  },
  corner_tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  corner_tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  corner_bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  corner_br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  sweep: {
    position: "absolute",
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: C.pinkHi,
    shadowColor: C.pinkHi,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  camControls: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  camBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  camBtnActive: { borderColor: C.gold },
  camBtnText: { color: C.text, fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.5 },
  aimHint: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)",
  },
  aimHintText: { color: C.text, fontSize: 11, fontWeight: "600" as const },
  scannerPlaceholder: {
    aspectRatio: 1,
    width: "100%",
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  placeholderTitle: { color: C.text, fontWeight: "700" as const, fontSize: 14, marginTop: 4 },
  placeholderSub: { color: C.subtext, fontSize: 12, textAlign: "center", lineHeight: 18, paddingHorizontal: 12 },
  placeholderBtn: {
    marginTop: 8,
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 999, backgroundColor: C.pink,
  },
  placeholderBtnText: { color: C.text, fontWeight: "800" as const, fontSize: 12 },

  // Manual input
  scanCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 8, paddingLeft: 14,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.hair,
  },
  scanIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,45,122,0.16)",
    alignItems: "center", justifyContent: "center",
  },
  scanInput: {
    flex: 1, color: C.text, fontSize: 16, fontWeight: "700" as const,
    letterSpacing: 2, paddingVertical: 8,
  },
  scanBtn: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.pink,
  },
  scanBtnText: { color: C.text, fontWeight: "800" as const, fontSize: 13 },

  toast: {
    marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: "rgba(61,214,140,0.12)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(61,214,140,0.3)",
  },
  toastText: { color: C.text, fontSize: 13, fontWeight: "600" as const, flex: 1 },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.hair, marginTop: 8,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 2 },
  guestRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 16,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.hair,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 999,
    backgroundColor: C.cardHi,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: C.text, fontWeight: "800" as const, fontSize: 14 },
  guestName: { color: C.text, fontSize: 14, fontWeight: "700" as const },
  passCode: { color: C.pinkHi, fontSize: 11, fontWeight: "800" as const, letterSpacing: 2 },
  guestExtra: { color: C.subtext, fontSize: 11, fontWeight: "600" as const },
  checkBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, backgroundColor: C.pink,
  },
  checkBtnText: { color: C.text, fontSize: 12, fontWeight: "800" as const },
  rejectBtn: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: "rgba(255,69,58,0.15)",
    borderWidth: 1, borderColor: "rgba(255,69,58,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  rejectInline: { marginTop: 8, gap: 8 },
  rejectInput: {
    backgroundColor: C.cardHi, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    color: C.text, fontSize: 13,
    borderWidth: 1, borderColor: "rgba(255,69,58,0.3)",
  },
  rejectActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  rejectCancelBtn: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: C.cardHi, alignItems: "center", justifyContent: "center",
  },
  rejectConfirmBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, backgroundColor: C.danger,
  },
  rejectConfirmText: { color: C.text, fontWeight: "800" as const, fontSize: 12 },
  undoBtn: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: C.cardHi,
    alignItems: "center", justifyContent: "center",
  },
  empty: {
    alignItems: "center", gap: 6, paddingVertical: 28,
    backgroundColor: C.card, borderRadius: 18,
    borderWidth: 1, borderStyle: "dashed", borderColor: C.hair,
  },
  emptyTitle: { color: C.text, fontWeight: "700" as const, fontSize: 14, marginTop: 4 },
  emptySub: { color: C.subtext, fontSize: 12, textAlign: "center", paddingHorizontal: 18 },
});
