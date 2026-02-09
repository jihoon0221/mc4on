import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUIZ_VERSION_KEY = 'birdguard.quiz_version';
export const DEBUG_RESET_KEY = 'birdguard.debug_reset';

export async function getQuizVersion(defaultValue = 1): Promise<number> {
  const raw = await AsyncStorage.getItem(QUIZ_VERSION_KEY);
  const parsed = raw ? Number(raw) : defaultValue;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export async function setQuizVersion(value: number): Promise<void> {
  await AsyncStorage.setItem(QUIZ_VERSION_KEY, String(value));
}

export async function markDebugReset(): Promise<void> {
  await AsyncStorage.setItem(DEBUG_RESET_KEY, new Date().toISOString());
}

export async function consumeDebugReset(): Promise<boolean> {
  const value = await AsyncStorage.getItem(DEBUG_RESET_KEY);
  if (!value) return false;
  await AsyncStorage.removeItem(DEBUG_RESET_KEY);
  return true;
}
