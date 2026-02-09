import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import BirdCharacter, { type BirdState } from '@/src/components/BirdCharacter';

type RelationshipFlowHeaderProps = {
  labels: string[];
  activeIndex: number;
  caption?: string;
  birdState?: BirdState;
};

export default function RelationshipFlowHeader({
  labels,
  activeIndex,
  caption,
  birdState = 'healthy',
}: RelationshipFlowHeaderProps) {
  const maxIndex = Math.max(0, labels.length - 1);
  const resolvedIndex = Math.max(0, Math.min(activeIndex, maxIndex));
  const progressRatio = maxIndex <= 0 ? 0 : resolvedIndex / maxIndex;

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <ImageBackground
          source={require('@/assets/images/timelinebg.png')}
          style={styles.heroImage}
          imageStyle={styles.heroImageInner}
          resizeMode="cover">
          <View style={[styles.trackWrap, styles.trackOverlay]}>
            <View style={styles.labelRow}>
              {labels.map((label, index) => (
                <Text
                  key={label}
                  style={[
                    styles.stageLabel,
                    index > resolvedIndex && styles.stageLabelHidden,
                    index < resolvedIndex && styles.stageLabelCompleted,
                    index === resolvedIndex && styles.stageLabelActive,
                  ]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${progressRatio * 100}%` }]} />
              <View style={styles.checkpointRow}>
                {labels.map((_, index) => (
                  <View
                    key={`checkpoint-${index}`}
                    style={[
                      styles.checkpoint,
                      index > resolvedIndex && styles.checkpointHidden,
                      index < resolvedIndex && styles.checkpointCompleted,
                      index === resolvedIndex ? styles.checkpointActive : styles.checkpointInactive,
                    ]}>
                    <View style={styles.checkpointCore} />
                  </View>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.heroBirdWrap} pointerEvents="none">
            <View style={styles.heroBirdScale}>
              <BirdCharacter state={birdState} />
            </View>
          </View>
        </ImageBackground>
      </View>

      <View style={styles.captionRow}>
        <Text style={styles.captionText}>{caption ?? '현재 흐름을 정리했어요.'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: '#f7eeea',
    padding: 16,
    gap: 10,
    shadowColor: 'rgba(93, 78, 69, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 3,
  },
  trackWrap: {
    gap: 8,
  },
  trackOverlay: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stageLabel: {
    fontSize: 11,
    color: '#b1a39a',
  },
  stageLabelHidden: {
    opacity: 0,
  },
  stageLabelCompleted: {
    color: '#9a8b80',
    fontWeight: '500',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointHidden: {
    opacity: 0,
  },
  checkpointCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  checkpointActive: {
    backgroundColor: '#cfae9b',
    transform: [{ scale: 1.05 }],
  },
  checkpointCompleted: {
    backgroundColor: 'rgba(201, 174, 155, 0.75)',
  },
  checkpointInactive: {
    backgroundColor: 'rgba(195, 180, 170, 0.4)',
  },
  hero: {
    height: 170,
    borderRadius: 18,
    backgroundColor: '#f3e7e1',
    overflow: 'hidden',
  },
  heroImage: {
    flex: 1,
  },
  heroImageInner: {
    borderRadius: 18,
    transform: [{ scale: 1.08 }, { translateY: 4 }],
  },
  heroBirdWrap: {
    position: 'absolute',
    right: 20,
    bottom: 26,
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
});
