import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDayRecords } from '@/src/context/day-records-context';

import TopBar from '@/src/components/TopBar';
import SettingsMenu from '@/src/components/SettingsMenu';
import { useProfile } from '@/src/context/profile-context';

export default function ProfileScreen() {
  const { profile } = useProfile();
  const { records } = useDayRecords();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const availableDates = useMemo(() => records.map((item) => item.date), [records]);
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const defaultMonth = availableDates.length > 0 ? availableDates[availableDates.length - 1].slice(0, 7) : '';
  const [activeMonth, setActiveMonth] = useState(defaultMonth);

  // Keep calendar month in sync when records arrive/refresh.
  React.useEffect(() => {
    if (defaultMonth) {
      setActiveMonth(defaultMonth);
    }
  }, [defaultMonth]);

  const monthInfo = useMemo(() => {
    if (!activeMonth) return null;
    const [yearText, monthText] = activeMonth.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!year || !month) return null;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    return { year, month, firstDay, daysInMonth };
  }, [activeMonth]);

  const calendarCells = useMemo(() => {
    if (!monthInfo) return [];
    const cells = [];
    for (let i = 0; i < monthInfo.firstDay; i += 1) {
      cells.push({ key: `empty-${i}` });
    }
    for (let day = 1; day <= monthInfo.daysInMonth; day += 1) {
      const date = `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ key: date, date, label: String(day) });
    }
    return cells;
  }, [monthInfo]);

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
              <Pressable style={styles.editButton} onPress={() => router.push('/(tabs)/profile/edit')}>
                <Text style={styles.editButtonText}>상대정보 수정</Text>
              </Pressable>
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

        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>대화 기록 캘린더</Text>
          {!monthInfo ? (
            <Text style={styles.calendarEmpty}>표시할 기록이 없어요.</Text>
          ) : (
            <>
              <View style={styles.calendarHeader}>
                <Pressable
                  style={[styles.monthButton, styles.monthButtonDisabled]}
                  disabled>
                  <Text style={styles.monthButtonText}>이전</Text>
                </Pressable>
                <Text style={styles.monthText}>{activeMonth.replace('-', '.')}</Text>
                <Pressable
                  style={[styles.monthButton, styles.monthButtonDisabled]}
                  disabled>
                  <Text style={styles.monthButtonText}>다음</Text>
                </Pressable>
              </View>
              <View style={styles.weekRow}>
                {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
                  <Text key={label} style={styles.weekText}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={[styles.calendarGrid, { width: 7 * 36 + 6 * 8 }]}>
                {calendarCells.map((cell) =>
                  cell.date ? (
                    <Pressable
                      key={cell.key}
                      style={[
                        styles.dayCell,
                        availableDateSet.has(cell.date) ? styles.dayActive : styles.dayDisabled,
                        selectedDate === cell.date ? styles.daySelected : null,
                      ]}
                      onPress={() => {
                        if (availableDateSet.has(cell.date)) {
                          setSelectedDate(cell.date);
                          router.push({ pathname: '/(modals)/learn', params: { date: cell.date, hideSummary: '1' } });
                        }
                      }}>
                      <Text
                        style={[
                          styles.dayText,
                          availableDateSet.has(cell.date) ? styles.dayTextActive : styles.dayTextDisabled,
                          selectedDate === cell.date ? styles.dayTextSelected : null,
                        ]}>
                        {cell.label}
                      </Text>
                    </Pressable>
                  ) : (
                    <View key={cell.key} style={styles.dayEmpty} />
                  )
                )}
              </View>
            </>
          )}
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
    lineHeight: 18,
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  editButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#eaded6',
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b5b52',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4f4037',
    lineHeight: 26,
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
    lineHeight: 16,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d4e45',
    lineHeight: 20,
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
    lineHeight: 16,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e45',
    lineHeight: 20,
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
    lineHeight: 16,
  },
  storyValue: {
    fontSize: 14,
    color: '#5d4e45',
    lineHeight: 24,
  },
  emptyText: {
    fontSize: 12,
    color: '#9a8a7d',
  },
  hintText: {
    fontSize: 12,
    color: '#8b7a6f',
  },
  calendarCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff7f3',
    borderWidth: 1,
    borderColor: '#efe1d9',
    gap: 12,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5f5147',
  },
  calendarEmpty: {
    fontSize: 13,
    color: '#9a8a7d',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f2e6df',
  },
  monthButtonDisabled: {
    opacity: 0.5,
  },
  monthButtonText: {
    fontSize: 12,
    color: '#7b6c62',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5f5147',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    color: '#9a8a7d',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'center',
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2e6df',
  },
  dayActive: {
    backgroundColor: '#e2b8a7',
  },
  daySelected: {
    borderWidth: 2,
    borderColor: '#5f5147',
  },
  dayDisabled: {
    backgroundColor: '#f2e6df',
    opacity: 0.4,
  },
  dayText: {
    fontSize: 12,
  },
  dayTextActive: {
    color: '#4f4037',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#3f332c',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#9a8a7d',
  },
  dayEmpty: {
    width: 36,
    height: 36,
  },

});
