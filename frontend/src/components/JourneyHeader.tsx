import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BirdCharacter, { type BirdState } from '@/src/components/BirdCharacter';

const STAGE_LABELS = [
  '접촉 및 계기 형성',
  '친밀감 구축',
  '신뢰 형성',
  '신뢰 강화 및 배경 설정',
  '금전 요구 및 결제 유도',
  '압박·잠적',
] as const;

const FLOW_ROW_STYLES = [
  'flowRow_1',
  'flowRow_2',
  'flowRow_3',
  'flowRow_4',
  'flowRow_5',
  'flowRow_6',
] as const;

type JourneyHeaderProps = {
  activeIndex: number;
  caption?: string;
  onRewindPress?: () => void;
  onCtaPress?: () => void;
  ctaLabel?: string;
  birdState?: BirdState;
};

export default function JourneyHeader({
  activeIndex,
  caption,
  onRewindPress,
  onCtaPress,
  ctaLabel,
  birdState = 'healthy',
}: JourneyHeaderProps) {
  const maxIndex = STAGE_LABELS.length - 1;
  const resolvedIndex = Math.max(0, Math.min(activeIndex, maxIndex));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.sirenBadge}>
          <Ionicons name="alert-circle" size={18} color="#c83b3b" />
        </View>
        <Text style={styles.headerTitle}>주의 흐름</Text>
        <View style={styles.headerSpacer} />
        <View style={styles.birdWrap} pointerEvents="none">
          <View style={styles.birdScale}>
            <BirdCharacter state={birdState} />
          </View>
        </View>
      </View>

      <View style={styles.verticalFlow}>
        {STAGE_LABELS.map((label, index) => {
          const isPast = index < resolvedIndex;
          const isCurrent = index === resolvedIndex;
          const styleIndex = Math.min(index, FLOW_ROW_STYLES.length - 1);
          const flowRowStyle = styles[FLOW_ROW_STYLES[styleIndex]];
          return (
            <View key={label} style={[styles.flowRow, flowRowStyle]}>
              <View style={styles.flowLeft}>
                <View style={[styles.flowDot, isPast && styles.flowDotPast, isCurrent && styles.flowDotCurrent]}>
                  <View style={styles.flowDotCore} />
                </View>
                {index < STAGE_LABELS.length - 1 ? <View style={styles.flowLine} /> : null}
              </View>
              <View style={styles.flowContent}>
                <View style={styles.flowTitleRow}>
                  <Text
                    style={[
                      styles.flowIndex,
                      isPast && styles.flowIndexPast,
                      isCurrent && styles.flowIndexCurrent,
                    ]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  {isCurrent ? (
                    <View style={styles.currentBadge}>
                      <Ionicons name="radio-button-on" size={14} color="#b32626" />
                      <Text style={styles.currentBadgeText}>현재 단계</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.flowLabel,
                    isPast && styles.flowLabelPast,
                    isCurrent && styles.flowLabelCurrent,
                  ]}>
                  {label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.captionRow}>
        <Text style={styles.captionText}>{caption ?? '처음부터 여기까지, 이렇게 흘러왔어요.'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: '#fbf5f2',
    padding: 16,
    gap: 14,
    shadowColor: 'rgba(93, 78, 69, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sirenBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffe5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5a4b42',
  },
  headerSpacer: {
    flex: 1,
  },
  birdWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birdScale: {
    transform: [{ scale: 0.26 }],
  },
  verticalFlow: {
    gap: 10,
  },
  flowRow: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  flowRow_1: { backgroundColor: '#fff6f3' },
  flowRow_2: { backgroundColor: '#ffe9e3' },
  flowRow_3: { backgroundColor: '#ffd8cf' },
  flowRow_4: { backgroundColor: '#ffc3b6' },
  flowRow_5: { backgroundColor: '#ffab9b' },
  flowRow_6: { backgroundColor: '#ff8f7c' },
  flowLeft: {
    width: 18,
    alignItems: 'center',
  },
  flowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f2b2a9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowDotCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  flowDotPast: {
    backgroundColor: '#e07a6d',
  },
  flowDotCurrent: {
    backgroundColor: '#c83b3b',
    transform: [{ scale: 1.1 }],
  },
  flowLine: {
    flex: 1,
    width: 2,
    marginTop: 6,
    backgroundColor: '#e9b4ac',
  },
  flowContent: {
    flex: 1,
    gap: 2,
  },
  flowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffe2e2',
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8d1f1f',
  },
  flowIndex: {
    fontSize: 11,
    color: '#8b6a63',
    fontWeight: '700',
  },
  flowIndexPast: {
    color: '#7a5550',
  },
  flowIndexCurrent: {
    color: '#8d1f1f',
  },
  flowLabel: {
    fontSize: 13,
    color: '#5f4b44',
    fontWeight: '600',
  },
  flowLabelPast: {
    color: '#5c463f',
  },
  flowLabelCurrent: {
    color: '#8d1f1f',
  },
  captionRow: {
    gap: 6,
  },
  captionText: {
    fontSize: 12,
    color: '#7b6c62',
  },
  rewindButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  rewindText: {
    fontSize: 12,
    color: '#8b7a6f',
  },
  ctaRow: {
    alignItems: 'flex-end',
  },
  ctaButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(215, 191, 176, 0.6)',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6d5f55',
  },
});
