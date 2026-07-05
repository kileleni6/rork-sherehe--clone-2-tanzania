import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Bell, CalendarClock, Lock, MailCheck } from "lucide-react-native";
import React from "react";
import { Alert, Platform, View } from "react-native";

import { OnboardShell } from "@/components/OnboardShell";
import { PermissionPrompt } from "@/components/permissions/PermissionPrompt";
import { GhostButton, PrimaryButton, useToast } from "@/components/ui";
import { registerForPushAsync } from "@/lib/notifications";
import { useOnboarding } from "@/providers/OnboardingProvider";

export default function NotificationsScreen() {
  const router = useRouter();
  const { update, t } = useOnboarding();
  const toast = useToast();

  const enable = async () => {
    const reg = await registerForPushAsync();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        reg.granted ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    }
    await update({ notificationsEnabled: reg.granted });
    if (reg.granted) {
      toast.success(t("notif_enabled_title"));
    }
    if (Platform.OS === "web") {
      Alert.alert(t("notif_enabled_title"), t("notif_enabled_body"));
    }
    if (reg.token) {
      console.log("[notifications] expo push token", reg.token);
    }
    router.push("/onboarding/photos" as never);
  };

  const skip = async () => {
    await update({ notificationsEnabled: false });
    router.push("/onboarding/photos" as never);
  };

  return (
    <OnboardShell
      step={4}
      total={9}
      kicker="ALERTS"
      title={t("notif_title")}
      subtitle={t("notif_sub")}
      footer={
        <View style={{ gap: 10 }}>
          <PrimaryButton title={t("enable_notif")} icon={Bell} onPress={enable} />
          <GhostButton title={t("skip_now")} onPress={skip} />
        </View>
      }
    >
      <PermissionPrompt
        icon={Bell}
        title={t("notif_title")}
        subtitle={t("notif_sub")}
        benefits={[
          { icon: MailCheck, title: "RSVP reminders", subtitle: "Tap once to confirm or decline." },
          { icon: CalendarClock, title: "Event countdown", subtitle: "Don't miss a moment." },
          { icon: Lock, title: "Gallery unlocked", subtitle: "The instant memories drop." },
        ]}
        privacyNote="You can turn notifications off anytime in Settings."
      />
    </OnboardShell>
  );
}
