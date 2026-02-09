import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TimelineEntry } from '@/src/models/timeline-entry';

export const TIMELINE_KEY = 'birdguard.timeline_entries.v1';

export async function loadTimelineEntries(): Promise<TimelineEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(TIMELINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimelineEntry[];
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log('[timeline] load_storage', {
        key: TIMELINE_KEY,
        count: Array.isArray(parsed) ? parsed.length : 0,
      });
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveTimelineEntries(entries: TimelineEntry[]): Promise<void> {
  await AsyncStorage.setItem(TIMELINE_KEY, JSON.stringify(entries));
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log('[timeline] save_storage', { key: TIMELINE_KEY, count: entries.length });
  }
}
