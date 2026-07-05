import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type HapticKind =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

/** Native-feeling haptic feedback. No-ops on web. */
export function triggerHaptic(kind: HapticKind = "selection"): void {
  if (Platform.OS === "web") return;

  const run = async () => {
    switch (kind) {
      case "selection":
        await Haptics.selectionAsync();
        break;
      case "light":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  };

  run().catch(() => {});
}
