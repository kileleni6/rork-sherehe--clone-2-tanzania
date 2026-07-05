import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, Image as ImageIcon, Shield } from "lucide-react-native";
import React from "react";
import { Platform, View } from "react-native";

import { OnboardShell } from "@/components/OnboardShell";
import { PermissionPrompt } from "@/components/permissions/PermissionPrompt";
import { GhostButton, PrimaryButton, useToast } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { useOnboarding } from "@/providers/OnboardingProvider";

export default function PhotosScreen() {
  const router = useRouter();
  const { update, t } = useOnboarding();
  const toast = useToast();

  const enable = async () => {
    try {
      if (Platform.OS !== "web") {
        triggerHaptic("light");
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (granted) triggerHaptic("success");
        else triggerHaptic("warning");
      }
    } catch (e) {
      console.log("[photos perm]", e);
    }
    await update({ photosEnabled: true });
    toast.success(t("photo_title"));
    router.push("/onboarding/interests" as never);
  };

  const skip = async () => {
    await update({ photosEnabled: false });
    router.push("/onboarding/interests" as never);
  };

  return (
    <OnboardShell
      step={5}
      total={9}
      kicker="MEDIA"
      title={t("photo_title")}
      subtitle={t("photo_sub")}
      footer={
        <View style={{ gap: 10 }}>
          <PrimaryButton title={t("enable_photo")} icon={Camera} onPress={enable} />
          <GhostButton title={t("skip_now")} onPress={skip} />
        </View>
      }
    >
      <PermissionPrompt
        icon={Camera}
        iconGradient={["#FF6FA8", "#C71153"]}
        title={t("photo_title")}
        subtitle={t("photo_sub")}
        benefits={[
          { icon: Camera, title: "Event photos", subtitle: "Capture moments with a limited roll per guest." },
          { icon: ImageIcon, title: "Cover images", subtitle: "Pick a beautiful invite cover from your library." },
          { icon: Shield, title: "Private gallery", subtitle: "Photos stay in your event until the host reveals them." },
        ]}
        privacyNote="Photos stay in your event's private gallery. You decide when they're revealed."
      />
    </OnboardShell>
  );
}
