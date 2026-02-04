import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import LearnScreen from '@/src/screens/LearnScreen';
import { useDayRecords } from '@/src/context/day-records-context';
import { useTimeline } from '@/src/context/timeline-context';
import { getSeoulDateKey } from '@/src/utils/date';
import { clearPendingBatchDates, loadPendingBatchDates } from '@/src/storage/batch-memo-storage';

export default function LearnNotepadModal() {
  const { records } = useDayRecords();
  const { entries: timelineEntries, reload: reloadTimeline } = useTimeline();
  const todayKey = useMemo(() => getSeoulDateKey(), []);
  const todayRecord = useMemo(
    () => records.find((record) => record.date === todayKey),
    [records, todayKey]
  );

  const [batchMemo, setBatchMemo] = React.useState<string | null>(null);
  const [hasBatchMemo, setHasBatchMemo] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const buildMemo = async () => {
      const dates = await loadPendingBatchDates();
      if (!active || dates.length === 0) return;
      await reloadTimeline();
      const byDate = new Map(timelineEntries.map((entry) => [entry.date, entry]));
      const missing = dates.filter((date) => !byDate.has(date));
      if (missing.length > 0) return;
      const lines = dates
        .slice()
        .sort()
        .map((date) => {
          const entry = byDate.get(date);
          const text = entry?.summary ?? entry?.warningText ?? '요약이 준비 중이에요.';
          return `${date.replace(/-/g, '.')} · ${text}`;
        });
      if (!active) return;
      setBatchMemo(lines.join('\n'));
      setHasBatchMemo(true);
      await clearPendingBatchDates();
    };
    void buildMemo();
    return () => {
      active = false;
    };
  }, [reloadTimeline, timelineEntries]);

  const insightContent = (
    <View>
      {hasBatchMemo && batchMemo ? (
        <View style={styles.batchWrap}>
          <Text style={styles.insightTitle}>최근 대화 메모</Text>
          <Text style={styles.insightBody}>{batchMemo}</Text>
        </View>
      ) : null}
      <Text style={styles.insightTitle}>오늘의 요약</Text>
      {todayRecord?.summaryText ? (
        <Text style={styles.insightBody}>{todayRecord.summaryText}</Text>
      ) : (
        <Text style={styles.insightBody}>요약을 준비 중이에요.</Text>
      )}

      {todayRecord?.summaryTags && todayRecord.summaryTags.length > 0 ? (
        <View style={styles.tagRow}>
          {todayRecord.summaryTags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag.replace(/^#/, '')}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.insightTitle}>주의 메시지</Text>
      {todayRecord?.warningText ? (
        <Text style={styles.insightBody}>{todayRecord.warningText}</Text>
      ) : (
        <Text style={styles.insightBody}>아직은 조용한 흐름이에요.</Text>
      )}

      {todayRecord?.warningTags && todayRecord.warningTags.length > 0 ? (
        <View style={styles.tagRow}>
          {todayRecord.warningTags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag.replace(/^#/, '')}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {todayRecord?.learningItems && todayRecord.learningItems.length > 0 ? (
        <View style={styles.learningWrap}>
          <Text style={styles.insightTitle}>오늘의 표현</Text>
          {todayRecord.learningItems.slice(0, 3).map((item, index) => (
            <Text key={`${item.content}-${index}`} style={styles.insightBody}>
              {item.content}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <View style={styles.notepad}>
        <View style={styles.notepadHeader}>
          <View style={styles.headerLine} />
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          <LearnScreen closeOnComplete insightContent={insightContent} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  notepad: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    borderRadius: 26,
    backgroundColor: '#f8f0eb',
    overflow: 'hidden',
    height: '82%',
    minHeight: 420,
  },
  content: {
    flex: 1,
  },
  notepadHeader: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(232, 202, 191, 0.35)',
  },
  headerLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(160, 132, 112, 0.2)',
    bottom: 8,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  closeText: {
    fontSize: 12,
    color: '#7b6c62',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6e5f54',
    marginBottom: 6,
    marginTop: 12,
  },
  insightList: {
    gap: 4,
  },
  insightBody: {
    fontSize: 12,
    color: '#7b6c62',
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(199, 171, 154, 0.35)',
  },
  tagText: {
    fontSize: 11,
    color: '#7b6c62',
  },
  learningWrap: {
    marginTop: 8,
    gap: 4,
  },
  batchWrap: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});
