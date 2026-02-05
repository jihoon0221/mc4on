import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import FilterChips, { type FilterKey } from '@/src/components/FilterChips';
import TopBar from '@/src/components/TopBar';
import JourneyHeader from '@/src/components/JourneyHeader';
import TimelineCard, { type TimelineCardItem } from '@/src/components/TimelineCard';
import SettingsMenu from '@/src/components/SettingsMenu';
import { fetchTimelineEntries } from '@/src/api/timeline';
import { loadTimelineEntries } from '@/src/storage/timeline-storage';
import type { BirdState as ModelBirdState } from '@/src/models/bird-state';
import type { TimelineEntry } from '@/src/models/timeline-entry';
import type { BirdState as VisualBirdState } from '@/src/components/BirdCharacter';
import { getSeoulDateKey } from '@/src/utils/date';

const STAGE_TAGS = {
  stage2: ['#비밀공유', '#개인사', '#신뢰강조'],
  stage3: ['#부담감조성', '#금전언급', '#링크포함', '#이미지포함'],
};

const MOCK_ITEMS: TimelineCardItem[] = [
  {
    id: 'mock-0',
    groupLabel: '오늘',
    dateLabel: '4월 24일',
    title: '처음 인사',
    subtitle: '최근 도움·부담과 관련된 이야기가 등장했어요.',
    tags: ['#부담감조성', '#금전언급'],
    status: 'pending',
    birdState: 'healthy',
  },
  {
    id: 'mock-1',
    groupLabel: 'Day 5',
    dateLabel: '4월 16일',
    title: '신뢰를 강조하는 말이 많아졌어요',
    subtitle: '개인적인 사연이 조금씩 더 공유되었어요.',
    tags: ['#비밀공유', '#신뢰강조'],
    status: 'learned',
    birdState: 'uneasy',
  },
  {
    id: 'mock-2',
    groupLabel: 'Day 1',
    dateLabel: '4월 12일',
    title: '처음 인사를 나눴어요',
    subtitle: '조용히 관계가 시작되었어요.',
    tags: ['#첫인사'],
    status: 'learned',
    birdState: 'healthy',
  },
];

function formatMonthDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!month || !day) return date;
  return `${month}월 ${day}일`;
}

function ensureHashTags(tags: string[]) {
  if (!tags.length) return ['#일상대화'];
  return tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}

function deriveStage(tags: string[], totalCount: number) {
  if (tags.some((tag) => STAGE_TAGS.stage3.includes(tag))) return 3;
  if (tags.some((tag) => STAGE_TAGS.stage2.includes(tag))) return 2;
  if (totalCount >= 3) return 1;
  return 0;
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

const WARNING_MESSAGE = '이 기록은 잠시 멈춰 다시 살펴볼 만한 부분이 있어요.';

export default function TimelineScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [warningTarget, setWarningTarget] = useState<TimelineCardItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const todayKey = useMemo(() => getSeoulDateKey(), []);

  useEffect(() => {
    let mounted = true;
    fetchTimelineEntries()
      .then((data) => {
        if (!mounted) return;
        if (data.length > 0) {
          setEntries(data);
          return;
        }
        loadTimelineEntries().then((stored) => {
          if (!mounted) return;
          setEntries(stored);
        });
      })
      .catch(() => {
        if (!mounted) return;
        loadTimelineEntries().then((stored) => {
          if (!mounted) return;
          setEntries(stored);
        });
      })
      .finally(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const sortedRecords = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);

  const items = useMemo(() => {
    if (sortedRecords.length === 0) return MOCK_ITEMS;
    return sortedRecords.map((record, index) => {
      const tags = ensureHashTags(record.tags ?? []);
      const isToday = record.date === todayKey;
      const groupLabel = isToday ? '오늘' : `Day ${index + 1}`;
      const title = record.summary || record.warningText || '오늘의 기록';
      const subtitle = record.warningText ?? '차분한 흐름으로 이어졌어요.';

      return {
        id: record.id ?? record.date,
        groupLabel,
        dateLabel: formatMonthDay(record.date),
        title,
        subtitle,
        tags,
        status: 'pending',
        birdState: mapBirdState(record.birdState),
        __meta: {
          rawTags: [...(record.tags ?? []), ...(record.warningTags ?? [])].join(' '),
          riskLevel: record.riskLevel ?? null,
        },
      } as TimelineCardItem & { __meta: { rawTags: string; riskLevel: number | null } };
    });
  }, [sortedRecords, todayKey]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => {
      const meta = (item as TimelineCardItem & { __meta?: { rawTags: string } }).__meta;
      return meta ? meta.rawTags.includes(CHIP_LABELS[filter]) : item.tags.join(' ').includes(CHIP_LABELS[filter]);
    });
  }, [filter, items]);

  const recentTags = useMemo(() => {
    return items.slice(0, 3).flatMap((item) => item.tags);
  }, [items]);

  const stageIndex = useMemo(() => deriveStage(recentTags, items.length), [recentTags, items.length]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <TopBar onPressSettings={() => setSettingsOpen(true)} />

            <JourneyHeader activeIndex={stageIndex} birdState="healthy" onRewindPress={() => { /* TODO: rewind modal */ }} />

            <View style={styles.warningButton}>
              <View style={styles.warningButtonLeft}>
                <Ionicons name="alert-circle" size={16} color="#6c5f56" />
                <Text style={styles.warningButtonText}>주의 흐름</Text>
              </View>
              <View style={styles.warningBadge}>
                <Text style={styles.warningBadgeText}>
                  {highSignalToday ? '오늘 강한 신호' : `최근 7일 ${last7Count}개 신호`}
                </Text>
              </View>
            </View>

            <FilterChips selected={filter} onSelect={setFilter} />
          </View>
        }
        renderItem={({ item }) => (
          <TimelineCard
            item={item}
            onPress={() =>
              router.push({
                pathname: '/timeline/[id]',
                params: { id: item.id },
              })
            }
            onWarningPress={() => setWarningTarget(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {warningTarget ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>확인해 볼까요?</Text>
            <Text style={styles.overlayItem}>{WARNING_MESSAGE}</Text>
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

const CHIP_LABELS: Record<FilterKey, string> = {
  all: '전체',
  money: '금전',
  favor: '부탁',
  praise: '과한칭찬',
  link: '링크',
  image: '이미지',
};

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
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningButtonText: {
    fontSize: 13,
    color: '#5d4e45',
    fontWeight: '600',
  },
  warningBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(215, 191, 176, 0.5)',
  },
  warningBadgeText: {
    fontSize: 11,
    color: '#6d5f55',
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
