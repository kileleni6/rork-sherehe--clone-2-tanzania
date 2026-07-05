import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * RevenueCat wrapper.
 *
 * react-native-purchases ships a native module that is NOT available in Expo Go
 * (Expo Go only bundles modules from the Expo SDK). To keep the paywall usable
 * both in Expo Go (mock unlock) and in a dev/preview/production build (real
 * StoreKit / Play Billing flow), we lazy-require the SDK and fall back to a
 * mock implementation when the native module is absent.
 *
 * Three RevenueCat apps power this client:
 *   - Test Store   → EXPO_PUBLIC_REVENUECAT_TEST_API_KEY  (Expo Go / web / __DEV__)
 *   - iOS App Store → EXPO_PUBLIC_REVENUECAT_IOS_API_KEY   (production iOS)
 *   - Google Play   → EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (production Android)
 */

export type PurchaseResult = { success: boolean; mocked: boolean; productId?: string; error?: string };

const isExpoGo = Constants.executionEnvironment === "storeClient";

function getRCToken(): string {
  // Expo Go and web previews always use the Test Store key
  if (isExpoGo || __DEV__ || Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? "";
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "",
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "",
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? "",
  });
}

let configured = false;
let cachedPurchases: typeof import("react-native-purchases").default | null = null;

function loadPurchases(): typeof import("react-native-purchases").default | null {
  if (Platform.OS === "web") return null;
  // Expo Go doesn't bundle RevenueCat's native module — mock so the UI
  // flow works end-to-end in the cloud simulator.
  // Dev builds on device/simulator DO have the native module and can
  // complete StoreKit / Play Billing sandbox purchases.
  if (isExpoGo) return null;
  if (cachedPurchases) return cachedPurchases;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-purchases");
    cachedPurchases = mod.default ?? mod;
    return cachedPurchases;
  } catch (e) {
    console.log("[purchases] native module unavailable", e);
    return null;
  }
}

export function isPurchasesAvailable(): boolean {
  return loadPurchases() !== null;
}

export async function configurePurchases(userId?: string): Promise<void> {
  const Purchases = loadPurchases();
  if (!Purchases || configured) return;
  const key = getRCToken();
  if (!key) {
    console.log("[purchases] missing RevenueCat API key");
    return;
  }
  try {
    Purchases.configure({ apiKey: key, appUserID: userId });
    configured = true;
    console.log("[purchases] configured");
  } catch (e) {
    console.log("[purchases] configure failed", e);
  }
}

export async function purchasePackageByKey(
  packageKey: string,
  productId?: string,
): Promise<PurchaseResult> {
  const Purchases = loadPurchases();
  if (!Purchases) {
    // Expo Go / web — mock success so the UI flow can be tested.
    console.log("[purchases] mock purchase", packageKey, productId);
    return { success: true, mocked: true, productId };
  }
  try {
    await configurePurchases();
    const offerings = await Purchases.getOfferings();
    const current = offerings.current ?? Object.values(offerings.all)[0];
    if (!current) return { success: false, mocked: false, error: "no_offering" };

    const pkg =
      current.availablePackages.find((p: { identifier: string }) => p.identifier === packageKey) ??
      current.availablePackages.find(
        (p: { product?: { identifier?: string } }) => p.product?.identifier === productId,
      );

    if (!pkg) {
      console.log("[purchases] package not found", packageKey, productId);
      return { success: false, mocked: false, error: "package_not_found" };
    }

    const result = await Purchases.purchasePackage(pkg);
    const entitled = !!result?.customerInfo?.entitlements?.active?.pro;
    return { success: entitled, mocked: false, productId };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled) {
      return { success: false, mocked: false, error: "user_cancelled" };
    }
    console.log("[purchases] purchase error", err?.message ?? e);
    return { success: false, mocked: false, error: err?.message ?? "purchase_failed" };
  }
}

export async function restorePurchases(): Promise<{ success: boolean; mocked: boolean; entitled: boolean }> {
  const Purchases = loadPurchases();
  if (!Purchases) {
    return { success: true, mocked: true, entitled: false };
  }
  try {
    await configurePurchases();
    const info = await Purchases.restorePurchases();
    const entitled = !!info?.entitlements?.active?.pro;
    return { success: true, mocked: false, entitled };
  } catch (e) {
    console.log("[purchases] restore failed", e);
    return { success: false, mocked: false, entitled: false };
  }
}
