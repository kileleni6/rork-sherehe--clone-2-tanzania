import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  ChevronLeft,
  Copy,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable/PressableScale";
import {
  Card,
  Chip,
  EmptyState,
  FadeInView,
  GhostButton,
  IconButton,
  PrimaryButton,
  SectionTitle,
  ShimmerImage,
  TextField,
  useToast,
} from "@/components/ui";
import { C } from "@/constants/colors";
import { triggerHaptic } from "@/lib/haptics";
import type { InvitationEmail } from "@/lib/email";
import { sendBulkInvitations } from "@/lib/email";
import type { InvitationSms } from "@/lib/sms";
import { sendBulkInvitationsSms } from "@/lib/sms";
import { getTemplate, useEvents } from "@/providers/EventsProvider";

interface GuestEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
}

type SendPhase = "idle" | "sending" | "done";

export default function GuestListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { findById } = useEvents();
  const event = findById(id);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [phase, setPhase] = useState<SendPhase>("idle");
  const [sent, setSent] = useState<number>(0);
  const [failed, setFailed] = useState<number>(0);
  const [addError, setAddError] = useState<string>("");
  const animProgress = useRef(new Animated.Value(0)).current;

  const tpl = useMemo(() => (event ? getTemplate(event.template) : undefined), [event]);

  const url = event ? `https://sherehe.app/i/${event.id}` : "";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&color=FFFFFF&bgcolor=14141A&qzone=1&data=${encodeURIComponent(url)}`;

  if (!event || !tpl) {
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

  const hasContact = email.trim() || phone.trim();
  const canAdd = name.trim() && hasContact;

  const addGuest = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setAddError("Please enter a guest name.");
      triggerHaptic("light");
      return;
    }
    if (!hasContact) {
      setAddError("Please enter an email or phone number.");
      triggerHaptic("light");
      return;
    }
    triggerHaptic("selection");
    setGuests((prev) => [
      ...prev,
      { id: `g_${Date.now()}`, name: trimmed, email: email.trim(), phone: phone.trim() },
    ]);
    setName("");
    setEmail("");
    setPhone("");
    setAddError("");
  };

  const removeGuest = (gid: string) => {
    triggerHaptic("light");
    setGuests((prev) => prev.filter((g) => g.id !== gid));
  };

  const shareViaSystem = async () => {
    triggerHaptic("selection");
    const message = `You're invited to ${event.name}! ${url}`;
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
      await Share.share({ message, url, title: event.name });
    } catch (e) {
      console.log("[share]", e);
      try {
        await Clipboard.setStringAsync(url);
        Alert.alert("Link copied", `Paste this invite link anywhere:\n\n${url}`);
      } catch {
        Alert.alert("Share invite", `Share this link:\n\n${url}`);
      }
    }
  };

  const shareViaWhatsApp = async () => {
    triggerHaptic("selection");
    const message = encodeURIComponent(`You're invited to ${event.name}! 🎉\n\n${url}`);
    const waUrl = `https://wa.me/?text=${message}`;
    try {
      await Linking.openURL(waUrl);
    } catch {
      await Clipboard.setStringAsync(url);
      toast.success("Invite link copied — share on WhatsApp");
    }
  };

  const copyLink = async () => {
    triggerHaptic("selection");
    try {
      await Clipboard.setStringAsync(url);
      toast.success("Invite link copied");
    } catch {
      // noop
    }
  };

  const sendInvites = async () => {
    if (guests.length === 0) return;
    triggerHaptic("success");
    setPhase("sending");
    setSent(0);
    setFailed(0);

    try {
      const dateStr = new Date(event.date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      // Count actual operations: one per email invite + one per SMS invite
      const totalOps =
        guests.filter((g) => g.email.trim()).length +
        guests.filter((g) => g.phone.trim()).length;
      let opsDone = 0;

      const tick = () => {
        opsDone++;
        const pct = totalOps > 0 ? Math.min(opsDone / totalOps, 0.98) : 0;
        Animated.timing(animProgress, {
          toValue: pct,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      };

      const emailInvites: InvitationEmail[] = [];
      const smsInvites: InvitationSms[] = [];

      for (const g of guests) {
        if (g.email.trim()) {
          emailInvites.push({
            guestName: g.name,
            guestEmail: g.email.trim(),
            eventName: event.name,
            hostName: event.hostName,
            date: dateStr,
            venue: event.venue,
            inviteUrl: url,
          });
        }
        if (g.phone.trim()) {
          smsInvites.push({
            guestPhone: g.phone.trim(),
            guestName: g.name,
            eventName: event.name,
            hostName: event.hostName,
            date: dateStr,
            venue: event.venue,
            inviteUrl: url,
          });
        }
      }

      // Run email and SMS sends in parallel, with safe result handling
      const sendEmail = emailInvites.length > 0
        ? sendBulkInvitations(emailInvites).then((r) => {
            const safe = r ?? { sent: 0, failed: 0 };
            for (let i = 0; i < safe.sent + safe.failed; i++) tick();
            return safe;
          })
        : Promise.resolve({ sent: 0, failed: 0 });

      const sendSms = smsInvites.length > 0
        ? sendBulkInvitationsSms(smsInvites).then((r) => {
            const safe = r ?? { sent: 0, failed: 0 };
            for (let i = 0; i < safe.sent + safe.failed; i++) tick();
            return safe;
          })
        : Promise.resolve({ sent: 0, failed: 0 });

      const [emailResult, smsResult] = await Promise.all([sendEmail, sendSms]);

      const totalSent = (emailResult?.sent ?? 0) + (smsResult?.sent ?? 0);
      const totalFailed = (emailResult?.failed ?? 0) + (smsResult?.failed ?? 0);

      setSent(totalSent);
      setFailed(totalFailed);
      setPhase("done");

      // Ensure bar fills to 100%
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();

      if (totalSent > 0) {
        toast.success(`${totalSent} invitation${totalSent === 1 ? "" : "s"} sent!`);
      } else {
        toast.error("No invitations sent. Please check your connection and try again.");
      }
    } catch (e: unknown) {
      console.log("[guest-list] sendInvites failed", e instanceof Error ? e.message : String(e));
      setPhase("done");
      setSent(0);
      setFailed(guests.length);
      toast.error("Something went wrong. Please try again or use the share link below.");
    }
  };

  const goToEvent = () => {
    router.replace(`/event/${event.id}` as never);
  };

  const hasEmail = guests.some((g) => g.email.trim());
  const hasPhone = guests.some((g) => g.phone.trim());
  const canSend = guests.length > 0 && (hasEmail || hasPhone);

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[tpl.bg[0], "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
      />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="glass" iconSize={22} haptic="light" />
          <Text style={s.headerTitle}>Share invitations</Text>
          <View style={{ width: 38 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {/* --- Event summary --- */}
          <FadeInView>
            <Card style={s.eventSummary}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={s.eventIcon}>
                  <Send color={C.pinkHi} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.eventName} numberOfLines={1}>{event.name}</Text>
                  <Text style={s.eventMeta}>{event.venue} · {new Date(event.date).toLocaleDateString()}</Text>
                </View>
              </View>
            </Card>
          </FadeInView>

          {/* --- Guest entry form --- */}
          {phase === "idle" ? (
            <FadeInView delay={40}>
              <SectionTitle style={{ marginTop: 24 }}>Add guests</SectionTitle>
              <Text style={s.muteSub}>
                Enter guest names and emails to send beautiful branded invitations via Resend. Phone (SMS) is optional — the invite link works great on its own too.
              </Text>

              <Card style={{ marginTop: 14, gap: 12 }}>
                <TextField
                  label="Guest name"
                  placeholder="e.g. Zuri Mensah"
                  value={name}
                  onChangeText={setName}
                  icon={Users}
                />
                <TextField
                  label="Email"
                  placeholder="zuri@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon={Mail}
                />
                <View style={s.phoneDivider}>
                  <View style={s.phoneDividerLine} />
                  <Text style={s.phoneDividerText}>or send via SMS instead</Text>
                  <View style={s.phoneDividerLine} />
                </View>
                <TextField
                  label="Phone (optional · Twilio required)"
                  placeholder="+1 234 567 8900"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  icon={Phone}
                />
                {addError ? (
                  <Text style={s.addError}>{addError}</Text>
                ) : null}
                <PressableScale
                  onPress={addGuest}
                  haptic="selection"
                  pressedScale={0.97}
                  disabled={!canAdd}
                  style={[s.addBtn, { opacity: canAdd ? 1 : 0.4 }]}
                >
                  <Plus color={C.text} size={18} />
                  <Text style={s.addBtnText}>Add guest</Text>
                </PressableScale>
              </Card>

              {/* --- Guest list --- */}
              {guests.length > 0 ? (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <SectionTitle style={{ marginTop: 0 }}>
                      {guests.length} guest{guests.length === 1 ? "" : "s"}
                    </SectionTitle>
                    <Text style={s.guestCount}>
                      {hasEmail && hasPhone
                        ? "Email + SMS"
                        : hasEmail
                          ? "Email"
                          : hasPhone
                            ? "SMS"
                            : "No contact"}
                    </Text>
                  </View>
                  <View style={s.guestGrid}>
                    {guests.map((g) => (
                      <View key={g.id} style={s.guestChip}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={s.guestChipName} numberOfLines={1}>{g.name}</Text>
                          {g.email ? (
                            <Text style={s.guestChipDetail} numberOfLines={1}>{g.email}</Text>
                          ) : null}
                          {g.phone ? (
                            <Text style={s.guestChipDetail} numberOfLines={1}>{g.phone}</Text>
                          ) : null}
                        </View>
                        <IconButton icon={X} onPress={() => removeGuest(g.id)} size={28} iconSize={14} color={C.danger} variant="ghost" haptic="light" />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </FadeInView>
          ) : null}

          {/* --- Sending progress --- */}
          {phase === "sending" ? (
            <FadeInView delay={40}>
              <SectionTitle style={{ marginTop: 24 }}>Sending invitations…</SectionTitle>
              <Card style={{ marginTop: 14, alignItems: "center", gap: 16, paddingVertical: 28 }}>
                <Text style={s.sendingEmoji}>✉️</Text>
                <View style={s.progressTrack}>
                  <Animated.View
                    style={[
                      s.progressFill,
                      {
                        width: animProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={s.sendingLabel}>
                  Sending {guests.filter((g) => g.email || g.phone).length} invitations via{" "}
                  {hasEmail && hasPhone ? "Email & SMS" : hasEmail ? "Email" : "SMS"}…
                </Text>
              </Card>
            </FadeInView>
          ) : null}

          {/* --- Done --- */}
          {phase === "done" ? (
            <FadeInView delay={40}>
              <SectionTitle style={{ marginTop: 24 }}>Invitations sent</SectionTitle>
              <Card style={{ marginTop: 14, alignItems: "center", gap: 12, paddingVertical: 28 }}>
                <View style={s.doneCircle}>
                  <Check color={C.text} size={28} />
                </View>
                <Text style={s.doneTitle}>
                  {sent} sent{failed > 0 ? ` · ${failed} failed` : ""}
                </Text>
                <Text style={s.doneSub}>
                  Guests received a branded Sherehe invitation with a direct RSVP link.
                </Text>
                <View style={s.doneChips}>
                  {hasEmail ? (
                    <View style={s.doneChip}>
                      <Mail color={C.pinkHi} size={12} />
                      <Text style={s.doneChipText}>Email via Resend</Text>
                    </View>
                  ) : null}
                  {hasPhone ? (
                    <View style={s.doneChip}>
                      <MessageCircle color={C.gold} size={12} />
                      <Text style={s.doneChipText}>SMS via Twilio</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </FadeInView>
          ) : null}

          {/* --- QR & Link fallback --- */}
          {phase !== "sending" ? (
            <FadeInView delay={80}>
              <SectionTitle style={{ marginTop: 28 }}>Or share the link</SectionTitle>
              <Text style={s.muteSub}>
                {phase === "done"
                  ? "You can also share the link directly with guests who weren't on the list."
                  : "Copy the link or share via WhatsApp, SMS, or any app."}
              </Text>
              <Card style={{ marginTop: 14, alignItems: "center", gap: 14, paddingVertical: 22 }}>
                <View style={s.qrFrame}>
                  <ShimmerImage uri={qrUrl} style={{ width: "100%", height: "100%" }} borderRadius={16} />
                </View>
                <View style={s.urlPill}>
                  <LinkIcon color={C.subtext} size={14} />
                  <Text style={s.urlText} numberOfLines={1}>{url}</Text>
                  <IconButton icon={Copy} onPress={copyLink} size={32} iconSize={16} color={C.pinkHi} variant="ghost" haptic="light" />
                </View>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  <Chip label="WhatsApp" icon="💬" onPress={shareViaWhatsApp} />
                  <Chip label="Copy link" icon="📋" onPress={copyLink} />
                  <Chip label="Share…" icon="↗" onPress={shareViaSystem} />
                </View>
              </Card>
            </FadeInView>
          ) : null}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* --- Footer --- */}
      <View style={[s.footer, { paddingBottom: 14 + Math.max(insets.bottom, 6) }]}>
        {phase === "idle" ? (
          <View style={{ gap: 10 }}>
            {canSend ? (
              <PrimaryButton title="Send all invitations" icon={Send} onPress={sendInvites} />
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {!canSend ? (
                <PrimaryButton title="Share via link" icon={Share2} onPress={shareViaSystem} style={{ flex: 1 }} />
              ) : null}
              <GhostButton
                title="Skip for now"
                onPress={goToEvent}
                style={{ flex: canSend ? 1 : undefined }}
              />
            </View>
          </View>
        ) : phase === "sending" ? (
          <Text style={s.footerHint}>Sending your invitations…</Text>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <GhostButton title="Send more" icon={Plus} onPress={() => { setPhase("idle"); setSent(0); setFailed(0); }} style={{ flex: 1 }} />
            <PrimaryButton title="View event" onPress={goToEvent} style={{ flex: 1.2 }} />
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: { color: C.text, fontWeight: "700" as const, fontSize: 16 },
  muteSub: { color: C.subtext, fontSize: 13, marginTop: 6, lineHeight: 19 },
  phoneDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    marginBottom: 4,
  },
  phoneDividerLine: { flex: 1, height: 1, backgroundColor: C.hair },
  phoneDividerText: {
    color: C.mute,
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
  },

  eventSummary: { padding: 14 },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,45,122,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  eventName: { color: C.text, fontWeight: "800" as const, fontSize: 16 },
  eventMeta: { color: C.subtext, fontSize: 12, marginTop: 3 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.pink,
    marginTop: 4,
  },
  addBtnText: { color: C.text, fontWeight: "700" as const, fontSize: 15 },
  addError: { color: C.danger, fontSize: 12, fontWeight: "600" as const, marginTop: 8, marginBottom: -2, textAlign: "center" },
  guestCount: { color: C.gold, fontSize: 12, fontWeight: "700" as const },
  guestGrid: { gap: 8 },
  guestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: C.cardHi,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
  },
  guestChipName: { color: C.text, fontWeight: "700" as const, fontSize: 14 },
  guestChipDetail: { color: C.subtext, fontSize: 11, marginTop: 1 },
  sendingEmoji: { fontSize: 44 },
  sendingLabel: { color: C.subtext, fontSize: 13, textAlign: "center", lineHeight: 19 },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: C.hair,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.pink,
    borderRadius: 4,
  },
  doneCircle: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: C.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  doneTitle: { color: C.text, fontSize: 18, fontWeight: "800" as const },
  doneSub: { color: C.subtext, fontSize: 13, textAlign: "center", lineHeight: 19, paddingHorizontal: 12 },
  doneChips: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap", justifyContent: "center" },
  doneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.cardHi,
    borderWidth: 1,
    borderColor: C.hair,
  },
  doneChipText: { color: C.subtext, fontSize: 11, fontWeight: "600" as const },
  qrFrame: {
    width: 180,
    height: 180,
    backgroundColor: C.bgElev,
    borderRadius: 24,
    overflow: "hidden",
    padding: 14,
    borderWidth: 1,
    borderColor: C.hair,
  },
  urlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.cardHi,
    borderRadius: 999,
    maxWidth: "100%",
  },
  urlText: { color: C.text, fontSize: 13, fontWeight: "500" as const, maxWidth: 180 },
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
  footerHint: { color: C.subtext, fontSize: 13, textAlign: "center" },
});
