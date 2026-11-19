
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <>
      {/* Sin backgroundColor: con edge-to-edge (obligatorio en Expo actual) esa prop ya no existe/no hace nada. */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: Colors.background,
          },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
