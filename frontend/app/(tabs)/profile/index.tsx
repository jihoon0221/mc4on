import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import TopBar from '@/src/components/TopBar';
import SettingsMenu from '@/src/components/SettingsMenu';
import { useProfile } from '@/src/context/profile-context';

export default function ProfileScreen() {
  const { profile } = useProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasProfile = Boolean(
    profile && (profile.name || profile.age || profile.job || profile.country || profile.nativeLanguage || profile.howWeMet || profile.photoUri)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar onPressSettings={() => setSettingsOpen(true)} />

        <Text style={styles.title}>상대 프로필</Text>
        <Text style={styles.subtitle}>상대의 정보를 차분히 기록해두세요.</Text>

        <View style={styles.card}>
          <View style={styles.cardAccent} />

          <View style={styles.headerRow}>
            <View style={styles.photoShell}>
              <View style={styles.photoCircle}>
                {profile?.photoUri ? (
                  <Image source={{ uri: profile.photoUri }} style={styles.photoImage} />
                ) : (
                  <Text style={styles.photoPlaceholder}>사진 없음</Text>
                )}
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.nameText}>{profile?.name || '이름 —'}</Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>나이</Text>
                  <Text style={styles.pillValue} numberOfLines={1}>
                    {profile?.age || '—'}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillLabel}>직업</Text>
                  <Text style={styles.pillValue} numberOfLines={1}>
                    {profile?.job || '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>국가</Text>
              <Text style={styles.metaValue}>{profile?.country || '—'}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>모국어</Text>
              <Text style={styles.metaValue}>{profile?.nativeLanguage || '—'}</Text>
            </View>
          </View>

          <View style={styles.storyCard}>
            <Text style={styles.storyLabel}>만남 경로</Text>
            <Text style={styles.storyValue}>{profile?.howWeMet || '—'}</Text>
          </View>
        </View>

        {!hasProfile ? (
          <Text style={styles.emptyText}>설정에서 상대 정보 수정을 선택해 기록을 시작해보세요.</Text>
        ) : (
          <Text style={styles.hintText}>수정은 설정에서 상대 정보 수정으로 진행돼요.</Text>
        )}
      </ScrollView>

      <SettingsMenu visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5f5147',
  },
  subtitle: {
    fontSize: 14,
    color: '#807167',
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#f7eeea',
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#eaded6',
    shadowColor: '#6f6258',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardAccent: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2b8a7',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoShell: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eddcd3',
  },
  photoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  photoPlaceholder: {
    fontSize: 12,
    color: '#9a8a7d',
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4f4037',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff7f2',
    borderWidth: 1,
    borderColor: '#efe1d9',
  },
  pillLabel: {
    fontSize: 11,
    color: '#a3948a',
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d4e45',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff7f3',
    borderWidth: 1,
    borderColor: '#efe1d9',
  },
  metaLabel: {
    fontSize: 11,
    color: '#a3948a',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e45',
  },
  storyCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff7f2',
    borderWidth: 1,
    borderColor: '#efe1d9',
  },
  storyLabel: {
    fontSize: 11,
    color: '#a3948a',
    marginBottom: 4,
  },
  storyValue: {
    fontSize: 14,
    color: '#5d4e45',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 12,
    color: '#9a8a7d',
  },
  hintText: {
    fontSize: 12,
    color: '#8b7a6f',
  },
});
