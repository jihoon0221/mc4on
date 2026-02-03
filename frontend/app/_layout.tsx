import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { DayRecordsProvider } from "@/src/context/day-records-context";
import { ProfileProvider } from "@/src/context/profile-context";
import { TimelineProvider } from "@/src/context/timeline-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <DayRecordsProvider>
        <TimelineProvider>
          <ProfileProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              {/* ✅ Learn 모달 */}
              <Stack.Screen
                name="(modals)/learn"
                options={{ presentation: "transparentModal" }}
              />
              <Stack.Screen
                name="(modals)/learn-notepad"
                options={{ presentation: "transparentModal", headerShown: false }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ProfileProvider>
        </TimelineProvider>
      </DayRecordsProvider>
    </ThemeProvider>
  );
}
