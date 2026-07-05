import type { TextStyle } from "react-native";

import { C } from "@/constants/colors";

/** Typography tokens — system fonts, luxe hierarchy. */
export const T = {
  kicker: {
    color: C.pinkHi,
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 2.5,
    textTransform: "uppercase" as const,
  },
  screenTitle: {
    color: C.text,
    fontSize: 34,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  body: {
    color: C.subtext,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    color: C.subtext,
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700" as const,
  },
} satisfies Record<string, TextStyle>;
