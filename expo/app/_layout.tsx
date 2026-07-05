// Must be imported first — patches AbortController before any library creates one
import "@/lib/abort-polyfill";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui";
import { EventsProvider } from "@/providers/EventsProvider";
import { OnboardingProvider, useOnboarding } from "@/providers/OnboardingProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// ---------------------------------------------------------------------------
// Global error suppression — prevents transient network blips from surfacing
// as red-box crashes or full-screen error-boundary fallbacks.
// ---------------------------------------------------------------------------

const NETWORK_ERRORS = new Set([
  "Failed to fetch",
  "Network request failed",
  "Request timed out",
  "AbortError",
  "signal is aborted without reason",
  "The operation was aborted.",
  "The request timed out.",
]);

function isSuppressedMessage(msg: unknown): boolean {
  if (typeof msg !== "string") return false;
  if (NETWORK_ERRORS.has(msg)) return true;
  // Also match any message containing "AbortError" or "timed out"
  if (msg.includes("AbortError")) return true;
  if (msg.includes("timed out")) return true;
  if (msg.includes("Network request failed")) return true;
  return false;
}

function handleGlobalRejection(e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  if (isSuppressedMessage(msg)) {
    console.log("[app] suppressed rejection:", msg);
    return;
  }
  console.warn("[app] unhandled promise rejection:", msg);
}

if (typeof globalThis !== "undefined") {
  // 1. Standard unhandledrejection (works in modern Hermes & web)
  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("unhandledrejection", (event: Event) => {
      const e = event as Event & { reason?: unknown; promise?: Promise<unknown> };
      if (e.reason !== undefined) {
        try { e.preventDefault?.(); } catch { /* nop */ }
        handleGlobalRejection(e.reason);
      }
    });
  }

  // 2. React Native legacy ErrorUtils fallback (Hermes may not fire unhandledrejection)
  const g = globalThis as Record<string, unknown>;
  const errorUtils = g.ErrorUtils as { setGlobalHandler?: (fn: (error: Error, isFatal: boolean) => void) => void } | undefined;
  if (errorUtils?.setGlobalHandler) {
    const prevHandler = (g.ErrorUtils as Record<string, unknown>)._globalHandler as
      | ((error: Error, isFatal: boolean) => void)
      | undefined;
    errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      if (isSuppressedMessage(error.message)) {
        console.log("[app] suppressed global error:", error.message);
        return;
      }
      // Forward to the original handler for genuine errors
      if (prevHandler && !isSuppressedMessage(error.message)) {
        prevHandler(error, isFatal);
      } else {
        console.warn("[app] global error:", error.message, isFatal);
      }
    });
  }
}

/** Screens that are reachable during onboarding but live outside the
 *  onboarding route group — the gate must not redirect away from them. */
const ONBOARDING_ADJACENT = new Set(["plan-detail", "paywall"]);

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { completed, isLoading } = useOnboarding();
  const router = useRouter();
  const segments = useSegments() as string[];

  useEffect(() => {
    if (isLoading) return;
    const segment = segments[0] ?? "";
    const inOnboarding = segment === "onboarding" || ONBOARDING_ADJACENT.has(segment);
    if (!completed && !inOnboarding) {
      router.replace("/onboarding" as never);
    }
  }, [completed, isLoading, segments, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0A0B" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#0A0A0B" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="create" options={{ presentation: "modal", title: "New Event", animation: "slide_from_bottom" }} />
      <Stack.Screen name="event/[id]" options={{ headerTransparent: true, headerTitle: "", animation: "fade_from_bottom" }} />
      <Stack.Screen name="invite/[id]" options={{ headerTransparent: true, headerTitle: "", animation: "fade_from_bottom" }} />
      <Stack.Screen name="camera/[id]" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
      <Stack.Screen name="gallery/[id]" options={{ headerTransparent: true, headerTitle: "", animation: "fade_from_bottom" }} />
      <Stack.Screen name="pass/[id]" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="checkin/[id]" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="plan-detail" options={{ presentation: "modal", headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="guest-list/[id]" options={{ headerTransparent: true, headerTitle: "", animation: "fade_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OnboardingProvider>
          <EventsProvider>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
              <StatusBar style="light" />
              <ToastProvider>
                <OnboardingGate>
                  <RootLayoutNav />
                </OnboardingGate>
              </ToastProvider>
            </GestureHandlerRootView>
          </EventsProvider>
        </OnboardingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
