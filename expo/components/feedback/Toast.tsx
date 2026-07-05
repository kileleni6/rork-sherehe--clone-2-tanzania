import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable/PressableScale";
import { C } from "@/constants/colors";
import { MOTION } from "@/constants/motion";
import { R, S } from "@/constants/spacing";
import { triggerHaptic } from "@/lib/haptics";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastBubble({ item, onHide }: { item: ToastItem; onHide: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: MOTION.normal, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 28, bounciness: 6 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: MOTION.fast, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: MOTION.fast, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onHide(item.id);
      });
    }, 2800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only toast lifecycle
  }, []);

  const colors = {
    success: { bg: "rgba(61,214,140,0.15)", border: "rgba(61,214,140,0.35)", fg: C.success },
    error: { bg: "rgba(255,90,107,0.15)", border: "rgba(255,90,107,0.35)", fg: C.danger },
    info: { bg: "rgba(255,45,122,0.12)", border: "rgba(255,45,122,0.3)", fg: C.pinkHi },
  }[item.kind];

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }], backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.toastText, { color: colors.fg }]}>{item.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const hide = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    triggerHaptic(kind === "success" ? "success" : kind === "error" ? "error" : "selection");
    idRef.current += 1;
    setItems((prev) => [...prev.slice(-2), { id: idRef.current, message, kind }]);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
        {items.map((item) => (
          <ToastBubble key={item.id} item={item} onHide={hide} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

/** Standalone toast action button for EmptyState CTAs. */
export function ToastActionButton({
  title,
  onPress,
  icon: Icon,
}: {
  title: string;
  onPress: () => void;
  icon?: LucideIcon;
}) {
  return (
    <PressableScale onPress={onPress} haptic="light" style={styles.actionWrap}>
      <LinearGradient colors={[C.pinkHi, C.pink, C.pinkDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
        {Icon ? <Icon color={C.text} size={18} /> : null}
        <Text style={styles.actionText}>{title}</Text>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: S.lg,
    right: S.lg,
    zIndex: 9999,
    gap: S.sm,
    alignItems: "center",
  },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: R.pill,
    borderWidth: 1,
    maxWidth: "100%",
  },
  toastText: { fontSize: 14, fontWeight: "600" as const, textAlign: "center" as const },
  actionWrap: { marginTop: S.md, alignSelf: "stretch" as const, borderRadius: R.pill, overflow: "hidden" },
  actionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { color: C.text, fontSize: 15, fontWeight: "700" as const },
});
