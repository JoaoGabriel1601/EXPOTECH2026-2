import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../contexts/ThemeContext";
import { DashboardScreen } from "../screens/DashboardScreen";

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { theme, resolvedMode } = useTheme();

  const navTheme = {
    ...(resolvedMode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(resolvedMode === "dark" ? DarkTheme : DefaultTheme).colors,
      background: theme.bg,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
