import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Camera as CameraIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ImagePlus,
  Lock,
  Plus,
  RefreshCw,
  ScanLine,
  Sparkles,
  Unlock,
  Wand2,
  X,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { generateInvitationMessage } from "@/lib/ai";
import { triggerHaptic } from "@/lib/haptics";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Calendar } from "@/components/Calendar";
import { InvitationCard } from "@/components/InvitationCard";
import { PressableScale } from "@/components/pressable/PressableScale";
import { Chip, EmptyState, FadeInView, GhostButton, IconButton, PrimaryButton, ShimmerImage, TextField } from "@/components/ui";
import { MOTION } from "@/constants/motion";
import { C } from "@/constants/colors";
import {
  COVER_CATEGORIES,
  EVENT_TYPES,
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  TIME_OF_DAY,
  timeOfDayFromDate,
  type EventTypeId,
  type TemplateCategory,
  type TemplateId,
  type TimeOfDayId,
} from "@/constants/templates";
import { useEvents } from "@/providers/EventsProvider";
import type { ScheduleItem } from "@/types/event";

const TOTAL_STEPS = 6;

type RevealMode = "start" | "plus1h" | "plus6h" | "plus24h" | "custom";
type UploadPerm = "all" | "rsvp" | "approved";
type Privacy = "private" | "public" | "passcode";
type Visibility = "all_after_reveal" | "rsvp_only" | "host_only";

const SHOT_PRESETS: { value: number; label: string; sub: string }[] = [
  { value: 5, label: "5", sub: "Mini roll" },
  { value: 10, label: "10", sub: "Disposable" },
  { value: 24, label: "24", sub: "Classic film" },
  { value: 36, label: "36", sub: "Full roll · max" },
];

const MAX_SHOTS_PER_GUEST = 36;
const STORAGE_RETENTION_DAYS = 30;

const REVEAL_OPTIONS: { id: RevealMode; label: string; sub: string }[] = [
  { id: "start", label: "At event start", sub: "Unlock the moment doors open" },
  { id: "plus1h", label: "+1 hour after", sub: "A quick wait then the reveal" },
  { id: "plus6h", label: "+6 hours after", sub: "Same-night reveal" },
  { id: "plus24h", label: "+24 hours after", sub: "Classic disposable wait" },
];

function computeRevealAt(start: number, mode: RevealMode): number {
  const hour = 3600 * 1000;
  switch (mode) {
    case "start":
      return start;
    case "plus1h":
      return start + hour;
    case "plus6h":
      return start + 6 * hour;
    case "plus24h":
    default:
      return start + 24 * hour;
  }
}

const COPY_VARIANTS: Record<EventTypeId, string[]> = {
  wedding: [
    "Together with our families, we joyfully invite you to witness our forever begin.",
    "Two hearts, one promise — please join us as we say 'I do' and dance the night away.",
    "A celebration of love, family and the start of our greatest adventure. We'd be honored to have you there.",
    "From the first dance to the last toast — we want you in every memory of our wedding day.",
  ],
  birthday: [
    "Come sip, dance and toast another trip around the sun with me!",
    "Cake. Confetti. Chaos in the best way. You're invited to my birthday.",
    "It's officially my birthday era — bring your loudest 'happy birthday' voice.",
    "Another year wiser (debatable). Let's celebrate with the people who make it worth it.",
  ],
  baby: [
    "A tiny miracle is on the way — celebrate the joy with us.",
    "Little hands, little feet, little party — come shower baby with love.",
    "Before lullabies and late nights, let's gather for cupcakes and cuddles.",
    "Baby's first guest list. Hope you can make it!",
  ],
  graduation: [
    "From late nights to a new chapter — please join us as we celebrate.",
    "Cap tossed, diploma in hand — time to celebrate everyone who made it possible.",
    "Four years, countless coffees, one big milestone. Come raise a glass with us.",
    "The tassel was worth the hassle. Join the celebration!",
  ],
  vacation: [
    "Pack lightly, smile widely. Join the getaway of the year.",
    "Sun, sea and slow mornings — the trip we've been talking about is finally happening.",
    "Out-of-office mode: on. Adventure mode: ON. Come along for the ride.",
    "Bags packed, group chat ready. Here's everything you need for our escape.",
  ],
  private: [
    "An intimate evening of good people, good music and great stories.",
    "A quiet kind of celebration — just our favorite people, dressed up and undone.",
    "No occasion. Just us. Bring your best self and an open glass.",
    "Doors closed, hearts open. You're invited to a private evening.",
  ],
  brand: [
    "Doors open. Glasses up. Step inside the experience.",
    "An evening to mark the moment — meet the team, see the work, share the story.",
    "Curated drinks, a few surprises and the people behind the brand. Save the date.",
    "You're invited to a night where the brand meets its biggest believers.",
  ],
  engagement: [
    "We said yes — now let's celebrate with the people who said yes to us first.",
    "A ring, a promise, a party. Come toast the beginning of forever.",
    "Engaged! Save the date for an evening of love, laughter and bubbly.",
    "From 'will you' to 'we will' — please join us as we celebrate our engagement.",
  ],
  corporate: [
    "Join us for an evening of insights, conversation and connection.",
    "Doors open. Ideas flow. We'd love to have you in the room.",
    "An invitation to spend the evening with the team behind the work.",
    "A moment to mark what's next — please join us.",
  ],
  concert: [
    "Lights down, volume up. You're on the guest list.",
    "One night. One stage. Don't miss it.",
    "Live music, good people, unforgettable energy. See you there.",
    "This one's going to be loud — come sing along.",
  ],
  festival: [
    "Sun, sound and a few thousand of our closest friends. Join us.",
    "Pack your dancing shoes — the festival of the year is back.",
    "Three stages, endless moments. You're invited.",
    "Come for the music, stay for the magic.",
  ],
  religious: [
    "With grateful hearts, we invite you to share in this sacred celebration.",
    "Please join us as we gather in faith, family and joy.",
    "A blessed occasion — your presence would mean the world.",
    "With love and gratitude, we welcome you to celebrate with us.",
  ],
  custom: [
    "We've planned something special. We'd love to share it with you.",
    "It doesn't fit in a category — but it'll be unforgettable. Hope you can make it.",
    "Mark your calendar. We're gathering for something worth remembering.",
    "An evening built for the people who matter most. You're one of them.",
  ],
};

// Generates contextual copy. Uses custom label when type === custom for sharper personalization.
function generateCopyVariant(type: EventTypeId, customLabel: string, index: number): string {
  const list = COPY_VARIANTS[type] ?? COPY_VARIANTS.custom;
  let copy = list[index % list.length];
  if (type === "custom" && customLabel.trim().length > 0) {
    const label = customLabel.trim();
    const customs = [
      `You're invited to our ${label.toLowerCase()} — let's make it one to remember.`,
      `Save the date for our ${label.toLowerCase()}. It wouldn't be the same without you.`,
      `Our ${label.toLowerCase()} is coming up and we'd love for you to be a part of it.`,
      `Something special is happening — our ${label.toLowerCase()}. Hope you can be there.`,
    ];
    copy = customs[index % customs.length];
  }
  return copy;
}

