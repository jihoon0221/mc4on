import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import TopBar from '@/src/components/TopBar';
import JourneyHeader from '@/src/components/JourneyHeader';
import TimelineCard, { type TimelineCardItem } from '@/src/components/TimelineCard';
import SettingsMenu from '@/src/components/SettingsMenu';
import RelationshipFlowHeader from '@/src/components/RelationshipFlowHeader';
import { useTimeline } from '@/src/context/timeline-context';
import type { BirdState as ModelBirdState } from '@/src/models/bird-state';
import type { BirdState as VisualBirdState } from '@/src/components/BirdCharacter';
import { getSeoulDateKey } from '@/src/utils/date';
import { getV1DayIndex } from '@/src/utils/v1-day-index';
import { getV2DayIndex } from '@/src/utils/v2-day-index';

const EMPTY_ITEMS: TimelineCardItem[] = [];

function formatMonthDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!month || !day) return date;
  return `${month}월 ${day}일`;
}

function ensureHashTags(tags: string[]) {
  if (!tags.length) return ['#일상대화'];
  return tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}

function mapBirdState(state?: ModelBirdState): VisualBirdState {
  if (!state) return 'healthy';
  if (state === 'calm') return 'healthy';
  if (state === 'cautious') return 'uneasy';
  if (state === 'anxious') return 'distorted';
  if (state === 'relieved') return 'healthy';
  if (state === 'growing') return 'healthy';
  return 'healthy';
}

function birdSeverity(state: VisualBirdState): number {
  if (state === 'critical') return 3;
  if (state === 'distorted') return 2;
  if (state === 'uneasy') return 1;
  return 0;
}

function birdFromSeverity(value: number): VisualBirdState {
  if (value >= 3) return 'critical';
  if (value >= 2) return 'distorted';
  if (value >= 1) return 'uneasy';
  return 'healthy';
}

const WARNING_MESSAGE = '이 기록은 잠시 멈춰 다시 살펴볼 만한 부분이 있어요.';
const FLOW_MESSAGE = '최근 흐름을 요약해서 보여줘요.';

function stageFromDayIndex(dayIndex: number) {
  if (dayIndex <= 1) return 0;
  if (dayIndex === 2) return 1;
  if (dayIndex === 3) return 2;
  if (dayIndex <= 6) return 3;
  if (dayIndex <= 9) return 4;
  return 5;
}

