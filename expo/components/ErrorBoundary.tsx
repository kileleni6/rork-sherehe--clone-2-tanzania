import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches rendering errors that would otherwise show the red-box crash screen.
 * Network-level "Failed to fetch" errors inside components (e.g. expo-image
 * failing to load a remote Unsplash cover) are silently swallowed so the app
 * keeps running. Genuine code bugs still log to the console so they can be
 * diagnosed.
 *
 * Only suppresses transient network errors — other errors still show a
 * friendly fallback UI instead of a white screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    const msg = error.message ?? "";
    // Suppress network-level errors — they are self-healing on retry
    if (
      msg === "Failed to fetch" ||
      msg === "Network request failed" ||
      msg === "Request timed out" ||
      msg === "signal is aborted without reason" ||
      msg.includes("AbortError")
    ) {
      console.log("[ErrorBoundary] suppressed render error:", msg);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (this.state.hasError) {
      console.warn("[ErrorBoundary] caught error:", error.message, info.componentStack?.slice(0, 200));
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.sub}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    color: C.text,
    fontSize: 18,
    fontWeight: "700" as const,
  },
  sub: {
    color: C.subtext,
    fontSize: 14,
    textAlign: "center",
  },
});