// Schedule presets tailored to each event type so quick-add reflects user's category choice.
const SCHEDULE_PRESETS: Record<EventTypeId, { t: string; time: string }[]> = {
  wedding: [
    { t: "Guests arrive", time: "3:30 PM" },
    { t: "Ceremony", time: "4:00 PM" },
    { t: "Cocktail hour", time: "5:00 PM" },
    { t: "Reception", time: "6:30 PM" },
    { t: "First dance", time: "7:30 PM" },
    { t: "Toasts", time: "8:00 PM" },
    { t: "Cake cutting", time: "9:00 PM" },
    { t: "Bouquet toss", time: "9:30 PM" },
    { t: "Open dance floor", time: "10:00 PM" },
    { t: "Send-off", time: "11:30 PM" },
  ],
  birthday: [
    { t: "Doors open", time: "7:00 PM" },
    { t: "Welcome drinks", time: "7:30 PM" },
    { t: "Dinner", time: "8:30 PM" },
    { t: "Birthday speech", time: "9:30 PM" },
    { t: "Cake & candles", time: "10:00 PM" },
    { t: "DJ set", time: "10:30 PM" },
    { t: "Surprise moment", time: "11:00 PM" },
    { t: "After-party", time: "12:00 AM" },
  ],
  baby: [
    { t: "Guests arrive", time: "2:00 PM" },
    { t: "Brunch served", time: "2:30 PM" },
    { t: "Games", time: "3:30 PM" },
    { t: "Gift opening", time: "4:30 PM" },
    { t: "Cake & toasts", time: "5:00 PM" },
    { t: "Group photo", time: "5:30 PM" },
  ],
  graduation: [
    { t: "Ceremony", time: "11:00 AM" },
    { t: "Photos with family", time: "1:00 PM" },
    { t: "Lunch reception", time: "2:00 PM" },
    { t: "Speeches", time: "3:30 PM" },
    { t: "Cake cutting", time: "4:30 PM" },
    { t: "After-party", time: "8:00 PM" },
  ],
  vacation: [
    { t: "Departure", time: "7:00 AM" },
    { t: "Check-in", time: "2:00 PM" },
    { t: "Welcome dinner", time: "7:30 PM" },
    { t: "Excursion", time: "10:00 AM" },
    { t: "Sunset toast", time: "6:30 PM" },
    { t: "Group photo", time: "5:00 PM" },
    { t: "Farewell dinner", time: "7:00 PM" },
  ],
  private: [
    { t: "Doors open", time: "8:00 PM" },
    { t: "Welcome cocktails", time: "8:30 PM" },
    { t: "Dinner", time: "9:30 PM" },
    { t: "Toasts", time: "10:30 PM" },
    { t: "Live set", time: "11:00 PM" },
    { t: "After-hours", time: "1:00 AM" },
  ],
  brand: [
    { t: "Registration", time: "5:30 PM" },
    { t: "Welcome remarks", time: "6:00 PM" },
    { t: "Keynote", time: "6:30 PM" },
    { t: "Panel", time: "7:15 PM" },
    { t: "Networking", time: "8:00 PM" },
    { t: "Press photos", time: "8:30 PM" },
    { t: "Closing toast", time: "9:00 PM" },
  ],
  corporate: [
    { t: "Check-in & coffee", time: "8:30 AM" },
    { t: "Opening remarks", time: "9:00 AM" },
    { t: "Keynote", time: "9:30 AM" },
    { t: "Panel discussion", time: "10:30 AM" },
    { t: "Networking break", time: "11:30 AM" },
    { t: "Lunch", time: "12:30 PM" },
    { t: "Breakout sessions", time: "2:00 PM" },
    { t: "Closing toast", time: "6:00 PM" },
  ],
  engagement: [
    { t: "Guests arrive", time: "6:00 PM" },
    { t: "Welcome drinks", time: "6:30 PM" },
    { t: "Ring reveal", time: "7:00 PM" },
    { t: "Toasts", time: "7:30 PM" },
    { t: "Dinner", time: "8:00 PM" },
    { t: "Cake & sparklers", time: "9:30 PM" },
    { t: "Dancing", time: "10:00 PM" },
  ],
  concert: [
    { t: "Doors open", time: "6:30 PM" },
    { t: "Opening act", time: "7:30 PM" },
    { t: "Set change", time: "8:30 PM" },
    { t: "Headline set", time: "9:00 PM" },
    { t: "Encore", time: "10:45 PM" },
    { t: "After-party", time: "11:30 PM" },
  ],
  festival: [
    { t: "Gates open", time: "12:00 PM" },
    { t: "Main stage opens", time: "1:00 PM" },
    { t: "Food vendors", time: "2:00 PM" },
    { t: "Headliner", time: "8:00 PM" },
    { t: "Fireworks", time: "10:00 PM" },
    { t: "Silent disco", time: "11:00 PM" },
  ],
  religious: [
    { t: "Guests arrive", time: "10:00 AM" },
    { t: "Service begins", time: "10:30 AM" },
    { t: "Blessings & prayers", time: "11:15 AM" },
    { t: "Family photos", time: "12:00 PM" },
    { t: "Luncheon", time: "1:00 PM" },
    { t: "Closing", time: "3:00 PM" },
  ],
  custom: [
    { t: "Doors open", time: "6:00 PM" },
    { t: "Welcome", time: "6:30 PM" },
    { t: "Main moment", time: "7:30 PM" },
    { t: "Toasts", time: "8:30 PM" },
    { t: "After-party", time: "10:00 PM" },
  ],
};

// Parse "3:30 PM" / "7:00 AM" into 24h numbers.
function parseTime(s: string): { h: number; m: number } {
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return { h: 12, m: 0 };
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { h, m: min };
}
function formatTime12(h: number, m: number): string {
  const ap = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}
const TOD_ANCHOR: Record<TimeOfDayId, number> = { morning: 9, afternoon: 13, evening: 18, night: 21 };

// Shift schedule presets so the first item sits near the chosen time-of-day.
function shiftPresets(presets: { t: string; time: string }[], tod: TimeOfDayId): { t: string; time: string }[] {
  if (presets.length === 0) return presets;
  const first = parseTime(presets[0].time);
  const target = TOD_ANCHOR[tod];
  const delta = target - first.h;
  if (delta === 0) return presets;
  return presets.map((p) => {
    const { h, m } = parseTime(p.time);
    const nh = (h + delta + 24) % 24;
    return { t: p.t, time: formatTime12(nh, m) };
  });
}

// Activity suggestions for the manual "Add your own" dropdown, by event type.
const ACTIVITY_SUGGESTIONS: Record<EventTypeId, string[]> = {
  wedding: ["Welcome", "Ceremony", "Cocktails", "Reception", "First dance", "Toasts", "Cake cutting", "Bouquet toss", "Send-off"],
  birthday: ["Doors open", "Welcome drinks", "Dinner", "Birthday speech", "Cake & candles", "DJ set", "After-party"],
  baby: ["Brunch", "Games", "Gift opening", "Cake & toasts", "Group photo"],
  graduation: ["Ceremony", "Photos", "Lunch", "Speeches", "Cake cutting", "After-party"],
  vacation: ["Departure", "Check-in", "Welcome dinner", "Excursion", "Sunset toast", "Farewell dinner"],
  private: ["Doors open", "Cocktails", "Dinner", "Toasts", "Live set", "After-hours"],
  brand: ["Registration", "Welcome remarks", "Keynote", "Panel", "Networking", "Closing toast"],
  corporate: ["Check-in", "Opening", "Keynote", "Panel", "Networking", "Lunch", "Workshop", "Closing"],
  engagement: ["Welcome drinks", "Ring reveal", "Toasts", "Dinner", "Cake", "Dancing"],
  concert: ["Doors open", "Opening act", "Headline set", "Encore", "After-party"],
  festival: ["Gates open", "Main stage", "Food vendors", "Headliner", "Fireworks", "Silent disco"],
  religious: ["Guests arrive", "Service", "Blessings", "Family photos", "Luncheon", "Closing"],
  custom: ["Welcome", "Main moment", "Toasts", "Dinner", "Performance", "After-party"],
};

