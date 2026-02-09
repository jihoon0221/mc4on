import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useDayRecords } from '@/src/context/day-records-context';
import { useTimeline } from '@/src/context/timeline-context';
import { buildV2AnalysisResult, buildV2TimelineEntry } from '@/src/data/result_v2';
import { QUIZ_V2 } from '@/src/data/quiz_v2';
import { getDebugV2Day, getQuizVersion, markDebugReset, setDebugV2Day, setQuizVersion } from '@/src/storage/debug-settings';
import { RECORDS_KEY } from '@/src/storage/day-record-storage';
import { TIMELINE_KEY } from '@/src/storage/timeline-storage';

export default function DebugSettingsModal() {
  const router = useRouter();
  const { replaceAll: replaceRecords, reload: reloadRecords } = useDayRecords();
  const { replaceEntries, reload: reloadTimeline } = useTimeline();
  const [version, setVersion] = useState(1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await getQuizVersion(1);
      const debugDay = await getDebugV2Day();
      if (!cancelled) setVersion(current);
      if (!cancelled) setSelectedDay(debugDay);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVersion = async (next: number) => {
    await setQuizVersion(next);
    await markDebugReset();
    await AsyncStorage.multiRemove([RECORDS_KEY, TIMELINE_KEY]);
    await setDebugV2Day(null);
    await reloadRecords();
    await reloadTimeline();
    setVersion(next);
    setSelectedDay(null);
    setMessage(`버전이 V${next}로 변경됐어요. 기록을 초기화했어요.`);
  };

  const handleReset = async () => {
    await markDebugReset();
    await AsyncStorage.multiRemove([RECORDS_KEY, TIMELINE_KEY]);
    await setDebugV2Day(null);
    await reloadRecords();
    await reloadTimeline();
    setSelectedDay(null);
    setMessage('기록을 초기화했어요.');
  };

  const handleSelectDay = async (dayIndex: number) => {
    const bundle = QUIZ_V2[dayIndex];
    if (!bundle) return;
    const date = bundle.date;
    const now = new Date().toISOString();
    const slice = QUIZ_V2.slice(0, dayIndex + 1);
    const nextRecords = slice.map((item) => {
      const analysis = buildV2AnalysisResult(item);
      return {
        id: `day_${item.date}`,
        date: item.date,
        source: 'kakaotalk_txt' as const,
        sourceFileName: `debug_v2_${item.date}.zip`,
        extractedSentences: analysis.learning_items.map((learn) => learn.content_kr).filter(Boolean).slice(0, 3),
        nativeSentences: analysis.learning_items.map((learn) => learn.content_fl).filter(Boolean),
        flags: {
          moneyRequest: false,
          favorRequest: false,
          excessivePraise: false,
          linkIncluded: false,
          imageIncluded: false,
        },
        uploadCount: 1,
        learned: false,
        immediateRisk: {
          scamUrl: false,
          reportedAccount: false,
          aiImage: false,
        },
        immediateRiskShown: false,
        analysisResult: analysis,
        createdAt: now,
        updatedAt: now,
      };
    });
    const nextTimeline = slice.map((item) => buildV2TimelineEntry(item));
    await setDebugV2Day(date);
    await replaceRecords(nextRecords);
    await replaceEntries(nextTimeline);
    setSelectedDay(date);
    setMessage(`V2 Day ${dayIndex + 1} (${date})로 설정했어요.`);
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

        {version === 2 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>V2 Day 선택</Text>
            <View style={styles.dayGrid}>
              {QUIZ_V2.map((bundle, index) => {
                const isSelected = selectedDay === bundle.date;
                return (
                  <Pressable
                    key={bundle.date}
                    style={[styles.dayButton, isSelected && styles.dayButtonActive]}
                    onPress={() => void handleSelectDay(index)}>
                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                      Day {index + 1}
                    </Text>
                    <Text style={[styles.daySubText, isSelected && styles.dayTextActive]}>
                      {bundle.date.replace(/-/g, '.')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

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
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayButton: {
    width: '31%',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f2e6df',
    alignItems: 'center',
    gap: 4,
  },
  dayButtonActive: {
    backgroundColor: '#e2b8a7',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a4b42',
  },
  daySubText: {
    fontSize: 11,
    color: '#7b6c62',
  },
  dayTextActive: {
    color: '#4b3b33',
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
