import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SimilarChatCardProps = {
  compact?: boolean;
};

export default function SimilarChatCard({ compact }: SimilarChatCardProps) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>유사 카톡 기록</Text>
        <Text style={styles.badge}>Day 6+</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.labelPill}>
          <Text style={styles.labelText}>내 대화</Text>
        </View>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>
            그 물건을 한국으로 보내려는데 잠깐 보관해줄 수 있을까?{'\n'}
            통관 절차 때문에 비용이 조금 필요하대.{'\n'}
            처리만 되면 바로 돌려줄게.
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <View style={styles.labelPillAlt}>
          <Text style={styles.labelTextAlt}>유사 스캠 예시</Text>
        </View>
        <View style={styles.bubbleAlt}>
          <Text style={styles.bubbleTextAlt}>급하게 통관비를 내야 해서 오늘 안으로 송금 가능할까?</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#fff7f3',
    borderWidth: 1,
    borderColor: '#efe1d9',
    padding: 14,
    gap: 10,
  },
  cardCompact: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5a4b42',
  },
  badge: {
    fontSize: 11,
    color: '#8a7368',
  },
  section: {
    gap: 8,
  },
  labelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f0e2db',
  },
  labelText: {
    fontSize: 12,
    color: '#6b5b52',
    fontWeight: '600',
  },
  labelPillAlt: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffe3e3',
  },
  labelTextAlt: {
    fontSize: 12,
    color: '#a44545',
    fontWeight: '600',
  },
  bubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f7eeea',
    borderRadius: 14,
    padding: 12,
  },
  bubbleAlt: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff0f0',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1b5b5',
  },
  bubbleText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#5a4b42',
  },
  bubbleTextAlt: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8d3a3a',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#eaded6',
  },
});
