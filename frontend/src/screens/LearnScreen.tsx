import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import InlineToast from '@/src/components/InlineToast';
import LearnCard from '@/src/components/LearnCard';
import ProgressDots from '@/src/components/ProgressDots';
import { apiFetch } from '@/src/api/client';
import { useDayRecords } from '@/src/context/day-records-context';
import { useTimeline } from '@/src/context/timeline-context';
import SimilarChatCard from '@/src/components/SimilarChatCard';
import { getV2DayIndex } from '@/src/utils/v2-day-index';
import { getQuizVersion } from '@/src/storage/debug-settings';
import type { AnalysisResult, LearningItem } from '@/src/models/analysis-result';
import type { BirdState } from '@/src/models/bird-state';
import type { DayRecord } from '@/src/models/day-record';
import { formatDateLabel, getSeoulDateKey } from '@/src/utils/date';

type LearnScreenProps = {
  onCompleted?: (record: DayRecord) => void | Promise<void>;
  closeOnComplete?: boolean;
  insightContent?: React.ReactNode;
  analysisResult?: AnalysisResult | null;
  completeNonce?: number;
};

type ReportHistoryItem = {
  analysis_date: string;
  summary_text?: string | null;
  long_summary?: string | null;
  tags?: string[] | null;
  warning_text?: string | null;
  warning_tags?: string[] | null;
  risk_level?: number | null;
  learning_items?: Array<{
    content_kr?: string | null;
    content_fl?: string | null;
    content_type?: string | null;
    review_due_date?: string | null;
  }>;
};

type ReportHistoryResponse = {
  items: ReportHistoryItem[];
};

function deriveBirdState(record: DayRecord): BirdState {
  const flags = record.flags;
  const riskyCount = [
    flags.moneyRequest,
    flags.favorRequest,
    flags.excessivePraise,
    flags.linkIncluded,
    flags.imageIncluded,
  ].filter(Boolean).length;

  if (riskyCount >= 2) return 'anxious';
  if (riskyCount === 1) return 'cautious';
  return 'calm';
}

function buildTags(record: DayRecord): string[] {
  const tags: string[] = [];
  if (record.flags.moneyRequest) tags.push('금전');
  if (record.flags.favorRequest) tags.push('부탁');
  if (record.flags.excessivePraise) tags.push('과한 칭찬');
  if (record.flags.linkIncluded) tags.push('링크');
  if (record.flags.imageIncluded) tags.push('이미지');
  return tags;
}

function normalizeReportItem(item?: ReportHistoryItem | null): AnalysisResult | null {
  if (!item?.analysis_date) return null;
  const learningItems: LearningItem[] = (item.learning_items ?? [])
    .map((entry) => ({
      content_kr: entry.content_kr ?? '',
      content_fl: entry.content_fl ?? '',
      content_type: entry.content_type ?? 'sentence',
      review_due_date: entry.review_due_date ?? null,
    }))
    .filter((entry) => entry.content_kr || entry.content_fl);

  return {
    analysis_date: item.analysis_date,
    summary_text: item.summary_text ?? null,
    long_summary: item.long_summary ?? null,
    tags: item.tags ?? [],
    warning_text: item.warning_text ?? null,
    warning_tags: item.warning_tags ?? [],
    risk_level: item.risk_level ?? null,
    learning_items: learningItems,
  };
}

