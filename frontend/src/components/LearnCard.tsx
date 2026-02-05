import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type LearnCardProps = {
  korean: string;
  nativeText: string;
  onCopy: () => void;
};

export default function LearnCard({ korean, nativeText, onCopy }: LearnCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.cardBody}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>한국어</Text>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>KOR</Text>
          </View>
        </View>
        <Text style={styles.koreanText}>{korean}</Text>

        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>상대 모국어로</Text>
          <View style={styles.sectionPillMuted}>
            <Text style={styles.sectionPillTextMuted}>Eng</Text>
          </View>
        </View>
        <View style={styles.nativeRow}>
          <Text style={styles.nativeText}>{nativeText}</Text>
          <Pressable style={styles.copyButton} onPress={onCopy}>
            <Text style={styles.copyText}>복사</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: '#fff8f4',
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#eaded6',
    shadowColor: '#6f6258',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    backgroundColor: '#e2b8a7',
  },
  cardBody: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8e7f74',
    fontWeight: '600',
  },
  sectionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 202, 191, 0.7)',
  },
  sectionPillText: {
    fontSize: 10,
    color: '#7b5f56',
    fontWeight: '600',
  },
  sectionPillMuted: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(216, 192, 182, 0.5)',
  },
  sectionPillTextMuted: {
    fontSize: 10,
    color: '#8a7068',
    fontWeight: '600',
  },
  koreanText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#4f4037',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(210, 190, 180, 0.4)',
  },
  nativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#6c5f56',
  },
  copyButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f2e5dd',
    borderWidth: 1,
    borderColor: '#ead9d2',
  },
  copyText: {
    fontSize: 12,
    color: '#6f6258',
  },
});
