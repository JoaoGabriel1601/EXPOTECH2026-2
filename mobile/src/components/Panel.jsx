import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../utils/theme";

function PanelComponent({ children, padded = true, style }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          padding: padded ? spacing.lg : spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});

export const Panel = memo(PanelComponent);
