import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { QUIZ_V1, type QuizBundle, type QuizQuestion } from '@/src/data/quiz_v1';
import { QUIZ_V2 } from '@/src/data/quiz_v2';
import { getDebugV2Day, getQuizVersion } from '@/src/storage/debug-settings';
import { getSeoulDateKey } from '@/src/utils/date';
import { mapWarningTags } from '@/src/utils/warning-tags';

const QUIZ_TYPES = {
  word: '단어 퀴즈',
  sentence: '문장 퀴즈',
  sentence_order: '문장 배열 퀴즈',
} as const;

function pickBundle(version: number, date?: string): QuizBundle | null {
  const target = date ?? QUIZ_V1[QUIZ_V1.length - 1]?.date;
  if (version === 1) {
    return QUIZ_V1.find((item) => item.date === target) ?? QUIZ_V1[QUIZ_V1.length - 1] ?? null;
  }
  const v2Target = date ?? QUIZ_V2[QUIZ_V2.length - 1]?.date;
  return QUIZ_V2.find((item) => item.date === v2Target) ?? QUIZ_V2[QUIZ_V2.length - 1] ?? null;
}

export default function QuizScreen() {
  const router = useRouter();
  const params = useGlobalSearchParams<{ date?: string }>();
  const todayKey = getSeoulDateKey();
  const targetDate = params.date ?? todayKey;

  const [quizVersion, setQuizVersion] = useState(1);
  const [debugV2Date, setDebugV2Date] = useState<string | null>(null);
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
    let cancelled = false;
    if (quizVersion !== 2) {
      setDebugV2Date(null);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const date = await getDebugV2Day();
      if (!cancelled) setDebugV2Date(date);
    })();
    return () => {
      cancelled = true;
    };
  }, [quizVersion]);
  const resolvedDate = quizVersion === 2 ? debugV2Date ?? targetDate : targetDate;
  const bundle = useMemo(() => pickBundle(quizVersion, resolvedDate), [quizVersion, resolvedDate]);
  const quizzes = bundle?.quizzes ?? [];
  const summary = bundle?.summary;

  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showError, setShowError] = useState(false);
  const [reported, setReported] = useState(false);
  const [orderSelected, setOrderSelected] = useState<string[]>([]);
  const [orderError, setOrderError] = useState(false);
  const [showOrderAnswer, setShowOrderAnswer] = useState(false);

  useEffect(() => {
    setStepIndex(0);
    setSelected(null);
    setShowError(false);
    setOrderSelected([]);
    setOrderError(false);
    setShowOrderAnswer(false);
  }, [targetDate]);

  useEffect(() => {
    if (stepIndex === 3) {
      setReported(true);
    }
  }, [stepIndex]);

  const activeQuiz = quizzes[stepIndex] as QuizQuestion | undefined;
  const totalSteps = 4;

  const handleSelect = (index: number) => {
    if (!activeQuiz) return;
    if (index === activeQuiz.answerIndex) {
      setShowError(false);
      setSelected(index);
    } else {
      setShowError(true);
      setSelected(index);
    }
  };

  const handleNext = () => {
    if (stepIndex < 3) {
      setStepIndex((prev) => prev + 1);
      setSelected(null);
      setShowError(false);
      setOrderSelected([]);
      setOrderError(false);
      setShowOrderAnswer(false);
    }
  };

  const isOrderQuiz = activeQuiz?.type === 'sentence_order';
  const orderAnswer = activeQuiz?.answer ?? [];
  const orderCorrect =
    isOrderQuiz &&
    orderSelected.length === orderAnswer.length &&
    orderSelected.every((word, index) => word === orderAnswer[index]);

  useEffect(() => {
    if (!isOrderQuiz) return;
    if (orderSelected.length === 0) {
      setOrderError(false);
      return;
    }
    if (orderSelected.length === orderAnswer.length && !orderCorrect) {
      setOrderError(true);
    }
  }, [isOrderQuiz, orderSelected, orderAnswer, orderCorrect]);

  const canProceed =
    stepIndex < 3 && activeQuiz
      ? isOrderQuiz
        ? orderCorrect
        : selected !== null && selected === activeQuiz.answerIndex
      : false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Day Quiz</Text>
          <Text style={styles.stepText}>{stepIndex + 1}/{totalSteps}</Text>
        </View>
        <Text style={styles.dateText}>{targetDate.replace(/-/g, '.')}</Text>

        {stepIndex < 3 && activeQuiz ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{QUIZ_TYPES[activeQuiz.type]}</Text>
            </View>
            {activeQuiz.type !== 'sentence_order' ? (
              <>
                <Text style={styles.prompt}>{activeQuiz.prompt}</Text>
                <View style={styles.options}>
                  {activeQuiz.options?.map((option, index) => {
                    const isSelected = selected === index;
                    const isCorrect = index === activeQuiz.answerIndex;
                    return (
                      <Pressable
                        key={`${activeQuiz.id}-${index}`}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionSelected,
                          isSelected && isCorrect && styles.optionCorrect,
                          isSelected && !isCorrect && styles.optionWrong,
                        ]}
                        onPress={() => handleSelect(index)}>
                        <Text style={styles.optionText}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {showError ? <Text style={styles.errorText}>다시 시도해보세요.</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.prompt}>{activeQuiz.korean}</Text>
                <View style={styles.orderAnswerRow}>
                  {orderSelected.length === 0 ? (
                    <Text style={styles.orderPlaceholder}>단어를 순서대로 눌러 문장을 완성하세요.</Text>
                  ) : (
                    <View style={styles.orderWordWrap}>
                      {orderSelected.map((word, index) => (
                        <Pressable
                          key={`${activeQuiz.id}-selected-${index}`}
                          style={styles.orderWordSelected}
                          onPress={() => {
                            const next = [...orderSelected];
                            next.splice(index, 1);
                            setOrderSelected(next);
                            setOrderError(false);
                          }}>
                          <Text style={styles.orderWordText}>{word}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.orderWordWrap}>
                  {activeQuiz.shuffled?.map((word, index) => {
                    const used = orderSelected.includes(word);
                    return (
                      <Pressable
                        key={`${activeQuiz.id}-shuffled-${index}`}
                        style={[styles.orderWord, used && styles.orderWordDisabled]}
                        disabled={used}
                        onPress={() => {
                          setOrderSelected((prev) => [...prev, word]);
                          setOrderError(false);
                        }}>
                        <Text style={styles.orderWordText}>{word}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {orderError ? <Text style={styles.errorText}>다시 시도해보세요.</Text> : null}
                <View style={styles.orderActionRow}>
                  <Pressable style={styles.resetButton} onPress={() => setOrderSelected([])}>
                    <Text style={styles.resetText}>문장 다시 맞추기</Text>
                  </Pressable>
                  <Pressable
                    style={styles.answerToggleButton}
                    onPress={() => setShowOrderAnswer((prev) => !prev)}>
                    <Text style={styles.resetText}>{showOrderAnswer ? '정답 가리기' : '정답 보기'}</Text>
                  </Pressable>
                </View>
                {showOrderAnswer ? (
                  <View style={styles.orderAnswerBox}>
                    <Text style={styles.orderAnswerText}>{orderAnswer.join(' ')}</Text>
                  </View>
                ) : null}
              </>
            )}
            <Pressable style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]} onPress={handleNext} disabled={!canProceed}>
              <Text style={styles.nextButtonText}>다음 문제</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>오늘의 요약</Text>
            </View>
            <Text style={styles.summaryText}>{summary?.summary_text ?? '요약이 없어요.'}</Text>
            <View style={styles.tagRow}>
              {(summary?.tags ?? []).map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
            {summary?.warning_text || (summary?.warning_tags?.length ?? 0) > 0 ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>주의 메시지</Text>
                {summary?.warning_text ? (
                  <Text style={styles.warningText}>{summary.warning_text}</Text>
                ) : null}
                {summary?.warning_tags?.length ? (
                  <View style={styles.tagRow}>
                    {mapWarningTags(summary.warning_tags).map((tag) => (
                      <View key={tag} style={styles.warningChip}>
                        <Text style={styles.warningChipText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
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
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5f5147',
  },
  stepText: {
    fontSize: 13,
    color: '#8a7a70',
  },
  dateText: {
    fontSize: 14,
    color: '#7b6c62',
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#fff7f2',
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#efe1d9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5a4b42',
  },
  prompt: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5a4b42',
  },
  options: {
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f7eeea',
    borderWidth: 1,
    borderColor: '#eaded6',
  },
  optionSelected: {
    borderColor: '#c9b7ae',
  },
  optionCorrect: {
    backgroundColor: '#e7f3e6',
    borderColor: '#b7d2b5',
  },
  optionWrong: {
    backgroundColor: '#fde7e4',
    borderColor: '#e2b8a7',
  },
  optionText: {
    fontSize: 14,
    color: '#5a4b42',
  },
  errorText: {
    fontSize: 12,
    color: '#bf5b4f',
  },
  nextButton: {
    marginTop: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#e2b8a7',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 13,
    color: '#4f4037',
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5a4b42',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f2e6df',
  },
  tagText: {
    fontSize: 12,
    color: '#6b5b52',
  },
  warningBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff2f0',
    borderWidth: 1,
    borderColor: '#f0d7cf',
    gap: 8,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b4f46',
  },
  warningText: {
    fontSize: 13,
    color: '#6b4f46',
  },
  warningEmpty: {
    fontSize: 12,
    color: '#8a7a70',
  },
  warningChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f3e3dc',
  },
  warningChipText: {
    fontSize: 12,
    color: '#6b4f46',
  },
  orderAnswerRow: {
    minHeight: 64,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eaded6',
    backgroundColor: '#fffaf7',
  },
  orderPlaceholder: {
    fontSize: 12,
    color: '#9a8b80',
  },
  orderWordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  orderWord: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f2e6df',
    borderWidth: 1,
    borderColor: '#eaded6',
  },
  orderWordDisabled: {
    opacity: 0.45,
  },
  orderWordSelected: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e7f3e6',
    borderWidth: 1,
    borderColor: '#b7d2b5',
  },
  orderWordText: {
    fontSize: 13,
    color: '#5a4b42',
  },
  orderActionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  answerToggleButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eaded6',
    backgroundColor: '#fdf4ef',
  },
  orderAnswerBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eaded6',
    backgroundColor: '#fffaf7',
  },
  orderAnswerText: {
    fontSize: 13,
    color: '#6b5b52',
  },
  resetButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eaded6',
    backgroundColor: '#f7eeea',
  },
  resetText: {
    fontSize: 12,
    color: '#7b6c62',
  },
});
