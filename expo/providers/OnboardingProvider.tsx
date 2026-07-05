import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

import {
  applyTextDirection,
  detectDeviceLanguage,
  formatCurrency as fmtCurrency,
  formatDate as fmtDate,
  formatDateTime as fmtDateTime,
  formatNumber as fmtNumber,
  formatTime as fmtTime,
  isRTL,
  t as translate,
  type LangCode,
} from "@/lib/i18n";

const STORAGE_KEY = "sherehe.onboarding.v1";

export type Role = "host" | "guest" | "unknown";

export interface OnboardingState {
  completed: boolean;
  language: LangCode;
  role: Role;
  authed: boolean;
  authMethod?: "google" | "apple" | "phone" | "email" | "guest";
  notificationsEnabled: boolean;
  photosEnabled: boolean;
  interests: string[];
  displayName?: string;
}

const DEFAULT: OnboardingState = {
  completed: false,
  language: "en",
  role: "unknown",
  authed: false,
  notificationsEnabled: false,
  photosEnabled: false,
  interests: [],
};

// Sentinel that means "user hasn't picked a language yet". On first load we
// auto-detect from the device locale so the app feels native immediately.
const LANGUAGE_PICKED_KEY = "sherehe.onboarding.lang_picked.v1";

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["onboarding"],
    queryFn: async (): Promise<OnboardingState> => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<OnboardingState>) };
      } catch (e) {
        console.log("[onboarding] load failed", e);
      }
      return DEFAULT;
    },
  });

  const state = query.data ?? DEFAULT;

  // First-launch device-language detection. Only runs until the user picks a
  // language explicitly, after which we respect their choice across sessions.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const picked = await AsyncStorage.getItem(LANGUAGE_PICKED_KEY);
        if (picked === "1" || cancelled) return;
        const detected = detectDeviceLanguage();
        const current = (qc.getQueryData(["onboarding"]) as OnboardingState | undefined) ?? state;
        if (current.language === "en" && detected !== "en") {
          const next = { ...current, language: detected };
          qc.setQueryData(["onboarding"], next);
          try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
        }
      } catch (e) {
        console.log("[onboarding] lang detect failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the native text direction in sync with the chosen language so Arabic
  // and other RTL locales lay out correctly.
  useEffect(() => {
    applyTextDirection(state.language);
  }, [state.language]);

  const persist = useCallback(async (next: OnboardingState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log("[onboarding] save failed", e);
    }
  }, []);

  const update = useCallback(
    async (patch: Partial<OnboardingState>) => {
      const current = (qc.getQueryData(["onboarding"]) as OnboardingState | undefined) ?? state;
      const next = { ...current, ...patch };
      // Update cache synchronously so dependent components (e.g. the gate)
      // see the change immediately and we avoid a redirect race.
      qc.setQueryData(["onboarding"], next);
      await persist(next);
      if (patch.language !== undefined) {
        try {
          await AsyncStorage.setItem(LANGUAGE_PICKED_KEY, "1");
        } catch {}
        applyTextDirection(patch.language);
      }
    },
    [state, persist, qc]
  );

  const reset = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    qc.setQueryData(["onboarding"], DEFAULT);
  }, [qc]);

  const tt = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, state.language, vars),
    [state.language]
  );

  const formatNumber = useCallback((n: number) => fmtNumber(n, state.language), [state.language]);
  const formatCurrency = useCallback(
    (n: number, currency: string = "USD") => fmtCurrency(n, currency, state.language),
    [state.language]
  );
  const formatDate = useCallback(
    (ts: number | Date, opts?: Intl.DateTimeFormatOptions) => fmtDate(ts, state.language, opts),
    [state.language]
  );
  const formatTime = useCallback((ts: number | Date) => fmtTime(ts, state.language), [state.language]);
  const formatDateTime = useCallback((ts: number | Date) => fmtDateTime(ts, state.language), [state.language]);
  const rtl = isRTL(state.language);

  const isLoading = query.isLoading;

  return useMemo(
    () => ({
      ...state,
      isLoading,
      update,
      reset,
      t: tt,
      rtl,
      formatNumber,
      formatCurrency,
      formatDate,
      formatTime,
      formatDateTime,
    }),
    [state, isLoading, update, reset, tt, rtl, formatNumber, formatCurrency, formatDate, formatTime, formatDateTime]
  );
});