function WizardPip({ active }: { active: boolean }) {
  const width = useRef(new Animated.Value(active ? 1 : 0.35)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: active ? 1 : 0.35,
      duration: MOTION.normal,
      useNativeDriver: false,
    }).start();
  }, [active, width]);
  return (
    <Animated.View
      style={[s.pip, { flex: width, backgroundColor: active ? C.pink : C.hair }]}
    />
  );
}

/** Selection tile with spring press + haptic. */
function SelectTile({
  onPress,
  style,
  children,
  disabled,
  haptic = "selection",
  ...rest
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  haptic?: "selection" | "light" | false;
} & Pick<React.ComponentProps<typeof PressableScale>, "hitSlop" | "testID">) {
  return (
    <PressableScale
      onPress={onPress}
      haptic={haptic}
      pressedScale={0.97}
      disabled={disabled}
      style={style}
      {...rest}
    >
      {children}
    </PressableScale>
  );
}

function WheelColumn({
  label,
  values,
  value,
  onChange,
  format,
}: {
  label: string;
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <View style={s.wheelCol}>
      <Text style={s.wheelColLabel}>{label.toUpperCase()}</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.wheelList}
        nestedScrollEnabled
      >
        {values.map((v) => {
          const active = v === value;
          return (
            <SelectTile
              key={v}
              onPress={() => {
                triggerHaptic("selection");
                onChange(v);
              }}
              haptic={false}
              style={[s.wheelItem, active ? s.wheelItemActive : null]}
            >
              <Text style={[s.wheelItemText, active ? s.wheelItemTextActive : null]}>
                {format(v)}
              </Text>
            </SelectTile>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StepHeader({ step, title }: { step: string; title: string }) {
  return (
    <FadeInView style={{ gap: 6, marginBottom: 16 }}>
      <Text style={s.kicker}>{step}</Text>
      <Text style={s.title}>{title}</Text>
    </FadeInView>
  );
}

function WizardStep({ children }: { children: React.ReactNode }) {
  return <FadeInView delay={30}>{children}</FadeInView>;
}

export default function CreateEventScreen() {
  const router = useRouter();
  const { createEvent } = useEvents();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [hostName, setHostName] = useState<string>("");
  const [type, setType] = useState<EventTypeId>("wedding");
  const [customLabel, setCustomLabel] = useState<string>("");
  const [cover, setCover] = useState<string>(COVER_CATEGORIES[0].images[0]);
  const [coverCategory, setCoverCategory] = useState<string>(COVER_CATEGORIES[0].id);
  const [venue, setVenue] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [dressCode, setDressCode] = useState<string>("");
  const [template, setTemplate] = useState<TemplateId>("noir");
  const [tplCategory, setTplCategory] = useState<TemplateCategory | "all">("all");
  const [date, setDate] = useState<number>(() => {
    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    d.setHours(19, 0, 0, 0);
    return d.getTime();
  });
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayId>(() =>
    timeOfDayFromDate(Date.now() + 7 * 24 * 3600 * 1000)
  );
  const [hour, setHour] = useState<number>(19);
  const [minute, setMinute] = useState<number>(0);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [schedHour, setSchedHour] = useState<number>(19);
  const [schedMinute, setSchedMinute] = useState<number>(0);
  const [schedTitle, setSchedTitle] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [quickMode, setQuickMode] = useState<boolean>(false);
  const [copyIndex, setCopyIndex] = useState<number>(0);
  // Step 6 — rules
  const [shotsPerGuest, setShotsPerGuest] = useState<number>(10);
  // Note: shots are capped at MAX_SHOTS_PER_GUEST (36). Server storage is retained for STORAGE_RETENTION_DAYS (30) days post-event.
  const [revealMode, setRevealMode] = useState<RevealMode>("plus24h");
  const [uploadPermission, setUploadPermission] = useState<UploadPerm>("all");
  const [privacy, setPrivacy] = useState<Privacy>("private");
  const [passcode, setPasscode] = useState<string>("");
  const [visibility, setVisibility] = useState<Visibility>("all_after_reveal");
  const [checkInEnabled, setCheckInEnabled] = useState<boolean>(false);

  const tpl = useMemo(() => TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0], [template]);
  const visibleTemplates = useMemo(
    () => (tplCategory === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === tplCategory)),
    [tplCategory]
  );
  const visibleCovers = useMemo(
    () => COVER_CATEGORIES.find((c) => c.id === coverCategory)?.images ?? [],
    [coverCategory]
  );

  const dateWithTime = useMemo(() => {
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  }, [date, hour, minute]);

  const preview = useMemo(
    () => ({
      id: "preview",
      name: name || "Your event name",
      type,
      customLabel: type === "custom" ? customLabel || "Custom" : undefined,
      timeOfDay,
      cover,
      date: dateWithTime,
      venue: venue || "Venue · City",
      message: message || generateCopyVariant(type, customLabel, 0),
      dressCode,
      schedule,
      template,
      hostName: hostName || "Your name",
      shotsPerGuest,
      revealAt: computeRevealAt(dateWithTime, revealMode),
      revealMode,
      uploadPermission,
      privacy,
      passcode: privacy === "passcode" ? passcode : undefined,
      visibility,
      checkInEnabled,
      isPrivate: privacy !== "public",
      rsvps: [],
      photos: [],
      invited: 0,
      views: 0,
    }),
    [name, type, customLabel, timeOfDay, cover, dateWithTime, venue, message, dressCode, schedule, template, hostName, shotsPerGuest, revealMode, uploadPermission, privacy, passcode, visibility, checkInEnabled]
  );

  const next = () => {
    triggerHaptic("selection");
    if (quickMode && step === 0) {
      setStep(TOTAL_STEPS - 1);
      return;
    }
    setStep((v) => Math.min(v + 1, TOTAL_STEPS - 1));
  };
  const back = () => {
    triggerHaptic("light");
    if (step === 0) {
      router.back();
      return;
    }
    setStep((v) => Math.max(v - 1, 0));
  };

  const submit = async () => {
    triggerHaptic("success");
    const ev = await createEvent({
      name: name || "Untitled event",
      type,
      customLabel: type === "custom" ? customLabel || "Custom" : undefined,
      timeOfDay,
      cover,
      date: dateWithTime,
      venue: venue || "TBD",
      message: message || generateCopyVariant(type, customLabel, 0),
      dressCode,
      schedule,
      template,
      hostName: hostName || "Host",
      shotsPerGuest,
      revealAt: computeRevealAt(dateWithTime, revealMode),
      revealMode,
      uploadPermission,
      privacy,
      passcode: privacy === "passcode" ? passcode : undefined,
      visibility,
      checkInEnabled,
      isPrivate: privacy !== "public",
    });
    router.dismiss();
    router.push(`/guest-list/${ev.id}` as never);
  };

  const [aiLoading, setAiLoading] = useState(false);
  const aiRequestId = useRef(0);

  /**
   * Generate a fresh invitation message.
   * Tries AI first (when the toolkit key is available), falls back to
   * local template variants if the AI call fails or times out.
   */
  const generateCopy = async () => {
    triggerHaptic("light");

    setAiLoading(true);
    const reqId = ++aiRequestId.current;

    const aiResult = await generateInvitationMessage({
      eventType: type,
      customLabel,
      hostName: hostName.trim() || "Your host",
      eventName: name.trim() || "the celebration",
      venue: venue.trim() || "an amazing venue",
    });

    // Only apply if this request is still the latest (prevent stale responses)
    if (reqId !== aiRequestId.current) return;
    setAiLoading(false);

    if (aiResult) {
      setMessage(aiResult);
    } else {
      // Fallback to local template variants
      setMessage(generateCopyVariant(type, customLabel, copyIndex));
      setCopyIndex((i) => i + 1);
    }
  };

  /**
   * Rewrite the current message.
   * Tries AI first with the existing text as context, falls back to
   * prepending a tonal opener if the AI call fails.
   */
  const rewriteCopy = async () => {
    triggerHaptic("light");
    const base = message.trim();
    if (!base) {
      generateCopy();
      return;
    }

    setAiLoading(true);
    const reqId = ++aiRequestId.current;

    const aiResult = await generateInvitationMessage({
      eventType: type,
      customLabel,
      hostName: hostName.trim() || "Your host",
      eventName: name.trim() || "the celebration",
      venue: venue.trim() || "an amazing venue",
      existing: base,
    });

    if (reqId !== aiRequestId.current) return;
    setAiLoading(false);

    if (aiResult) {
      setMessage(aiResult);
    } else {
      // Local fallback: prepend a fresh tonal opener
      generateCopy();
    }
  };

  const pickCustomCover = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo library access to upload a cover.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.9,
      });
      if (!res.canceled && res.assets[0]) {
        triggerHaptic("selection");
        setCover(res.assets[0].uri);
      }
    } catch (e) {
      console.log("[cover-pick]", e);
    }
  };

  const addScheduleItem = () => {
    if (!schedTitle.trim()) return;
    triggerHaptic("selection");
    const time = formatTime12(schedHour, schedMinute);
    setSchedule((prev) => [...prev, { id: `s_${Date.now()}`, time, title: schedTitle.trim() }]);
    setSchedTitle("");
    setShowSuggestions(false);
  };
  const pickSuggestion = (s: string) => {
    triggerHaptic("selection");
    setSchedTitle(s);
    setShowSuggestions(false);
  };
  const addSchedulePreset = (time: string, title: string) => {
    triggerHaptic("selection");
    setSchedule((prev) => [...prev, { id: `s_${Date.now()}_${Math.random()}`, time, title }]);
  };
  const removeScheduleItem = (id: string) => {
    setSchedule((prev) => prev.filter((i) => i.id !== id));
  };

  const setTime = (h: number, m: number) => {
    setHour(h);
    setMinute(m);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    setTimeOfDay(timeOfDayFromDate(d.getTime()));
  };

  const pickTimePreset = (id: TimeOfDayId) => {
    setTimeOfDay(id);
    const presets: Record<TimeOfDayId, [number, number]> = {
      morning: [9, 0],
      afternoon: [13, 30],
      evening: [18, 30],
      night: [21, 0],
    };
    const [h, m] = presets[id];
    setHour(h);
    setMinute(m);
  };

  return (
    <View style={s.container}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <IconButton icon={ChevronLeft} onPress={back} variant="glass" iconSize={22} haptic="light" />
          <View style={s.progressRow}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <WizardPip key={i} active={i <= step} />
            ))}
          </View>
          <View style={s.topBtn} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {step === 0 ? (
            <WizardStep>
              <StepHeader step={`STEP 1 OF ${TOTAL_STEPS}`} title="The basics" />

              <PressableScale
                onPress={() => {
                  triggerHaptic("selection");
                  setQuickMode((v) => !v);
                }}
                haptic={false}
                pressedScale={0.99}
                style={[s.quickCard, quickMode ? s.quickCardActive : null]}
              >
                <View style={[s.quickIcon, quickMode ? { backgroundColor: C.pink } : null]}>
                  <Zap color={quickMode ? C.text : C.pinkHi} size={20} fill={quickMode ? C.text : "transparent"} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.quickTitle}>Quick create in 60 seconds</Text>
                  <Text style={s.quickSub}>
                    {quickMode
                      ? "We'll use smart defaults — tweak anything later."
                      : "Fill basics, we'll auto-pick template, schedule & rules."}
                  </Text>
                </View>
                <View style={[s.quickToggle, quickMode ? s.quickToggleOn : null]}>
                  <View style={[s.quickKnob, quickMode ? s.quickKnobOn : null]} />
                </View>
              </PressableScale>
              <Text style={s.label}>Event type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                style={{ marginHorizontal: -18, paddingHorizontal: 18 }}
              >
                {EVENT_TYPES.map((t) => (
                  <Chip key={t.id} label={t.label} icon={t.emoji} active={type === t.id} onPress={() => setType(t.id)} />
                ))}
              </ScrollView>

              {type === "custom" ? (
                <TextField
                  label="Custom event type"
                  placeholder="e.g. Housewarming · Reunion · Engagement"
                  value={customLabel}
                  onChangeText={setCustomLabel}
                />
              ) : null}

              <TextField label="Event name" placeholder="e.g. Amara & Kofi" value={name} onChangeText={setName} />
              <TextField label="Hosted by" placeholder="Your name(s)" value={hostName} onChangeText={setHostName} />
              <TextField label="Venue" placeholder="e.g. Skylounge Rooftop · Lagos" value={venue} onChangeText={setVenue} />

              <Text style={s.label}>Pick a date</Text>
              <Calendar value={dateWithTime} onChange={setDate} minDate={Date.now()} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
                <Clock color={C.gold} size={14} />
                <Text style={s.dateLabel}>
                  {new Date(dateWithTime).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  {" · "}
                  {new Date(dateWithTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </Text>
              </View>

              <Text style={s.label}>Time of day</Text>
              <View style={s.todRow}>
                {TIME_OF_DAY.map((t) => {
                  const active = timeOfDay === t.id;
                  return (
                    <SelectTile
                      key={t.id}
                      onPress={() => pickTimePreset(t.id)}
                      style={[s.todChip, active ? s.todChipActive : null]}
                    >
                      <Text style={s.todEmoji}>{t.emoji}</Text>
                      <Text style={[s.todLabel, active ? { color: C.text } : null]}>{t.label}</Text>
                      <Text style={[s.todHint, active ? { color: "rgba(255,255,255,0.85)" } : null]}>{t.hint}</Text>
                    </SelectTile>
                  );
                })}
              </View>

              <Text style={s.label}>Fine-tune time</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <View style={s.timeBox}>
                  <Text style={s.timeBoxLabel}>Hour</Text>
                  <View style={s.timeBoxRow}>
                    <SelectTile onPress={() => setTime((hour + 23) % 24, minute)} style={s.timeStep}>
                      <Text style={s.timeStepText}>-</Text>
                    </SelectTile>
                    <Text style={s.timeValue}>{String(hour).padStart(2, "0")}</Text>
                    <SelectTile onPress={() => setTime((hour + 1) % 24, minute)} style={s.timeStep}>
                      <Text style={s.timeStepText}>+</Text>
                    </SelectTile>
                  </View>
                </View>
                <View style={s.timeBox}>
                  <Text style={s.timeBoxLabel}>Min</Text>
                  <View style={s.timeBoxRow}>
                    <SelectTile onPress={() => setTime(hour, (minute + 45) % 60)} style={s.timeStep}>
                      <Text style={s.timeStepText}>-</Text>
                    </SelectTile>
                    <Text style={s.timeValue}>{String(minute).padStart(2, "0")}</Text>
                    <SelectTile onPress={() => setTime(hour, (minute + 15) % 60)} style={s.timeStep}>
                      <Text style={s.timeStepText}>+</Text>
                    </SelectTile>
                  </View>
                </View>
              </View>
            </WizardStep>
          ) : null}

          {step === 1 ? (
            <WizardStep>
              <StepHeader step={`STEP 2 OF ${TOTAL_STEPS}`} title="Cover & details" />

              <Text style={s.label}>Cover photo</Text>
              <SelectTile onPress={pickCustomCover} style={s.uploadCard}>
                <View style={s.uploadIcon}>
                  <ImagePlus color={C.pinkHi} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.uploadTitle}>Upload from your gallery</Text>
                  <Text style={s.uploadSub}>Pick any photo from your device</Text>
                </View>
                <ChevronRight color={C.mute} size={18} />
              </SelectTile>

              {cover && !COVER_CATEGORIES.some((cat) => cat.images.includes(cover)) ? (
                <View style={s.customCoverWrap}>
                  <ShimmerImage uri={cover} style={s.customCoverImg} borderRadius={16} />
                  <View style={s.customCoverTag}>
                    <Check color={C.text} size={12} />
                    <Text style={s.customCoverTagText}>Your upload</Text>
                  </View>
                </View>
              ) : null}

              <Text style={[s.label, { marginTop: 18 }]}>Browse by category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                style={{ marginHorizontal: -18, paddingHorizontal: 18 }}
              >
                {COVER_CATEGORIES.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    icon={c.emoji}
                    active={coverCategory === c.id}
                    onPress={() => setCoverCategory(c.id)}
                  />
                ))}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
                style={{ marginHorizontal: -18, paddingHorizontal: 18, marginTop: 8 }}
              >
                {visibleCovers.map((c) => (
                  <SelectTile
                    key={c}
                    onPress={() => setCover(c)}
                    style={[s.coverThumb, cover === c ? s.coverThumbActive : null]}
                  >
                    <ShimmerImage uri={c} style={{ width: "100%", height: "100%" }} borderRadius={14} />
                    {cover === c ? (
                      <View style={s.coverCheck}>
                        <Check color={C.text} size={16} />
                      </View>
                    ) : null}
                  </SelectTile>
                ))}
              </ScrollView>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <Text style={s.label}>Message to guests</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {message.trim().length > 0 ? (
                    <SelectTile onPress={rewriteCopy} style={[s.aiBtn, aiLoading && s.aiBtnDisabled]} disabled={aiLoading}>
                      {aiLoading ? (
                        <RefreshCw color={C.mute} size={13} />
                      ) : (
                        <RefreshCw color={C.pinkHi} size={13} />
                      )}
                      <Text style={[s.aiBtnText, aiLoading && { color: C.mute }]}>{aiLoading ? "Writing…" : "Rewrite"}</Text>
                    </SelectTile>
                  ) : null}
                  <SelectTile onPress={generateCopy} style={[s.aiBtn, aiLoading && s.aiBtnDisabled]} disabled={aiLoading}>
                    {aiLoading ? (
                      <Sparkles color={C.mute} size={14} />
                    ) : (
                      <Wand2 color={C.pinkHi} size={14} />
                    )}
                    <Text style={[s.aiBtnText, aiLoading && { color: C.mute }]}>{aiLoading ? "Writing…" : "AI write"}</Text>
                  </SelectTile>
                </View>
              </View>
              <TextField
                label="Message to guests"
                placeholder="A warm, personal note for your guests…"
                value={message}
                onChangeText={setMessage}
                multiline
                style={{ height: 110, textAlignVertical: "top" }}
              />

              <TextField
                label="Dress code (optional)"
                placeholder="e.g. Black tie · Glam glitter"
                value={dressCode}
                onChangeText={setDressCode}
              />
            </WizardStep>
          ) : null}

          {step === 2 ? (
            <WizardStep>
              <StepHeader step={`STEP 3 OF ${TOTAL_STEPS}`} title="Event schedule" />
              <Text style={s.helperText}>
                Build a run-of-show so guests know what's happening when. Add as many moments as you like.
              </Text>

              <Text style={s.label}>
                Quick add for {EVENT_TYPES.find((e) => e.id === type)?.label.toLowerCase() ?? "your event"}
                {" · "}
                <Text style={{ color: C.gold }}>{TIME_OF_DAY.find((t) => t.id === timeOfDay)?.label}</Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                style={{ marginHorizontal: -18, paddingHorizontal: 18 }}
              >
                {shiftPresets(SCHEDULE_PRESETS[type], timeOfDay).map((p, idx) => (
                  <SelectTile key={`${p.t}-${idx}`} onPress={() => addSchedulePreset(p.time, p.t)} style={s.presetChip}>
                    <Plus color={C.pinkHi} size={13} />
                    <Text style={s.presetChipText}>{p.t}</Text>
                    <Text style={s.presetChipTime}>{p.time}</Text>
                  </SelectTile>
                ))}
              </ScrollView>

              <Text style={s.label}>Your run-of-show</Text>
              <View style={{ gap: 10 }}>
                {schedule.map((it, idx) => (
                  <View key={it.id} style={s.schedItemBig}>
                    <View style={s.schedIndexCol}>
                      <Text style={s.schedIndex}>{String(idx + 1).padStart(2, "0")}</Text>
                      {idx < schedule.length - 1 ? <View style={s.schedStem} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={s.schedTimeBadge}>
                        <Clock color={C.gold} size={11} />
                        <Text style={s.schedTimeText}>{it.time}</Text>
                      </View>
                      <Text style={s.schedItemTitleBig}>{it.title}</Text>
                    </View>
                    <IconButton icon={X} onPress={() => removeScheduleItem(it.id)} size={34} iconSize={16} color={C.danger} variant="ghost" haptic="light" />
                  </View>
                ))}
                {schedule.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="No items yet"
                    subtitle="Tap a quick-add chip above or write your own below."
                    style={{ paddingVertical: 20 }}
                  />
                ) : null}
              </View>

              <Text style={s.label}>Add your own</Text>
              <View style={s.customSchedCard}>
                <TextField
                  label="Activity"
                  placeholder="e.g. Reception & dinner"
                  value={schedTitle}
                  onChangeText={(v) => { setSchedTitle(v); setShowSuggestions(false); }}
                />
                <SelectTile
                  onPress={() => setShowSuggestions((v) => !v)}
                  haptic="light"
                  style={[s.suggestToggle, { alignSelf: "flex-end", marginTop: -8 }]}
                >
                  <Text style={{ color: C.pinkHi, fontSize: 12, fontWeight: "600" as const }}>
                    {showSuggestions ? "Hide suggestions" : "Show suggestions"}
                  </Text>
                </SelectTile>
                  {showSuggestions ? (
                    <View style={s.suggestList}>
                      {ACTIVITY_SUGGESTIONS[type].map((sug) => (
                        <SelectTile key={sug} onPress={() => pickSuggestion(sug)} style={s.suggestItem}>
                          <Sparkles color={C.gold} size={12} />
                          <Text style={s.suggestItemText}>{sug}</Text>
                        </SelectTile>
                      ))}
                    </View>
                  ) : null}

                <Text style={[s.miniLabel, { marginTop: 14 }]}>Time</Text>
                <View style={s.wheelRow}>
                  <WheelColumn
                    label="Hour"
                    values={Array.from({ length: 12 }, (_, i) => i + 1)}
                    value={((schedHour + 11) % 12) + 1}
                    onChange={(v) => {
                      const isPM = schedHour >= 12;
                      const h24 = v === 12 ? (isPM ? 12 : 0) : isPM ? v + 12 : v;
                      setSchedHour(h24);
                    }}
                    format={(v) => String(v).padStart(2, "0")}
                  />
                  <Text style={s.wheelColon}>:</Text>
                  <WheelColumn
                    label="Min"
                    values={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]}
                    value={schedMinute - (schedMinute % 5)}
                    onChange={setSchedMinute}
                    format={(v) => String(v).padStart(2, "0")}
                  />
                  <View style={s.ampmCol}>
                    {["AM", "PM"].map((p) => {
                      const isPM = schedHour >= 12;
                      const active = (p === "PM") === isPM;
                      return (
                        <SelectTile
                          key={p}
                          onPress={() => {
                            if (p === "PM" && !isPM) setSchedHour((h) => (h + 12) % 24);
                            if (p === "AM" && isPM) setSchedHour((h) => (h + 12) % 24);
                          }}
                          haptic="selection"
                          style={[s.ampmBtn, active ? s.ampmBtnActive : null]}
                        >
                          <Text style={[s.ampmText, active ? { color: C.text } : null]}>{p}</Text>
                        </SelectTile>
                      );
                    })}
                  </View>
                </View>

                <SelectTile
                  onPress={addScheduleItem}
                  disabled={!schedTitle.trim()}
                  style={[s.addRowBtn, { opacity: !schedTitle.trim() ? 0.4 : 1, marginTop: 14 }]}
                >
                  <Plus color={C.text} size={18} />
                  <Text style={s.addRowBtnText}>
                    Add at {formatTime12(schedHour, schedMinute)}
                  </Text>
                </SelectTile>
              </View>
            </WizardStep>
          ) : null}

          {step === 3 ? (
            <WizardStep>
              <StepHeader step={`STEP 4 OF ${TOTAL_STEPS}`} title="Pick a template" />
              <Text style={s.helperText}>
                {TEMPLATES.length}+ unique designs across {TEMPLATE_CATEGORIES.length} aesthetics — pick a vibe.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                style={{ marginHorizontal: -18, paddingHorizontal: 18, marginTop: 8 }}
              >
                <Chip label="All" icon="✦" active={tplCategory === "all"} onPress={() => setTplCategory("all")} />
                {TEMPLATE_CATEGORIES.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    icon={c.emoji}
                    active={tplCategory === c.id}
                    onPress={() => setTplCategory(c.id)}
                  />
                ))}
              </ScrollView>

              <View style={s.tplGrid}>
                {visibleTemplates.map((t) => {
                  const active = template === t.id;
                  return (
                    <SelectTile
                      key={t.id}
                      onPress={() => setTemplate(t.id)}
                      haptic="selection"
                      style={[s.tplCard, active ? s.tplCardActive : null]}
                    >
                      <LinearGradient
                        colors={t.bg}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.tplCardSwatch}
                      >
                        <Text style={[s.tplCardMono, { color: t.ink, fontStyle: t.serif ? "italic" : "normal" }]}>
                          {t.name.charAt(0)}
                        </Text>
                        {active ? (
                          <View style={s.tplCardCheck}>
                            <Check color={C.text} size={14} />
                          </View>
                        ) : null}
                      </LinearGradient>
                      <Text style={s.tplCardName} numberOfLines={1}>{t.name}</Text>
                      <Text style={s.tplCardTagline} numberOfLines={1}>{t.tagline}</Text>
                    </SelectTile>
                  );
                })}
              </View>
            </WizardStep>
          ) : null}

          {step === 4 ? (
            <WizardStep>
              <StepHeader step={`STEP 5 OF ${TOTAL_STEPS}`} title="Camera & gallery rules" />
              <Text style={s.helperText}>
                Dial in how guests capture and when the gallery opens. You can change anything later.
              </Text>

              <Text style={s.label}>Shots per guest</Text>
              <View style={s.shotsRow}>
                {SHOT_PRESETS.map((p) => {
                  const active = shotsPerGuest === p.value;
                  return (
                    <SelectTile
                      key={p.value}
                      onPress={() => setShotsPerGuest(p.value)}
                      haptic="selection"
                      style={[s.shotTile, active ? s.shotTileActive : null]}
                    >
                      <Text style={[s.shotValue, active ? { color: C.text } : null]}>{p.label}</Text>
                      <Text style={[s.shotSub, active ? { color: "rgba(255,255,255,0.85)" } : null]}>{p.sub}</Text>
                    </SelectTile>
                  );
                })}
              </View>
              <View style={s.inlineHint}>
                <CameraIcon color={C.gold} size={13} />
                <Text style={s.inlineHintText}>
                  {`Each guest gets ${shotsPerGuest} shots (max ${MAX_SHOTS_PER_GUEST}) — makes every frame intentional.`}
                </Text>
              </View>
              <View style={s.inlineHint}>
                <Lock color={C.subtext} size={13} />
                <Text style={s.inlineHintText}>
                  {`Photos are stored on our servers for up to ${STORAGE_RETENTION_DAYS} days after the event, then automatically deleted. Download or export anything you want to keep.`}
                </Text>
              </View>

              <Text style={s.label}>Gallery reveal</Text>
              <View style={{ gap: 8 }}>
                {REVEAL_OPTIONS.map((opt) => {
                  const active = revealMode === opt.id;
                  const ts = computeRevealAt(dateWithTime, opt.id);
                  return (
                    <SelectTile
                      key={opt.id}
                      onPress={() => setRevealMode(opt.id)}
                      haptic="selection"
                      style={[s.ruleRow, active ? s.ruleRowActive : null]}
                    >
                      <View style={[s.ruleDot, active ? s.ruleDotActive : null]}>
                        {active ? <Check color={C.text} size={12} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.ruleTitle}>{opt.label}</Text>
                        <Text style={s.ruleSub}>
                          {opt.sub} · {new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                          {new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </Text>
                      </View>
                      <Unlock color={active ? C.pinkHi : C.mute} size={16} />
                    </SelectTile>
                  );
                })}
              </View>

              <Text style={s.label}>Who can upload</Text>
              <View style={s.segRow}>
                {([
                  { id: "all", label: "All guests" },
                  { id: "rsvp", label: "RSVP'd only" },
                  { id: "approved", label: "Approved" },
                ] as { id: UploadPerm; label: string }[]).map((opt) => {
                  const active = uploadPermission === opt.id;
                  return (
                    <SelectTile
                      key={opt.id}
                      onPress={() => setUploadPermission(opt.id)}
                      haptic="selection"
                      style={[s.segBtn, active ? s.segBtnActive : null]}
                    >
                      <Text style={[s.segText, active ? { color: C.text } : null]}>{opt.label}</Text>
                    </SelectTile>
                  );
                })}
              </View>

              <Text style={s.label}>Privacy</Text>
              <View style={{ gap: 8 }}>
                {([
                  { id: "private", label: "Private link", sub: "Only people with the link can RSVP", icon: Lock },
                  { id: "public", label: "Public link", sub: "Anyone with the link can join", icon: Eye },
                  { id: "passcode", label: "Password-protected", sub: "Guests enter a passcode to view", icon: Lock },
                ] as { id: Privacy; label: string; sub: string; icon: typeof Lock }[]).map((opt) => {
                  const active = privacy === opt.id;
                  const Icon = opt.icon;
                  return (
                    <SelectTile
                      key={opt.id}
                      onPress={() => setPrivacy(opt.id)}
                      haptic="selection"
                      style={[s.ruleRow, active ? s.ruleRowActive : null]}
                    >
                      <View style={[s.ruleDot, active ? s.ruleDotActive : null]}>
                        {active ? <Check color={C.text} size={12} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.ruleTitle}>{opt.label}</Text>
                        <Text style={s.ruleSub}>{opt.sub}</Text>
                      </View>
                      <Icon color={active ? C.pinkHi : C.mute} size={16} />
                    </SelectTile>
                  );
                })}
              </View>
              {privacy === "passcode" ? (
                <TextField
                  label="Event passcode"
                  placeholder="4–6 characters"
                  value={passcode}
                  onChangeText={(v) => setPasscode(v.replace(/[^0-9a-zA-Z]/g, "").slice(0, 6))}
                  autoCapitalize="characters"
                  style={{ letterSpacing: 4, textAlign: "center", fontSize: 20 }}
                />
              ) : null}

              <Text style={s.label}>Gallery visibility</Text>
              <View style={s.segRow}>
                {([
                  { id: "all_after_reveal", label: "Everyone" },
                  { id: "rsvp_only", label: "RSVP only" },
                  { id: "host_only", label: "Host only" },
                ] as { id: Visibility; label: string }[]).map((opt) => {
                  const active = visibility === opt.id;
                  return (
                    <SelectTile
                      key={opt.id}
                      onPress={() => setVisibility(opt.id)}
                      haptic="selection"
                      style={[s.segBtn, active ? s.segBtnActive : null]}
                    >
                      <Text style={[s.segText, active ? { color: C.text } : null]}>{opt.label}</Text>
                    </SelectTile>
                  );
                })}
              </View>

              <SelectTile
                onPress={() => setCheckInEnabled((v) => !v)}
                haptic="selection"
                style={[s.checkinCard, checkInEnabled ? s.checkinCardActive : null]}
              >
                <View style={[s.checkinIcon, checkInEnabled ? { backgroundColor: C.pink } : null]}>
                  <ScanLine color={checkInEnabled ? C.text : C.pinkHi} size={20} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.quickTitle}>Check-in at the door</Text>
                  <Text style={s.quickSub}>
                    {checkInEnabled
                      ? "Guests show their pass QR. You'll see live arrivals."
                      : "Track arrivals like a concert — scan guest passes at the door."}
                  </Text>
                </View>
                <View style={[s.quickToggle, checkInEnabled ? s.quickToggleOn : null]}>
                  <View style={[s.quickKnob, checkInEnabled ? s.quickKnobOn : null]} />
                </View>
              </SelectTile>
            </WizardStep>
          ) : null}

          {step === 5 ? (
            <WizardStep>
              <StepHeader step={`STEP 6 OF ${TOTAL_STEPS}`} title="Preview & publish" />
              <InvitationCard event={preview as never} template={tpl} />

              <View style={s.rulesSummary}>
                <Text style={s.rulesSummaryKicker}>YOUR EVENT RULES</Text>
                <View style={s.rulesGrid}>
                  <View style={s.rulesItem}>
                    <CameraIcon color={C.pinkHi} size={14} />
                    <Text style={s.rulesItemText}>
                      {`${shotsPerGuest} shots / guest`}
                    </Text>
                  </View>
                  <View style={s.rulesItem}>
                    <Unlock color={C.gold} size={14} />
                    <Text style={s.rulesItemText}>
                      {REVEAL_OPTIONS.find((r) => r.id === revealMode)?.label ?? "Custom reveal"}
                    </Text>
                  </View>
                  <View style={s.rulesItem}>
                    <Lock color={C.subtext} size={14} />
                    <Text style={s.rulesItemText}>
                      {privacy === "private" ? "Private link" : privacy === "public" ? "Public link" : "Passcode"}
                    </Text>
                  </View>
                  <View style={s.rulesItem}>
                    <ScanLine color={checkInEnabled ? C.success : C.mute} size={14} />
                    <Text style={s.rulesItemText}>
                      {checkInEnabled ? "Check-in on" : "Open entry"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ gap: 8, marginTop: 16, alignItems: "center" }}>
                <Sparkles color={C.gold} size={18} />
                <Text style={s.previewNote}>
                  After publishing you'll get a shareable link, QR, and the disposable camera unlocks for guests.
                </Text>
              </View>
            </WizardStep>
          ) : null}
        </ScrollView>
        </KeyboardAvoidingView>

        <View style={[s.footer, { paddingBottom: 18 + Math.max(insets.bottom, 6) }]}>
          {step > 0 ? <GhostButton title="Back" onPress={back} style={{ flex: 1 }} /> : null}
          {step < TOTAL_STEPS - 1 ? (
            <PrimaryButton title="Continue" icon={ChevronRight} onPress={next} style={{ flex: 1.4 }} />
          ) : (
            <PrimaryButton title="Publish event" icon={Check} onPress={submit} style={{ flex: 1.4 }} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  topBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  progressRow: { flexDirection: "row", gap: 6 },
  pip: { height: 4, borderRadius: 4 },
  kicker: { color: C.pinkHi, letterSpacing: 2.5, fontWeight: "800" as const, fontSize: 11 },
  title: { color: C.text, fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5 },
  label: { color: C.subtext, fontSize: 13, fontWeight: "600" as const, marginTop: 18, marginBottom: 8, letterSpacing: 0.3 },
  helperText: { color: C.mute, fontSize: 12, lineHeight: 17, marginTop: -4 },
  input: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.hair,
  },
  dateLabel: { color: C.text, fontSize: 14, fontWeight: "600" as const },
  todRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  todChip: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
    gap: 2,
  },
  todChipActive: { backgroundColor: C.pink, borderColor: C.pink },
  todEmoji: { fontSize: 20, marginBottom: 2 },
  todLabel: { color: C.text, fontSize: 14, fontWeight: "700" as const },
  todHint: { color: C.subtext, fontSize: 11 },
  timeBox: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hair,
    padding: 12,
    gap: 8,
  },
  timeBoxLabel: { color: C.mute, fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.5 },
  timeBoxRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeStep: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: C.cardHi,
    alignItems: "center",
    justifyContent: "center",
  },
  timeStepText: { color: C.text, fontSize: 18, fontWeight: "700" as const },
  timeValue: { color: C.text, fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.5 },
  uploadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,45,122,0.4)",
    borderStyle: "dashed",
  },
  uploadIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,45,122,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: { color: C.text, fontWeight: "700" as const, fontSize: 14 },
  uploadSub: { color: C.subtext, fontSize: 12, marginTop: 2 },
  customCoverWrap: {
    marginTop: 10,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: C.pink,
    backgroundColor: C.card,
  },
  customCoverImg: { width: "100%", height: "100%" },
  customCoverTag: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.pink,
    borderRadius: 999,
  },
  customCoverTagText: { color: C.text, fontWeight: "700" as const, fontSize: 11 },
  coverThumb: { width: 110, height: 140, borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  coverThumbActive: { borderColor: C.pink },
  coverCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: C.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,45,122,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,45,122,0.3)",
  },
  aiBtnDisabled: { opacity: 0.5, borderColor: "rgba(255,45,122,0.12)" },
  aiBtnText: { color: C.pinkHi, fontWeight: "700" as const, fontSize: 12 },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hair,
  },
  presetChipText: { color: C.text, fontSize: 13, fontWeight: "600" as const },
  presetChipTime: { color: C.gold, fontSize: 11, fontWeight: "700" as const, marginLeft: 2 },
  schedItemBig: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hair,
  },
  schedIndexCol: { alignItems: "center", width: 28 },
  schedIndex: { color: C.pinkHi, fontWeight: "800" as const, fontSize: 13, letterSpacing: 0.5 },
  schedStem: { width: 1, flex: 1, backgroundColor: C.hair, marginTop: 4 },
  schedTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(244,201,123,0.16)",
  },
  schedTimeText: { color: C.gold, fontWeight: "700" as const, fontSize: 11, letterSpacing: 0.3 },
  schedItemTitleBig: { color: C.text, fontSize: 15, fontWeight: "600" as const },
  schedRemove: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,90,107,0.12)",
    alignSelf: "flex-start",
  },
  emptySchedule: {
    alignItems: "center",
    gap: 6,
    padding: 22,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.hair,
  },
  emptyScheduleText: { color: C.text, fontWeight: "700" as const, fontSize: 14 },
  emptyScheduleSub: { color: C.mute, fontSize: 12, textAlign: "center" },
  customSchedCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.hair,
    padding: 14,
  },
  miniLabel: { color: C.mute, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.5, marginBottom: 6 },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hair,
    paddingRight: 6,
  },
  suggestInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 15 },
  suggestToggle: {
    width: 32, height: 32, alignItems: "center", justifyContent: "center",
    borderRadius: 8, backgroundColor: "rgba(255,45,122,0.12)",
  },
  suggestList: {
    position: "absolute", top: "100%", left: 0, right: 0,
    marginTop: 6,
    backgroundColor: C.cardHi,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
    paddingVertical: 6,
    zIndex: 10,
    elevation: 6,
  },
  suggestItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggestItemText: { color: C.text, fontSize: 14, fontWeight: "600" as const },
  wheelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  wheelCol: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
    height: 110,
    overflow: "hidden",
  },
  wheelColLabel: {
    color: C.mute, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.5,
    textAlign: "center", paddingTop: 4,
  },
  wheelList: { paddingVertical: 4 },
  wheelItem: { paddingHorizontal: 14, paddingVertical: 6, alignItems: "center" },
  wheelItemActive: { backgroundColor: "rgba(255,45,122,0.16)" },
  wheelItemText: { color: C.subtext, fontSize: 16, fontWeight: "600" as const, fontVariant: ["tabular-nums"] },
  wheelItemTextActive: { color: C.text, fontSize: 20, fontWeight: "800" as const },
  wheelColon: { color: C.pinkHi, fontSize: 28, fontWeight: "800" as const, marginBottom: 8 },
  ampmCol: { gap: 6, justifyContent: "center" },
  ampmBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.hair,
  },
  ampmBtnActive: { backgroundColor: C.pink, borderColor: C.pink },
  ampmText: { color: C.subtext, fontSize: 12, fontWeight: "800" as const, letterSpacing: 0.5 },
  addRowBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.pink,
  },
  addRowBtnText: { color: C.text, fontWeight: "700" as const, fontSize: 14 },
  tplGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  tplCard: {
    width: "31.5%",
    marginBottom: 8,
    padding: 6,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
    gap: 4,
  },
  tplCardActive: { borderColor: C.pink, backgroundColor: "rgba(255,45,122,0.06)" },
  tplCardSwatch: {
    width: "100%",
    aspectRatio: 0.78,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tplCardMono: { fontSize: 32, fontWeight: "300" as const, opacity: 0.85 },
  tplCardCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: C.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  tplCardName: { color: C.text, fontSize: 12, fontWeight: "700" as const, paddingHorizontal: 4, marginTop: 4 },
  tplCardTagline: { color: C.mute, fontSize: 10, paddingHorizontal: 4, paddingBottom: 4 },
  previewNote: { color: C.subtext, fontSize: 13, textAlign: "center", lineHeight: 19, paddingHorizontal: 24 },
  shotsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  shotTile: {
    flex: 1,
    minWidth: 64,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: "center",
    gap: 2,
  },
  shotTileActive: { backgroundColor: C.pink, borderColor: C.pink },
  shotValue: { color: C.text, fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.5 },
  shotSub: { color: C.mute, fontSize: 10, fontWeight: "600" as const, letterSpacing: 0.4 },
  inlineHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, paddingHorizontal: 4,
  },
  inlineHintText: { color: C.subtext, fontSize: 12, flex: 1 },
  ruleRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.hair,
  },
  ruleRowActive: { borderColor: C.pink, backgroundColor: "rgba(255,45,122,0.06)" },
  ruleDot: {
    width: 22, height: 22, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.hair,
    alignItems: "center", justifyContent: "center",
  },
  ruleDotActive: { backgroundColor: C.pink, borderColor: C.pink },
  ruleTitle: { color: C.text, fontSize: 14, fontWeight: "700" as const },
  ruleSub: { color: C.subtext, fontSize: 12, marginTop: 2 },
  segRow: { flexDirection: "row", gap: 6, backgroundColor: C.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.hair },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  segBtnActive: { backgroundColor: C.pink },
  segText: { color: C.subtext, fontSize: 12, fontWeight: "700" as const },
  checkinCard: {
    marginTop: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, backgroundColor: C.card, borderRadius: 18,
    borderWidth: 1, borderColor: C.hair,
  },
  checkinCardActive: { borderColor: C.pink, backgroundColor: "rgba(255,45,122,0.06)" },
  checkinIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,45,122,0.16)",
    alignItems: "center", justifyContent: "center",
  },
  rulesSummary: {
    marginTop: 16, padding: 14, borderRadius: 18,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.hair, gap: 10,
  },
  rulesSummaryKicker: { color: C.pinkHi, fontSize: 10, fontWeight: "800" as const, letterSpacing: 2 },
  rulesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rulesItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 999, backgroundColor: C.cardHi,
    minWidth: "47%",
  },
  rulesItemText: { color: C.text, fontSize: 12, fontWeight: "600" as const },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(10,10,11,0.92)",
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },
  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.hair,
    marginBottom: 4,
  },
  quickCardActive: { borderColor: C.pink, backgroundColor: "rgba(255,45,122,0.08)" },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,45,122,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: { color: C.text, fontWeight: "800" as const, fontSize: 14 },
  quickSub: { color: C.subtext, fontSize: 12, lineHeight: 16 },
  quickToggle: {
    width: 42,
    height: 24,
    borderRadius: 999,
    backgroundColor: C.hair,
    padding: 2,
    justifyContent: "center",
  },
  quickToggleOn: { backgroundColor: C.pink },
  quickKnob: { width: 20, height: 20, borderRadius: 999, backgroundColor: C.text },
  quickKnobOn: { transform: [{ translateX: 18 }] },
});
