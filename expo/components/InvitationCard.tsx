import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { type InvitationTemplate } from "@/constants/templates";
import type { Event } from "@/types/event";

interface Props {
  event: Event;
  template: InvitationTemplate;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function Ornament({ template, ink }: { template: InvitationTemplate["ornament"]; ink: string }) {
  if (template === "monogram") {
    return (
      <View style={styles.ornamentRow}>
        <View style={[styles.line, { backgroundColor: ink, opacity: 0.4 }]} />
        <Text style={[styles.diamond, { color: ink }]}>◇</Text>
        <View style={[styles.line, { backgroundColor: ink, opacity: 0.4 }]} />
      </View>
    );
  }
  if (template === "ribbon") {
    return (
      <View style={styles.ornamentRow}>
        <Text style={[styles.diamond, { color: ink }]}>❀  ✦  ❀</Text>
      </View>
    );
  }
  if (template === "floral") {
    return (
      <View style={styles.ornamentRow}>
        <Text style={[styles.diamond, { color: ink }]}>❁ ❁ ❁</Text>
      </View>
    );
  }
  return (
    <View style={styles.ornamentRow}>
      <View style={[styles.line, { backgroundColor: ink, opacity: 0.3, width: 80 }]} />
    </View>
  );
}

export const InvitationCard = memo(function InvitationCard({ event, template, style, compact }: Props) {
  const titleFont = template.serif ? styles.titleSerif : styles.titleSans;
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient colors={template.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bg}>
        <View style={styles.frame}>
          {event.cover ? (
            <View style={styles.coverWrap}>
              <Image source={{ uri: event.cover }} style={styles.cover} contentFit="cover" />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.35)"]}
                style={StyleSheet.absoluteFillObject as unknown as ViewStyle}
              />
            </View>
          ) : null}

          <View style={[styles.body, compact ? styles.bodyCompact : null]}>
            <Text style={[styles.kicker, { color: template.subInk }]}>
              {(event.type === "custom" ? event.customLabel ?? "Custom" : event.type).toUpperCase()} INVITATION
            </Text>
            <Ornament template={template.ornament} ink={template.accent} />

            <Text style={[titleFont, { color: template.ink }]} numberOfLines={2}>
              {event.name}
            </Text>

            <Text style={[styles.host, { color: template.subInk }]}>
              hosted by {event.hostName}
            </Text>

            <View style={[styles.divider, { backgroundColor: template.hair }]} />

            <View style={styles.dateBlock}>
              <Text style={[styles.dateBig, { color: template.ink }]}>{formatDate(event.date)}</Text>
              <Text style={[styles.dateSmall, { color: template.subInk }]}>at {formatTime(event.date)}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: template.hair }]} />

            <Text style={[styles.venue, { color: template.ink }]}>{event.venue}</Text>

            {!compact && event.message ? (
              <Text style={[styles.message, { color: template.subInk }]} numberOfLines={4}>
                “{event.message}”
              </Text>
            ) : null}

            {!compact && event.dressCode ? (
              <View style={[styles.dressWrap, { borderColor: template.hair }]}>
                <Text style={[styles.dressLabel, { color: template.subInk }]}>DRESS CODE</Text>
                <Text style={[styles.dressValue, { color: template.ink }]}>{event.dressCode}</Text>
              </View>
            ) : null}

            <Ornament template={template.ornament} ink={template.accent} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  bg: { padding: 12 },
  frame: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  coverWrap: {
    height: 200,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  cover: { width: "100%", height: "100%" },
  body: { padding: 24, alignItems: "center", gap: 10 },
  bodyCompact: { padding: 16, gap: 6 },
  kicker: {
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700" as const,
  },
  ornamentRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  line: { height: 1, width: 36 },
  diamond: { fontSize: 14, letterSpacing: 6 },
  titleSerif: {
    fontSize: 38,
    fontWeight: "400" as const,
    textAlign: "center",
    lineHeight: 44,
    letterSpacing: -0.5,
    fontStyle: "italic" as const,
  },
  titleSans: {
    fontSize: 34,
    fontWeight: "800" as const,
    textAlign: "center",
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  host: { fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  divider: { height: 1, width: "70%", marginVertical: 8 },
  dateBlock: { alignItems: "center", gap: 4 },
  dateBig: { fontSize: 18, fontWeight: "600" as const, textAlign: "center" },
  dateSmall: { fontSize: 14, letterSpacing: 0.6 },
  venue: { fontSize: 15, textAlign: "center", fontWeight: "500" as const },
  message: { fontSize: 14, textAlign: "center", fontStyle: "italic" as const, lineHeight: 20, marginTop: 8 },
  dressWrap: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 8,
    alignItems: "center",
    gap: 4,
  },
  dressLabel: { fontSize: 10, letterSpacing: 2, fontWeight: "700" as const },
  dressValue: { fontSize: 14, fontWeight: "600" as const },
});
