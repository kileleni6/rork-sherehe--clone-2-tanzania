// SHEREHE — luxe celebration palette
const palette = {
  bg: "#0A0A0B",
  bgElev: "#14141A",
  card: "#1C1C24",
  cardHi: "#26262F",
  hair: "#2A2A33",
  text: "#FFFFFF",
  subtext: "#A0A0AB",
  mute: "#6E6E78",
  pink: "#FF2D7A",
  pinkHi: "#FF6FA8",
  pinkDeep: "#C71153",
  magenta: "#8B0030",
  rose: "#F8D9E5",
  gold: "#F4C97B",
  ivory: "#FFF8F0",
  success: "#3DD68C",
  danger: "#FF5A6B",
};

export default {
  light: {
    text: palette.text,
    background: palette.bg,
    tint: palette.pink,
    tabIconDefault: palette.mute,
    tabIconSelected: palette.pink,
  },
  ...palette,
};

export const C = palette;
