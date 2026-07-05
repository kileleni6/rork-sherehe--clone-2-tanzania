import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Images, Lock, Plus, Unlock } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable/PressableScale";
import { EmptyState, FadeInView, ShimmerImage } from "@/components/ui";
import { C } from "@/constants/colors";
import { T } from "@/constants/typography";
import { useEvents } from "@/providers/EventsProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";
import type { Event } from "@/types/event";

function GalleryTile({ event, onPress }: { event: Event; onPress: () => void }) {
  const unlocked = event.revealAt <= Date.now();
  const preview = event.photos.slice(0, 4);
  return (
    <PressableScale onPress={onPress} haptic="selection" pressedScale={0.99} style={styles.tile}>
      <View style={styles.mosaic}>
        {preview.length === 0 ? (
          <View style={styles.mosaicEmpty}>
            <Images color={C.mute} size={28} />
          </View>
        ) : (
          preview.map((p, i) => (
            <View key={p.id} style={[styles.mosaicCell, mosaicLayout(i, preview.length)]}>
              <ShimmerImage uri={p.uri} style={{ width: "100%", height: "100%" }} borderRadius={0} />
            </View>
          ))
        )}
        {!unlocked ? (
          <View style={styles.lockOverlay}>
            <LinearGradient colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFillObject as never} />
            <Lock color={C.text} size={28} />
            <Text style={styles.lockText}>Reveals {new Date(event.revealAt).toLocaleDateString()}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.tileBody}>
        <Text style={styles.tileTitle} numberOfLines={1}>
          {event.name}
        </Text>
        <View style={styles.tileMeta}>
          {unlocked ? <Unlock color={C.success} size={12} /> : <Lock color={C.subtext} size={12} />}
          <Text style={styles.tileMetaText}>
            {event.photos.length} photos · {unlocked ? "Open" : "Locked"}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

function mosaicLayout(i: number, total: number) {
  if (total === 1) return { width: "100%" as const, height: "100%" as const };
  if (total === 2) return { width: "50%" as const, height: "100%" as const };
  if (total === 3) return i === 0 ? { width: "100%" as const, height: "50%" as const } : { width: "50%" as const, height: "50%" as const };
  return { width: "50%" as const, height: "50%" as const };
}

export default function GalleryTabScreen() {
  const { upcoming, loading } = useEvents();
  const router = useRouter();
  const { t } = useOnboarding();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeInView>
            <Text style={styles.kicker}>{t("tab_gallery").toUpperCase()}</Text>
            <Text style={styles.title}>{t("tab_gallery")}</Text>
            <Text style={styles.sub}>{t("home_open_camera_sub")}</Text>
          </FadeInView>

          {loading ? (
            <View style={{ marginTop: 18, gap: 14 }}>
              {[0, 1].map((i) => (
                <View key={i} style={[styles.tile, { height: 260, backgroundColor: C.cardHi }]} />
              ))}
            </View>
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={Images}
              title={t("home_empty_title")}
              subtitle={t("home_empty_sub")}
              action={{ label: t("home_create_event"), onPress: () => router.push("/create"), icon: Plus }}
              style={{ marginTop: 24 }}
            />
          ) : (
            <View style={styles.grid}>
              {upcoming.map((e, i) => (
                <FadeInView key={e.id} delay={i * 50}>
                  <GalleryTile event={e} onPress={() => router.push(`/gallery/${e.id}` as never)} />
                </FadeInView>
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  kicker: { ...T.kicker },
  title: { ...T.screenTitle, marginTop: 6 },
  sub: { ...T.body, marginTop: 8 },
  grid: { marginTop: 18, gap: 14 },
  tile: {
    backgroundColor: C.card,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.hair,
  },
  mosaic: {
    height: 200,
    width: "100%",
    backgroundColor: C.cardHi,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  mosaicCell: { overflow: "hidden", borderWidth: 1, borderColor: C.bg },
  mosaicEmpty: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 8 },
  lockText: { color: C.text, fontWeight: "700" as const, letterSpacing: 0.4 },
  tileBody: { padding: 14, gap: 4 },
  tileTitle: { color: C.text, fontSize: 16, fontWeight: "700" as const },
  tileMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  tileMetaText: { color: C.subtext, fontSize: 12 },
});
