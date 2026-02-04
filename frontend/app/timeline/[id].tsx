import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTimeline } from '@/src/context/timeline-context';

function formatDate(date: string) {
  return date.replace(/-/g, '.');
}

export default function TimelineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { entries } = useTimeline();

  const record = useMemo(
    () => entries.find((item) => item.id === id || item.date === id),
    [entries, id]
  );

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>해당 날짜의 기록이 없어요</Text>
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
          <Text style={styles.sectionTitle}>위험 메시지</Text>
          <Text style={styles.longBody}>
            {record.warningText ? record.warningText : '특별한 위험 메시지가 없었어요.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>위험 태그</Text>
          <View style={styles.tagRow}>
            {(record.warningTags?.length ? record.warningTags : ['일상대화']).map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag.replace(/^#/, '')}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.ctaButton} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.ctaText}>도움이 필요할까요?</Text>
        </Pressable>
      </View>
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  backText: {
    fontSize: 12,
    color: '#7b6c62',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5f5147',
    marginBottom: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6e5f54',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  tagText: {
    fontSize: 12,
    color: '#6e5f54',
  },
  longBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6e5f54',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(248, 240, 235, 0.95)',
  },
  ctaButton: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#e5b9a9',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5f3e31',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#6e5f54',
  },
  homeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#e5b9a9',
  },
  homeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f3e31',
  },
});
