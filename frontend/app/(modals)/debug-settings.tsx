import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useDayRecords } from '@/src/context/day-records-context';
import { useTimeline } from '@/src/context/timeline-context';
import { getQuizVersion, setQuizVersion, markDebugReset } from '@/src/storage/debug-settings';
import { RECORDS_KEY } from '@/src/storage/day-record-storage';
import { TIMELINE_KEY } from '@/src/storage/timeline-storage';

export default function DebugSettingsModal() {
  const router = useRouter();
  const { reload: reloadRecords } = useDayRecords();
  const { reload: reloadTimeline } = useTimeline();
  const [version, setVersion] = useState(1);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await getQuizVersion(1);
      if (!cancelled) setVersion(current);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVersion = async (next: number) => {
    await setQuizVersion(next);
    await markDebugReset();
    await AsyncStorage.multiRemove([RECORDS_KEY, TIMELINE_KEY]);
    await reloadRecords();
    await reloadTimeline();
    setVersion(next);
    setMessage(`버전이 V${next}로 변경됐어요. 기록을 초기화했어요.`);
  };

  const handleReset = async () => {
    await markDebugReset();
    await AsyncStorage.multiRemove([RECORDS_KEY, TIMELINE_KEY]);
    await reloadRecords();
    await reloadTimeline();
    setMessage('기록을 초기화했어요.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>디버그 설정</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>버전 전환</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.versionButton, version === 1 && styles.versionActive]}
              onPress={() => void handleVersion(1)}>
              <Text style={styles.versionText}>V1 (하드코딩)</Text>
            </Pressable>
            <Pressable
              style={[styles.versionButton, version === 2 && styles.versionActive]}
              onPress={() => void handleVersion(2)}>
              <Text style={styles.versionText}>V2 (업로드)</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>기록 초기화</Text>
          <Pressable style={styles.resetButton} onPress={() => void handleReset()}>
            <Text style={styles.resetText}>모든 기록 삭제</Text>
          </Pressable>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5f5147',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f2e6df',
  },
  closeText: {
    fontSize: 12,
    color: '#6b5b52',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff7f3',
    borderWidth: 1,
    borderColor: '#efe1d9',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6f6258',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  versionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f2e6df',
    alignItems: 'center',
  },
  versionActive: {
    backgroundColor: '#e2b8a7',
  },
  versionText: {
    fontSize: 13,
    color: '#5a4b42',
  },
  resetButton: {
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f0d7cf',
    alignItems: 'center',
  },
  resetText: {
    fontSize: 13,
    color: '#5a4b42',
  },
  message: {
    fontSize: 12,
    color: '#7b6c62',
  },
});
