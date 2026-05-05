import { matchFont } from "@shopify/react-native-skia";
import { Platform } from "react-native";

const fontFamily = Platform.select({
  ios: "Helvetica",
  android: "sans-serif",
  default: "sans-serif",
});

export function useFonts(size = 11) {
  return matchFont({
    fontFamily,
    fontSize: size,
    fontStyle: "normal",
    fontWeight: "500",
  });
}
