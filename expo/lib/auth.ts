import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = "google" | "apple";

export interface OAuthResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
}

/**
 * Sign in with Supabase OAuth (Google / Apple) via an in-app browser session.
 *
 * The provider redirects to Supabase's callback URL
 * (https://<project>.supabase.co/auth/v1/callback), which then bounces
 * back to our app's deep link with an access + refresh token in the URL hash.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<OAuthResult> {
  try {
    const redirectTo = Linking.createURL("/onboarding/auth");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { ok: false, error: error.message };
    if (!data?.url) return { ok: false, error: "No auth URL returned" };

    if (Platform.OS === "web") {
      // Let the browser handle it; Supabase will detect the session on return.
      window.location.href = data.url;
      return { ok: true };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: false,
    });
    if (result.type === "cancel" || result.type === "dismiss") {
      return { ok: false, cancelled: true };
    }
    if (result.type !== "success" || !result.url) {
      return { ok: false, error: "Sign-in did not complete" };
    }

    const tokens = parseTokensFromUrl(result.url);
    if (!tokens.access_token || !tokens.refresh_token) {
      return { ok: false, error: "Missing session tokens" };
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    if (sessionError) return { ok: false, error: sessionError.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.log("[auth] signInWithProvider failed", message);
    return { ok: false, error: message };
  }
}

function parseTokensFromUrl(url: string): { access_token?: string; refresh_token?: string } {
  try {
    const hashIndex = url.indexOf("#");
    const queryIndex = url.indexOf("?");
    const part =
      hashIndex >= 0
        ? url.substring(hashIndex + 1)
        : queryIndex >= 0
        ? url.substring(queryIndex + 1)
        : "";
    if (!part) return {};
    const params = new URLSearchParams(part);
    return {
      access_token: params.get("access_token") ?? undefined,
      refresh_token: params.get("refresh_token") ?? undefined,
    };
  } catch (e) {
    console.log("[auth] parseTokensFromUrl failed", e);
    return {};
  }
}
