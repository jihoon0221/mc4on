import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDayRecords } from '@/src/context/day-records-context';

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
  const [showOverlay, setShowOverlay] = useState(false);

  const record = useMemo(
    () => records.find((item) => item.id === id),
    [records, id]
  );

  const nativeSentences = record?.nativeSentences ?? [];
  const translate = (sentence: string, index: number) => {
    if (nativeSentences[index]) return nativeSentences[index];
    return '번역이 없어요.';
  };

  const tags = useMemo(() => (record ? buildTags(record.flags) : []), [record]);

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

  if (!record) {
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 학습</Text>
          <View style={styles.cards}>
            {record.extractedSentences.map((sentence, index) => (
              <View key={`${sentence}-${index}`} style={styles.card}>
                <Text style={styles.cardKorean}>{sentence}</Text>
                <Text style={styles.cardNative}>{translate(sentence, index)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>태그</Text>
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주의 흐름</Text>
          <View style={styles.flags}>
            {FLAG_ROWS.map((flag) => (
              <View key={flag.key} style={styles.flagRow}>
                <Text style={styles.flagLabel}>{flag.label}</Text>
                <Text style={styles.flagValue}>{record.flags[flag.key] ? '있음' : '없음'}</Text>
              </View>
            ))}
          </View>
        </View>

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
