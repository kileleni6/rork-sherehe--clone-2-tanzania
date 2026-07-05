export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  // Preserve the original path so OAuth callbacks and other deep links
  // are not rewritten to `/` (which would trigger the OnboardingGate redirect).
  return path;
}
