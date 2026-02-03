import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BirdCharacter, { type BirdState } from '@/src/components/BirdCharacter';

const STAGE_LABELS = ['처음', '대화 잦아짐', '공유 많아짐', '주제 변화'] as const;

type JourneyHeaderProps = {
  activeIndex: number;
  caption?: string;
  onRewindPress?: () => void;
  birdState?: BirdState;
};

export default function JourneyHeader({ activeIndex, caption, onRewindPress, birdState = 'healthy' }: JourneyHeaderProps) {
  return (
    <View style={styles.card}>
      <View style={styles.trackWrap}>
        <View style={styles.labelRow}>
          {STAGE_LABELS.map((label, index) => (
            <Text key={label} style={[styles.stageLabel, index <= activeIndex && styles.stageLabelActive]}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${(activeIndex / (STAGE_LABELS.length - 1)) * 100}%` }]} />
          <View style={styles.checkpointRow}>
            {STAGE_LABELS.map((_, index) => (
              <View
                key={`checkpoint-${index}`}
                style={[styles.checkpoint, index <= activeIndex ? styles.checkpointActive : styles.checkpointInactive]}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroSky} />
        <View style={styles.heroHill} />
        <View style={styles.platformStack}>
          <View style={[styles.platform, styles.platformTop]} />
          <View style={[styles.platform, styles.platformMid]} />
          <View style={[styles.platform, styles.platformBase]} />
        </View>
        <View style={styles.heroBirdWrap} pointerEvents="none">
          <View style={styles.heroBirdScale}>
            <BirdCharacter state={birdState} />
          </View>
        </View>
      </View>

      <View style={styles.captionRow}>
        <Text style={styles.captionText}>{caption ?? '처음부터 여기까지, 이렇게 흘러왔어요.'}</Text>
        {onRewindPress ? (
          <Pressable style={styles.rewindButton} onPress={onRewindPress} accessibilityRole="button">
            <Text style={styles.rewindText}>이 흐름을 한 번에 보기</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: '#f7eeea',
    padding: 16,
    gap: 14,
    shadowColor: 'rgba(93, 78, 69, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 3,
  },
  trackWrap: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stageLabel: {
    fontSize: 11,
    color: '#b1a39a',
  },
  stageLabelActive: {
    color: '#7f7065',
    fontWeight: '600',
  },
  track: {
    position: 'relative',
    height: 14,
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(217, 187, 170, 0.8)',
  },
  checkpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkpoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(195, 180, 170, 0.5)',
  },
  checkpointActive: {
    backgroundColor: '#cfae9b',
    transform: [{ scale: 1.05 }],
  },
  checkpointInactive: {
    backgroundColor: 'rgba(195, 180, 170, 0.4)',
  },
  hero: {
    height: 140,
    borderRadius: 18,
    backgroundColor: '#f3e7e1',
    overflow: 'hidden',
  },
  heroSky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(242, 228, 220, 0.9)',
  },
  heroHill: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    right: -20,
    height: 70,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: 'rgba(227, 210, 197, 0.6)',
  },
  platformStack: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    alignItems: 'center',
  },
  platform: {
    width: 86,
    height: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(224, 206, 193, 0.9)',
  },
  platformTop: {
    width: 70,
  },
  platformMid: {
    width: 78,
    marginTop: 4,
  },
  platformBase: {
    width: 86,
    marginTop: 4,
  },
  heroBirdWrap: {
    position: 'absolute',
    right: 18,
    bottom: 12,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBirdScale: {
    transform: [{ scale: 0.34 }],
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
});
