import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDayRecords } from '@/src/context/day-records-context';
import { useTimeline } from '@/src/context/timeline-context';
import { mapWarningTags } from '@/src/utils/warning-tags';
import SimilarChatCard from '@/src/components/SimilarChatCard';
import { getV2DayIndex } from '@/src/utils/v2-day-index';

const FLAG_ROWS = [
  { key: 'moneyRequest', label: '금전 요청' },
  { key: 'favorRequest', label: '부탁' },
  { key: 'excessivePraise', label: '과한 칭찬' },
  { key: 'linkIncluded', label: '링크 포함' },
  { key: 'imageIncluded', label: '이미지 포함' },
] as const;

function formatDate(date: string) {
  return date.replace(/-/g, '.');
}

function buildTags(flags: Record<string, boolean>) {
  const tags: string[] = [];
  if (flags.moneyRequest) tags.push('#금전');
  if (flags.favorRequest) tags.push('#부탁');
  if (flags.excessivePraise) tags.push('#과한칭찬');
  if (flags.linkIncluded) tags.push('#링크');
  if (flags.imageIncluded) tags.push('#이미지');
  return tags.length > 0 ? tags : ['#일상'];
}

export default function TimelineDetailScreen() {
  const router = useRouter();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const { records, markImmediateRiskShown } = useDayRecords();
  const { entries } = useTimeline();
  const [showOverlay, setShowOverlay] = useState(false);

  const record = useMemo(() => {
    if (!id) return undefined;
    const direct = records.find((item) => item.id === id);
    if (direct) return direct;
    const dateMatch = records.find((item) => item.date === id);
    return dateMatch;
  }, [records, id]);
  const entry = useMemo(
    () => entries.find((item) => item.id === id || item.date === id),
    [entries, id]
  );

  const nativeSentences = record?.nativeSentences ?? [];
  const translate = (sentence: string, index: number) => {
    if (nativeSentences[index]) return nativeSentences[index];
    return '번역이 없어요.';
  };

  const tags = useMemo(() => {
    if (entry?.tags?.length) return entry.tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
    return record ? buildTags(record.flags) : [];
  }, [entry, record]);

  const longSummary = record?.analysisResult?.long_summary ?? null;
  const warningText = entry?.warningText ?? record?.analysisResult?.warning_text ?? null;
  const warningTags = entry?.warningTags ?? record?.analysisResult?.warning_tags ?? [];
  const riskLevel = entry?.riskLevel ?? record?.analysisResult?.risk_level ?? null;
  const showLongSummary = Boolean(longSummary) && !((riskLevel ?? 0) >= 4);
  const dayIndex = getV2DayIndex((entry?.date ?? record?.date) ?? null);
  const showSimilar = (dayIndex ?? 0) >= 6;
  const hasWarning = Boolean(warningText) || warningTags.length > 0;
  const shouldShowSection = hasWarning || showLongSummary;

  const riskLabels = useMemo(() => {
    if (!record?.immediateRisk) return [];
    return [
      record.immediateRisk.scamUrl ? '의심 링크 감지' : null,
      record.immediateRisk.reportedAccount ? '신고된 계좌' : null,
      record.immediateRisk.aiImage ? 'AI 이미지 의심' : null,
    ].filter(Boolean) as string[];
  }, [record]);

  const shouldShowOverlay =
    record &&
    !record.immediateRiskShown &&
    (record.immediateRisk?.scamUrl ||
      record.immediateRisk?.reportedAccount ||
      record.immediateRisk?.aiImage);

  useMemo(() => {
    if (shouldShowOverlay) {
      setShowOverlay(true);
    }
  }, [shouldShowOverlay]);

  const handleDismiss = async () => {
    if (record) {
      await markImmediateRiskShown(record.date);
    }
    setShowOverlay(false);
  };

  const handleReport = async () => {
    if (record) {
      await markImmediateRiskShown(record.date);
    }
    setShowOverlay(false);
    router.push('/(tabs)/profile/report');
  };

  if (!record && !entry) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>기록을 찾지 못했어요.</Text>
          <Pressable style={styles.homeButton} onPress={() => router.back()}>
            <Text style={styles.homeButtonText}>뒤로</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>뒤로</Text>
        </Pressable>

        <Text style={styles.title}>{formatDate(record.date)}</Text>

        {shouldShowSection ? (
          <View style={styles.section}>
            {hasWarning ? (
              <View style={styles.warningBox}>
                {warningText ? <Text style={styles.warningText}>{warningText}</Text> : null}
                {warningTags.length > 0 ? (
                  <View style={styles.warningTagRow}>
                    {mapWarningTags(warningTags).map((tag) => {
                      const label = tag.startsWith('#') ? tag : `#${tag}`;
                      return (
                        <View key={label} style={styles.warningTagChip}>
                          <Text style={styles.warningTagText}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
                {riskLevel !== null && riskLevel >= 4 ? (
                  <Pressable style={styles.reportButton} onPress={() => router.push('/(modals)/report')}>
                    <Text style={styles.reportButtonText}>신고하기</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {showLongSummary ? (
              <Text style={styles.longSummaryText}>{longSummary}</Text>
            ) : null}
            {showSimilar ? <SimilarChatCard compact /> : null}
          </View>
        ) : null}

        {record.immediateRisk && riskLabels.length > 0 ? (
          <View style={styles.riskBox}>
            <Text style={styles.riskTitle}>즉시 위험 신호</Text>
            {riskLabels.map((label) => (
              <Text key={label} style={styles.riskItem}>
                {label}
              </Text>
            ))}
            <Pressable style={styles.riskButton} onPress={() => router.push('/(tabs)/profile/report')}>
              <Text style={styles.riskButtonText}>신고하기</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.ctaButton} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.ctaText}>프로필로 이동</Text>
        </Pressable>
      </View>

      {showOverlay ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>주의가 필요한 신호가 보여요.</Text>
            <View style={styles.overlayList}>
              {riskLabels.map((label) => (
                <Text key={label} style={styles.overlayItem}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.overlayActions}>
              <Pressable style={styles.overlayButtonGhost} onPress={() => void handleDismiss()}>
                <Text style={styles.overlayGhostText}>나중에</Text>
              </Pressable>
              <Pressable style={styles.overlayButton} onPress={() => void handleReport()}>
                <Text style={styles.overlayButtonText}>신고하기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  container: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f2e6df',
  },
  backText: {
    fontSize: 12,
    color: '#6b5b52',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5f5147',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6f6258',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5f5147',
  },
  longSummaryText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: '#6b4a4a',
  },
  warningBox: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#f1b5b5',
  },
  warningTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  warningTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffe4e4',
  },
  warningTagText: {
    fontSize: 12,
    color: '#a44545',
    fontWeight: '600',
  },
  reportButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#d64545',
  },
  reportButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  cards: {
    gap: 10,
  },
  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff7f3',
    borderWidth: 1,
    borderColor: '#efe1d9',
  },
  cardKorean: {
    fontSize: 14,
    color: '#5a4b42',
    marginBottom: 6,
  },
  cardNative: {
    fontSize: 13,
    color: '#8a7a70',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f0e0d7',
  },
  tagText: {
    fontSize: 11,
    color: '#6b5b52',
  },
  flags: {
    gap: 6,
  },
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  flagLabel: {
    fontSize: 13,
    color: '#5a4b42',
  },
  flagValue: {
    fontSize: 12,
    color: '#8a7a70',
  },
  riskBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#f2c9c9',
    gap: 6,
  },
  riskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b4f4f',
  },
  riskItem: {
    fontSize: 12,
    color: '#8b4f4f',
  },
  riskButton: {
    marginTop: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f2c9c9',
    alignItems: 'center',
  },
  riskButtonText: {
    fontSize: 12,
    color: '#8b4f4f',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: '#f8f0eb',
    borderTopWidth: 1,
    borderTopColor: '#efe1d9',
  },
  ctaButton: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#e2b8a7',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5a4b42',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#fff7f3',
    padding: 16,
    gap: 10,
  },
  overlayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5a4b42',
  },
  overlayList: {
    gap: 6,
  },
  overlayItem: {
    fontSize: 12,
    color: '#8a7a70',
  },
  overlayActions: {
    flexDirection: 'row',
    gap: 10,
  },
  overlayButtonGhost: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f2e6df',
    alignItems: 'center',
  },
  overlayGhostText: {
    fontSize: 12,
    color: '#6b5b52',
  },
  overlayButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f2c9c9',
    alignItems: 'center',
  },
  overlayButtonText: {
    fontSize: 12,
    color: '#8b4f4f',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#6b5b52',
  },
  homeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f2e6df',
  },
  homeButtonText: {
    fontSize: 12,
    color: '#6b5b52',
  },
});