export default function TimelineScreen() {
  const router = useRouter();
  const { entries } = useTimeline();
  const [warningTarget, setWarningTarget] = useState<TimelineCardItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const todayKey = useMemo(() => getSeoulDateKey(), []);

  const sortedRecords = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  const dayIndexByDate = useMemo(() => {
    const ascending = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, number>();
    ascending.forEach((record, index) => {
      map.set(record.date, index + 1);
    });
    return map;
  }, [entries]);
  const cumulativeBirdByDate = useMemo(() => {
    const ascending = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, VisualBirdState>();
    let worst = 0;
    ascending.forEach((record) => {
      const visual = mapBirdState(record.birdState);
      worst = Math.max(worst, birdSeverity(visual));
      map.set(record.date, birdFromSeverity(worst));
    });
    return map;
  }, [entries]);

  const items = useMemo(() => {
    if (sortedRecords.length === 0) return EMPTY_ITEMS;
    return sortedRecords.map((record, index) => {
      const tags = ensureHashTags(record.tags ?? []);
      const isToday = record.date === todayKey;
      const dayIndex = dayIndexByDate.get(record.date) ?? index + 1;
      const groupLabel = isToday ? '오늘' : `Day ${dayIndex}`;
      const title = record.summary || '오늘의 기록';
      const subtitle = '';
      const hasWarning = Boolean(record.warningText) || (record.warningTags?.length ?? 0) > 0;

      const visualBirdState = cumulativeBirdByDate.get(record.date) ?? mapBirdState(record.birdState);
      return {
        id: record.id ?? record.date,
        groupLabel,
        dateLabel: formatMonthDay(record.date),
        title,
        subtitle,
        tags,
        status: 'pending',
        birdState: visualBirdState,
        __meta: {
          rawTags: [...(record.tags ?? []), ...(record.warningTags ?? [])].join(' '),
          riskLevel: record.riskLevel ?? null,
        },
        __hasWarning: hasWarning,
      } as TimelineCardItem & { __meta: { rawTags: string; riskLevel: number | null } };
    });
  }, [sortedRecords, todayKey]);

  const filtered = useMemo(() => items, [items]);

  const last7Count = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return sortedRecords.filter((record) => {
      const date = new Date(record.date + 'T00:00:00');
      const hasSignal = (record.warningTags?.length ?? 0) > 0 || (record.riskLevel ?? 0) >= 3;
      return hasSignal && date >= cutoff;
    }).length;
  }, [sortedRecords]);

  const highSignalToday = useMemo(() => {
    const today = sortedRecords[0];
    if (!today) return false;
    const count = today.warningTags?.length ?? 0;
    return (today.riskLevel ?? 0) >= 3 || count >= 2;
  }, [sortedRecords]);

  const flowStageIndex = useMemo(() => {
    const latest = sortedRecords[0];
    if (!latest) return 0;
    const dayIndex = dayIndexByDate.get(latest.date) ?? 1;
    return stageFromDayIndex(dayIndex);
  }, [sortedRecords, dayIndexByDate]);
  const flowBirdState = useMemo(() => {
    const latest = sortedRecords[0];
    if (!latest) return 'healthy';
    return cumulativeBirdByDate.get(latest.date) ?? mapBirdState(latest.birdState);
  }, [sortedRecords, cumulativeBirdByDate]);

  const relationshipLabels = useMemo(() => {
    const latest = sortedRecords[0];
    const isV2 = latest?.version === 2 ? true : latest?.version === 1 ? false : latest ? Boolean(getV2DayIndex(latest.date)) : false;
    if (isV2) {
      return [
        '접촉/관심',
        '친밀감 형성',
        '신뢰 구축',
        '위기 제시',
        '금전/결제 유도',
      ];
    }
    return ['첫 인사', '일상 공유', '감정 교류', '신뢰 확인', '안정감'];
  }, [sortedRecords]);

  const relationshipStageIndex = useMemo(() => {
    const latest = sortedRecords[0];
    if (!latest) return 0;
    const dayIndex =
      latest.version === 2
        ? getV2DayIndex(latest.date) ?? 1
        : latest.version === 1
          ? getV1DayIndex(latest.date) ?? 1
          : getV2DayIndex(latest.date) ?? getV1DayIndex(latest.date) ?? 1;
    if (dayIndex <= 2) return 0;
    if (dayIndex <= 4) return 1;
    if (dayIndex <= 6) return 2;
    if (dayIndex <= 8) return 3;
    return 4;
  }, [sortedRecords]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <TopBar onPressSettings={() => setSettingsOpen(true)} />

            {items.length > 0 ? (
              <RelationshipFlowHeader
                labels={relationshipLabels}
                activeIndex={relationshipStageIndex}
                birdState={flowBirdState}
              />
            ) : null}

            {highSignalToday ? (
              <Pressable
                style={styles.warningButton}
                onPress={() => {
                  if (items.length > 0) setWarningTarget(items[0]);
                }}>
                <View style={styles.warningButtonLeft}>
                  <Ionicons name="alert-circle" size={16} color="#6c5f56" />
                  <Text style={styles.warningButtonText}>주의 흐름</Text>
                </View>
                <View style={styles.warningBadge}>
                  <Text style={styles.warningBadgeText}>오늘 강한 신호</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const meta = item as TimelineCardItem & { __hasWarning?: boolean };
          return (
            <TimelineCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/timeline/[id]',
                  params: { id: item.id },
                })
              }
              onWarningPress={meta.__hasWarning ? () => setWarningTarget(item) : undefined}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>아직 기록이 없어요.</Text>
          </View>
        }
      />

      {warningTarget ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>주의 흐름</Text>
            <Text style={styles.overlayItem}>{FLOW_MESSAGE}</Text>
            <JourneyHeader activeIndex={flowStageIndex} birdState={flowBirdState} onRewindPress={() => {}} />
            <View style={styles.overlayActions}>
              <Pressable style={styles.overlayButton} onPress={() => setWarningTarget(null)}>
                <Text style={styles.overlayButtonText}>닫기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <SettingsMenu visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerWrap: {
    gap: 16,
    paddingBottom: 8,
  },
  warningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  warningButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c5f56',
  },
  warningBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  warningBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5d4e45',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 64,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5f5147',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  separator: {
    height: 12,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9a8a7d',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(50, 40, 32, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#f7eeea',
    padding: 18,
    gap: 10,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5c4e44',
  },
  overlayList: {
    gap: 6,
  },
  overlayItem: {
    fontSize: 13,
    color: '#7b6c62',
  },
  overlayActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  overlayButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  overlayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d4e45',
  },
  overlayButtonGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  overlayGhostText: {
    fontSize: 13,
    color: '#7b6c62',
  },
});