export default function LearnScreen({
  onCompleted,
  closeOnComplete = false,
  insightContent,
  analysisResult,
  completeNonce,
}: LearnScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);

  const { records, markLearnedToday } = useDayRecords();
  const { addEntry } = useTimeline();
  const todayKey = useMemo(() => getSeoulDateKey(), []);
  const todayRecord = useMemo(
    () => records.find((record) => record.date === todayKey),
    [records, todayKey]
  );
  const analysis = (analysisResult ?? todayRecord?.analysisResult ?? null) as AnalysisResult | null;
  const [analysisOverride, setAnalysisOverride] = useState<AnalysisResult | null>(null);
  // Always prefer the latest analysis from upload/day record; use debug override only if no analysis exists.
  const activeAnalysis = analysis ?? analysisOverride;
  const showDebug = typeof __DEV__ !== 'undefined' && __DEV__;
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugDate, setDebugDate] = useState('');
  const [debugError, setDebugError] = useState('');
  const [debugHistory, setDebugHistory] = useState<ReportHistoryItem[]>([]);
  const [debugMonth, setDebugMonth] = useState('');
  const [debugLoading, setDebugLoading] = useState(false);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [quizVersion, setQuizVersion] = useState(1);

  const demoSentences = [
    '오늘은 조금 천천히 이야기하고 싶어.',
    '이번만 도와주면 꼭 갚을게.',
    '사진을 하나만 더 보내줄 수 있어?',
  ];
  const demoNativeSentences = [
    'I want to talk a little more slowly today.',
    'Could you help me just this once? I will pay you back.',
    'Could you send just one more photo?',
  ];

  const availableDates = useMemo(
    () => debugHistory.map((item) => item.analysis_date).filter(Boolean),
    [debugHistory]
  );
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const availableMonths = useMemo(() => {
    const unique = Array.from(new Set(availableDates.map((date) => date.slice(0, 7))));
    return unique.sort();
  }, [availableDates]);
  const monthIndex = useMemo(
    () => availableMonths.findIndex((month) => month === debugMonth),
    [availableMonths, debugMonth]
  );

  const monthInfo = useMemo(() => {
    if (!debugMonth) return null;
    const [yearText, monthText] = debugMonth.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!year || !month) return null;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    return { year, month, firstDay, daysInMonth };
  }, [debugMonth]);

  const calendarCells = useMemo(() => {
    if (!monthInfo) return [];
    const cells: Array<{ key: string; date?: string; label?: string }> = [];
    for (let i = 0; i < monthInfo.firstDay; i += 1) {
      cells.push({ key: `empty-${i}` });
    }
    for (let day = 1; day <= monthInfo.daysInMonth; day += 1) {
      const date = `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ key: date, date, label: String(day) });
    }
    return cells;
  }, [monthInfo]);

  const learningItems: LearningItem[] = activeAnalysis?.learning_items ?? [];
  const useDemo = learningItems.length === 0 && (!todayRecord || (todayRecord.nativeSentences?.length ?? 0) === 0);
  const hasWarning = Boolean(activeAnalysis?.warning_text && activeAnalysis.warning_text.trim().length > 0);
  const v2DayIndex = getV2DayIndex(activeAnalysis?.analysis_date ?? todayRecord?.date ?? null);
  const showSimilar = quizVersion === 2 && v2DayIndex !== null && v2DayIndex >= 6;
  const sentences = useDemo
    ? demoSentences
    : learningItems.length > 0
      ? learningItems.map((item) => item.content_kr)
      : (todayRecord?.extractedSentences ?? []).slice(0, 3);
  const nativeSentences = useDemo
    ? demoNativeSentences
    : learningItems.length > 0
      ? learningItems.map((item) => item.content_fl)
      : todayRecord?.nativeSentences ?? [];
  const learned = todayRecord?.learned ?? false;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewed, setViewed] = useState<number[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [completeMessage, setCompleteMessage] = useState('');
  const [carouselWidth, setCarouselWidth] = useState(width - 32);

  const cardWidth = Math.max(240, carouselWidth);

  useEffect(() => {
    if (sentences.length === 0) return;
    setCurrentIndex(0);
    setViewed([0]);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [sentences.length]);

  useEffect(() => {
    if (!analysis?.analysis_date) return;
    setDebugDate((prev) => (prev ? prev : analysis.analysis_date));
  }, [analysis?.analysis_date]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const version = await getQuizVersion(1);
      if (!cancelled) setQuizVersion(version);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showDebug || !debugOpen) return;
    let cancelled = false;
    setDebugLoading(true);
    setDebugError('');
    (async () => {
      try {
        const history = await apiFetch<ReportHistoryResponse>('/reports/history?limit=365');
        const items = history.items.filter((item) => item.analysis_date);
        if (cancelled) return;
        setDebugHistory(items);
        const fallbackDate =
          analysisOverride?.analysis_date ??
          analysis?.analysis_date ??
          items[items.length - 1]?.analysis_date ??
          '';
        const monthCandidates = Array.from(new Set(items.map((item) => item.analysis_date.slice(0, 7)))).sort();
        const nextMonth = fallbackDate ? fallbackDate.slice(0, 7) : monthCandidates[0] ?? '';
        setDebugMonth(nextMonth);
        if (fallbackDate) setDebugDate(fallbackDate);
      } catch {
        if (!cancelled) setDebugError('히스토리를 불러오지 못했어요.');
      } finally {
        if (!cancelled) setDebugLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debugOpen, showDebug, analysisOverride?.analysis_date, analysis?.analysis_date]);

  useEffect(() => {
    let cancelled = false;
    if (!activeAnalysis?.analysis_date) {
      setDayIndex(null);
      return () => {
        cancelled = true;
      };
    }
    const currentDate = activeAnalysis.analysis_date;
    const computeDayIndex = (firstDate: string, todayDate: string) => {
      const start = new Date(`${firstDate}T00:00:00+09:00`);
      const end = new Date(`${todayDate}T00:00:00+09:00`);
      const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays + 1);
    };
    (async () => {
      try {
        const history = await apiFetch<ReportHistoryResponse>('/reports/history?limit=120');
        const firstDate = history.items.length
          ? history.items[history.items.length - 1]?.analysis_date
          : currentDate;
        const nextDay = computeDayIndex(firstDate ?? currentDate, currentDate);
        if (!cancelled) setDayIndex(nextDay);
      } catch {
        if (!cancelled) setDayIndex(1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeAnalysis?.analysis_date]);

  const progressText = sentences.length > 0 ? `${currentIndex + 1}/${sentences.length}` : '';
  const canComplete = learned || (sentences.length > 0 && viewed.length >= sentences.length);

  const translate = (_sentence: string, index: number) => {
    if (nativeSentences[index]) return nativeSentences[index];
    return '(번역 준비중)';
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1100);
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('복사했어요');
  };

  const handleComplete = async () => {
    if (!canComplete || learned) {
      return;
    }
    if (!todayRecord) {
      setCompleteMessage('오늘 학습을 마쳤어요.');
      if (closeOnComplete) {
        if (typeof router.canGoBack === 'function' ? router.canGoBack() : false) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }
      return;
    }
    const birdState = deriveBirdState(todayRecord);
    const updated = await markLearnedToday(birdState);
    if (!updated) return;
    setCompleteMessage('오늘 학습을 마쳤어요.');

    const summary =
      activeAnalysis?.long_summary ??
      activeAnalysis?.summary_text ??
      todayRecord.extractedSentences?.[0] ??
      '오늘의 대화를 기록했어요.';
    await addEntry({
      id: todayKey,
      date: todayKey,
      summary,
      tags: activeAnalysis?.tags ?? buildTags(todayRecord),
      birdState,
      createdAt: new Date().toISOString(),
      sourceFileName: todayRecord.sourceFileName,
    });

    if (onCompleted) {
      await onCompleted(updated);
    }
    if (closeOnComplete) {
      if (typeof router.canGoBack === 'function' ? router.canGoBack() : false) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const handleDebugPick = (date: string) => {
    setDebugDate(date);
    const found = debugHistory.find((item) => item.analysis_date === date);
    const normalizedItem = normalizeReportItem(found);
    if (!normalizedItem) {
      setAnalysisOverride(null);
      setDebugError('해당 날짜 분석 결과가 없어요.');
      return;
    }
    setDebugError('');
    setAnalysisOverride(normalizedItem);
  };

  const handleDebugReset = () => {
    setAnalysisOverride(null);
    setDebugError('');
    const nextDate = analysis?.analysis_date ?? '';
    setDebugDate(nextDate);
    if (nextDate) setDebugMonth(nextDate.slice(0, 7));
  };

  useEffect(() => {
    if (!completeNonce) return;
    void handleComplete();
  }, [completeNonce, handleComplete]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{dayIndex ? `Day ${dayIndex}` : 'Day —'}</Text>
            {showDebug ? (
              <Pressable style={styles.debugButton} onPress={() => setDebugOpen((prev) => !prev)}>
                <Text style={styles.debugButtonText}>{debugOpen ? '디버그 닫기' : '디버그'}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.subtitle}>
            {activeAnalysis?.analysis_date
              ? formatDateLabel(activeAnalysis.analysis_date)
              : useDemo
                ? '오늘'
                : formatDateLabel(todayKey)}
          </Text>
          <Text style={styles.helper}>상대의 말, 상대의 언어로 다시 말해봐요.</Text>
          {showDebug && debugOpen ? (
            <View style={styles.debugPanel}>
              <View style={styles.debugPanelHeader}>
                <Text style={styles.debugLabel}>분석 날짜 선택</Text>
                <Pressable style={styles.debugResetButton} onPress={handleDebugReset}>
                  <Text style={styles.debugResetText}>원복</Text>
                </Pressable>
              </View>
              {debugLoading ? (
                <Text style={styles.debugLoadingText}>불러오는 중...</Text>
              ) : availableMonths.length === 0 ? (
                <Text style={styles.debugLoadingText}>데이터가 없어요.</Text>
              ) : (
                <View style={styles.debugCalendarCard}>
                  <View style={styles.debugMonthRow}>
                    <Pressable
                      style={[styles.debugMonthButton, monthIndex <= 0 && styles.debugMonthButtonDisabled]}
                      onPress={() => {
                        if (monthIndex > 0) setDebugMonth(availableMonths[monthIndex - 1]);
                      }}>
                      <Text style={styles.debugMonthButtonText}>이전</Text>
                    </Pressable>
                    <Text style={styles.debugMonthText}>{debugMonth.replace('-', '.')}</Text>
                    <Pressable
                      style={[
                        styles.debugMonthButton,
                        monthIndex < 0 || monthIndex >= availableMonths.length - 1
                          ? styles.debugMonthButtonDisabled
                          : null,
                      ]}
                      onPress={() => {
                        if (monthIndex >= 0 && monthIndex < availableMonths.length - 1) {
                          setDebugMonth(availableMonths[monthIndex + 1]);
                        }
                      }}>
                      <Text style={styles.debugMonthButtonText}>다음</Text>
                    </Pressable>
                  </View>
                  <View style={styles.debugWeekRow}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
                      <Text key={label} style={styles.debugWeekText}>
                        {label}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.debugCalendarGrid}>
                    {calendarCells.map((cell) =>
                      cell.date ? (
                        <Pressable
                          key={cell.key}
                          style={[
                            styles.debugDayCell,
                            availableDateSet.has(cell.date) ? styles.debugDayActive : styles.debugDayDisabled,
                            debugDate === cell.date ? styles.debugDaySelected : null,
                          ]}
                          onPress={() => {
                            if (availableDateSet.has(cell.date)) {
                              handleDebugPick(cell.date);
                            }
                          }}>
                          <Text
                            style={[
                              styles.debugDayText,
                              availableDateSet.has(cell.date) ? styles.debugDayTextActive : styles.debugDayTextDisabled,
                              debugDate === cell.date ? styles.debugDayTextSelected : null,
                            ]}>
                            {cell.label}
                          </Text>
                        </Pressable>
                      ) : (
                        <View key={cell.key} style={styles.debugDayEmpty} />
                      )
                    )}
                  </View>
                </View>
              )}
              {debugError ? <Text style={styles.debugError}>{debugError}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{progressText}</Text>
          <ProgressDots total={sentences.length} currentIndex={currentIndex} />
        </View>

        <View
          style={styles.carouselWrap}
          onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            scrollEnabled={sentences.length > 1}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
              setCurrentIndex(nextIndex);
              setViewed((prev) => (prev.includes(nextIndex) ? prev : [...prev, nextIndex]));
            }}
            contentContainerStyle={styles.carousel}>
            {sentences.map((sentence, index) => (
              <View key={`${sentence}-${index}`} style={[styles.cardWrap, { width: cardWidth }]}>
                <LearnCard
                  korean={sentence}
                  nativeText={translate(sentence, index)}
                  onCopy={() => void handleCopy(translate(sentence, index))}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <InlineToast message={toastMessage} visible={toastVisible} />

        {activeAnalysis ? (
          <>
            <View style={styles.analysisCard}>
              <View style={styles.analysisHeader}>
                <View style={styles.analysisBadge} />
                <Text style={styles.analysisTitle}>오늘의 분석</Text>
              </View>
              {activeAnalysis.long_summary || activeAnalysis.summary_text ? (
                <Text style={styles.analysisBody}>
                  {activeAnalysis.long_summary ?? activeAnalysis.summary_text}
                </Text>
              ) : (
                <Text style={styles.analysisBody}>오늘은 특별한 요약이 없어요.</Text>
              )}
              {activeAnalysis.tags?.length ? (
                <View style={styles.tagRow}>
                  {activeAnalysis.tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {showSimilar ? <SimilarChatCard compact /> : null}
            </View>

            {hasWarning ? (
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <Text style={styles.warningTitle}>주의 메시지</Text>
                  {activeAnalysis.warning_tags?.length ? (
                    <View style={styles.warningTagRow}>
                      {activeAnalysis.warning_tags.slice(0, 2).map((tag) => (
                        <View key={tag} style={styles.warningTagChip}>
                          <Text style={styles.warningTagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
                <Text style={styles.warningBody}>{activeAnalysis.warning_text}</Text>
              </View>
            ) : null}
          </>
        ) : insightContent ? (
          <View style={styles.analysisCard}>{insightContent}</View>
        ) : null}

        {completeMessage ? <Text style={styles.completeMessage}>{completeMessage}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
  },
  header: {
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5f5147',
  },
  debugButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#e1d6cf',
  },
  debugButtonText: {
    fontSize: 11,
    color: '#7b6c62',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#8b7b6e',
  },
  helper: {
    fontSize: 13,
    color: '#807167',
  },
  debugText: {
    fontSize: 11,
    color: '#a08f84',
  },
  debugPanel: {
    marginTop: 4,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 8,
  },
  debugPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  debugLabel: {
    fontSize: 11,
    color: '#444444',
  },
  debugLoadingText: {
    fontSize: 12,
    color: '#666666',
  },
  debugCalendarCard: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 8,
  },
  debugMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugMonthButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  debugMonthButtonDisabled: {
    opacity: 0.4,
  },
  debugMonthButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111111',
  },
  debugMonthText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  debugWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  debugWeekText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 9,
    color: '#666666',
  },
  debugCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    paddingTop: 6,
  },
  debugDayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  debugDayActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  debugDayDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.35,
  },
  debugDaySelected: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  debugDayText: {
    fontSize: 11,
  },
  debugDayTextActive: {
    color: '#111111',
  },
  debugDayTextDisabled: {
    color: '#c4c4c4',
  },
  debugDayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  debugDayEmpty: {
    width: '14.28%',
  },
  debugResetButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(123, 108, 98, 0.12)',
  },
  debugResetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7b6c62',
  },
  debugError: {
    fontSize: 11,
    color: '#b5483f',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  progressText: {
    fontSize: 13,
    color: '#7b6c62',
  },
  carousel: {
    paddingVertical: 8,
    paddingBottom: 4,
  },
  carouselWrap: {
    width: '100%',
  },
  cardWrap: {
    paddingHorizontal: 0,
  },
  completeMessage: {
    fontSize: 13,
    color: '#7b6c62',
  },
  analysisCard: {
    borderRadius: 20,
    backgroundColor: '#fff3ec',
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0d9cf',
    gap: 8,
    shadowColor: '#7b6c62',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analysisBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e8b7a4',
  },
  analysisTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6e5f54',
  },
  analysisBody: {
    fontSize: 12,
    color: '#7b6c62',
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 202, 191, 0.6)',
  },
  tagText: {
    fontSize: 11,
    color: '#7b6c62',
  },
  warningCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 236, 234, 0.9)',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(215, 110, 100, 0.5)',
    gap: 8,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningTagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  warningTagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(215, 110, 100, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(215, 110, 100, 0.35)',
  },
  warningTagText: {
    fontSize: 10,
    color: '#8e3d35',
    fontWeight: '600',
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e3d35',
  },
  warningBody: {
    fontSize: 13,
    color: '#7b4a44',
    lineHeight: 19,
  },
  warningChat: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#aebecd',
    borderWidth: 1,
    borderColor: '#9aaabb',
    gap: 8,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  chatDivider: {
    height: 1,
    backgroundColor: '#111111',
    marginVertical: 2,
  },
  chatLabelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#dfe6ee',
  },
  chatLabelPillAlt: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#dfe6ee',
  },
  chatLabelText: {
    fontSize: 10,
    color: '#5f6b78',
    fontWeight: '600',
  },
  chatLabelTextAlt: {
    fontSize: 10,
    color: '#5f6b78',
    fontWeight: '600',
  },
  chatBubbleGroup: {
    alignItems: 'flex-start',
  },
  chatBubbleLeft: {
    position: 'relative',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e6ec',
  },
  chatTailLeft: {
    position: 'absolute',
    left: 12,
    bottom: -4,
    width: 8,
    height: 8,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e1e6ec',
  },
  chatBubbleText: {
    fontSize: 12,
    color: '#4b5561',
    lineHeight: 18,
  },
  chatBubbleTextAlt: {
    fontSize: 12,
    color: '#4b5561',
    lineHeight: 18,
  },
  warningChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(214, 128, 118, 0.2)',
  },
  warningText: {
    fontSize: 11,
    color: '#8a4a44',
  },
});
