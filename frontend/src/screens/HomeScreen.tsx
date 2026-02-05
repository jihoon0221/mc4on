import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { API_BASE_URL, apiFetch } from '@/src/api/client';
import { uploadKakao, type KakaoUploadResponse } from '@/src/api/upload';
import type { TimelineEntry } from '@/src/models/timeline-entry';
import { saveTimelineEntries } from '@/src/storage/timeline-storage';
import { fetchTimelineEntries } from '@/src/api/timeline';
import BirdCharacter, { type BirdState } from '@/src/components/BirdCharacter';
import Nest from '@/src/components/Nest';
import SettingsMenu from '@/src/components/SettingsMenu';
import TopBar from '@/src/components/TopBar';
import { useDayRecords } from '@/src/context/day-records-context';
import type { AnalysisResult } from '@/src/models/analysis-result';
import type { BirdState as ModelBirdState } from '@/src/models/bird-state';
import { getSeoulDateKey } from '@/src/utils/date';
import { parseKakaoFile, type ParsedConversation } from '@/src/utils/kakaoImport';

const FEEDING_MS = 900;
const FEED_CARD_SIZE = { width: 160, height: 64 };
const ENABLE_UPLOAD_LOGS = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
const FEED_ICON = require('../../assets/images/kakao-talk.png');

type ImportedFile = {
  uri: string;
  name: string;
  size: number;
  mimeType?: string;
};

type AnalysisJobStatus = {
  job_id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type ReportHistoryItem = {
  analysis_date: string;
  summary_text: string | null;
  tags: string[];
  warning_text: string | null;
  warning_tags: string[];
  risk_level: number | null;
  learning_items: Array<{ content_kr: string; content_fl: string }>;
};

type ReportHistoryResponse = {
  items: ReportHistoryItem[];
};

function getBirdState(uploadCount: number): BirdState {
  if (uploadCount <= 1) return 'healthy';
  if (uploadCount <= 3) return 'uneasy';
  if (uploadCount <= 5) return 'distorted';
  return 'critical';
}

function mapBirdStateToVisual(state?: ModelBirdState): BirdState | null {
  if (!state) return null;
  if (state === 'calm') return 'healthy';
  if (state === 'cautious') return 'uneasy';
  if (state === 'anxious') return 'distorted';
  if (state === 'relieved') return 'healthy';
  if (state === 'growing') return 'healthy';
  return null;
}

function logUpload(label: string, data: Record<string, unknown>) {
  if (!ENABLE_UPLOAD_LOGS) return;
  // eslint-disable-next-line no-console
  console.log(`[upload] ${label}`, data);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAnalysisResult(input: KakaoUploadResponse['analysis_result']): AnalysisResult | undefined {
  if (!input) return undefined;
  return {
    analysis_date: input.analysis_date,
    summary_text: input.summary_text ?? null,
    tags: input.tags ?? [],
    warning_text: input.warning_text ?? null,
    warning_tags: input.warning_tags ?? [],
    risk_level: input.risk_level ?? null,
    learning_items: (input.learning_items ?? []).map((item) => {
      if ('content_kr' in item) {
        return {
          content_kr: item.content_kr,
          content_fl: item.content_fl,
          content_type: item.content_type,
          review_due_date: item.review_due_date ?? null,
        };
      }
      return {
        content_kr: item.content,
        content_fl: '',
        content_type: item.content_type,
        review_due_date: item.review_due_date ?? null,
      };
    }),
  };
}

function mapTimelineResponseToEntries(
  items: NonNullable<KakaoUploadResponse['timeline']>
): TimelineEntry[] {
  return items.map((item) => ({
    id: item.analysis_date,
    date: item.analysis_date,
    summary: item.summary_short ?? item.warning_text ?? '오늘의 기록',
    tags: item.tags ?? [],
    warningText: item.warning_text,
    warningTags: item.warning_tags,
    riskLevel: item.risk_level,
    birdState: item.bird_state > 0 ? 'anxious' : 'calm',
    createdAt: new Date().toISOString(),
  }));
}

function normalizeHistoryItem(item: ReportHistoryItem): AnalysisResult {
  return {
    analysis_date: item.analysis_date,
    summary_text: item.summary_text ?? null,
    tags: item.tags ?? [],
    warning_text: item.warning_text ?? null,
    warning_tags: item.warning_tags ?? [],
    risk_level: item.risk_level ?? null,
    learning_items: (item.learning_items ?? []).map((learn) => ({
      content_kr: learn.content_kr,
      content_fl: learn.content_fl,
      content_type: 'sentence',
      review_due_date: null,
    })),
  };
}

export default function HomeScreen() {
  const [uploadCount, setUploadCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [hasTodayEgg, setHasTodayEgg] = useState(false);
  const [eggJustLaid, setEggJustLaid] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [eggCracking, setEggCracking] = useState(false);
  const [showEggOverlay, setShowEggOverlay] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [importedFile, setImportedFile] = useState<ImportedFile | null>(null);
  const [parsedConversation, setParsedConversation] = useState<ParsedConversation | null>(null);
  const [feedReady, setFeedReady] = useState(false);
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedConsumed, setFeedConsumed] = useState(false);
  const [eggReady, setEggReady] = useState(false);
  const [eggNotice, setEggNotice] = useState('');
  const [mouthOpen, setMouthOpen] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { addOrUpdateToday, records, replaceAll } = useDayRecords();

  const eggCrack = useRef(new Animated.Value(0)).current;
  const eggOverlayScale = useRef(new Animated.Value(0.9)).current;
  const eggOverlayOpacity = useRef(new Animated.Value(0)).current;
  const eggCrackOpacity = eggCrack.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.7, 1],
  });
  const eggCrackScale = eggCrack.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });
  const feedPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const feedScale = useRef(new Animated.Value(1)).current;
  const feedOpacity = useRef(new Animated.Value(1)).current;
  const heroRef = useRef<View | null>(null);
  const birdRef = useRef<View | null>(null);
  const heroWindow = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const mouthCenter = useRef<{ x: number; y: number } | null>(null);
  const feedOrigin = useRef({ x: 0, y: 0 });
  const mouthOpenRef = useRef(false);
  const lastLearnedAt = useRef<string | undefined>(undefined);
  const prevLearned = useRef(false);
  const cycleStates: BirdState[] = ['healthy', 'uneasy', 'distorted', 'critical'];

  const birdState = useMemo(() => getBirdState(uploadCount), [uploadCount]);
  const canShowReasonButton = birdState !== 'healthy';
  const todayKey = useMemo(() => getSeoulDateKey(), []);
  const todayRecord = useMemo(
    () => records.find((record) => record.date === todayKey),
    [records, todayKey]
  );
  const learnedToday = todayRecord?.learned ?? false;
  const mappedState = mapBirdStateToVisual(todayRecord?.birdState);
  const visualState = learnedToday ? cycleStates[cycleIndex] : 'healthy';
  const eggAvailable = eggReady || hasTodayEgg;

  useEffect(() => {
    if (!eggJustLaid) return;
    const timer = setTimeout(() => setEggJustLaid(false), 2200);
    return () => clearTimeout(timer);
  }, [eggJustLaid]);

  useEffect(() => {
    if (!records.length) return;
    if (todayRecord) {
      setUploadCount(todayRecord.uploadCount);
    }
  }, [records, todayRecord]);

  useEffect(() => {
    if (todayRecord?.learned) {
      setEggReady(false);
      setHasTodayEgg(false);
      setEggJustLaid(false);
      setFeedVisible(false);
    } else if (feedConsumed) {
      setFeedVisible(false);
    }
  }, [todayRecord?.learned, feedConsumed]);

  useEffect(() => {
    if (!todayRecord?.learned) {
      prevLearned.current = false;
      return;
    }
    if (!prevLearned.current) {
      prevLearned.current = true;
      lastLearnedAt.current = todayRecord.updatedAt;
      setCycleIndex((prev) => (prev + 1) % cycleStates.length);
      return;
    }
    if (todayRecord.updatedAt && todayRecord.updatedAt !== lastLearnedAt.current) {
      lastLearnedAt.current = todayRecord.updatedAt;
      setCycleIndex((prev) => (prev + 1) % cycleStates.length);
    }
  }, [todayRecord?.learned, todayRecord?.updatedAt, cycleStates.length]);

  const openNotepad = () => {
    if (!eggAvailable || eggCracking) return;
    setEggCracking(true);
    setShowEggOverlay(true);
    eggOverlayScale.setValue(0.9);
    eggOverlayOpacity.setValue(0);
    eggCrack.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(eggOverlayOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(eggOverlayScale, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(eggCrack, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setEggCracking(false);
      setShowEggOverlay(false);
      eggCrack.setValue(0);
      eggOverlayScale.setValue(0.9);
      eggOverlayOpacity.setValue(0);
      router.push('/(modals)/learn-notepad');
    });
  };

  const resetFeedCard = () => {
    feedPosition.stopAnimation(() => {
      Animated.spring(feedPosition, {
        toValue: { x: feedOrigin.current.x, y: feedOrigin.current.y },
        useNativeDriver: false,
        bounciness: 8,
      }).start();
    });
  };

  const handleFeedEaten = () => {
    Animated.parallel([
      Animated.timing(feedScale, {
        toValue: 0.2,
        duration: FEEDING_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(feedOpacity, {
        toValue: 0,
        duration: FEEDING_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setFeedVisible(false);
      setFeedConsumed(true);
      setEggReady(true);
      setHasTodayEgg(true);
      setEggJustLaid(true);
      setMouthOpen(false);
      mouthOpenRef.current = false;
      setEggNotice('알이 생겼어요!');
      setTimeout(() => setEggNotice(''), 1600);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          heroRef.current?.measureInWindow((x, y, width, height) => {
            heroWindow.current = { x, y, width, height };
          });
          birdRef.current?.measureInWindow((x, y, width, height) => {
            mouthCenter.current = {
              x: x + width * 0.62,
              y: y + height * 0.52,
            };
          });
        },
        onPanResponderMove: (_event, gesture) => {
          feedPosition.setValue({
            x: feedOrigin.current.x + gesture.dx,
            y: feedOrigin.current.y + gesture.dy,
          });
          if (!mouthCenter.current) return;
          const dx = gesture.moveX - mouthCenter.current.x;
          const dy = gesture.moveY - mouthCenter.current.y;
          const inside = Math.hypot(dx, dy) < 34;
          if (inside !== mouthOpenRef.current) {
            mouthOpenRef.current = inside;
            setMouthOpen(inside);
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          if (mouthCenter.current) {
            const dx = gesture.moveX - mouthCenter.current.x;
            const dy = gesture.moveY - mouthCenter.current.y;
            const inside = Math.hypot(dx, dy) < 34;
            if (inside) {
              handleFeedEaten();
              return;
            }
          }
          setMouthOpen(false);
          mouthOpenRef.current = false;
          resetFeedCard();
        },
      }),
    [feedPosition]
  );

  useEffect(() => {
    if (!feedReady) return;
    if (heroWindow.current.width === 0) return;
    feedOrigin.current = {
      x: heroWindow.current.width / 2 - FEED_CARD_SIZE.width / 2,
      y: heroWindow.current.height - FEED_CARD_SIZE.height - 28,
    };
    feedPosition.setValue(feedOrigin.current);
  }, [feedReady, feedPosition]);

  const handlePickFile = async () => {
    if (isImporting) return;
    setImportError('');
    setImportMessage('');
    setFeedReady(false);
    setFeedVisible(false);
    setFeedConsumed(false);
    setEggReady(false);
    setParsedConversation(null);
    setImportedFile(null);
    setHasTodayEgg(false);
    setEggNotice('');
    feedPosition.setValue({ x: 0, y: 0 });
    feedScale.setValue(1);
    feedOpacity.setValue(1);
    setIsImporting(true);
    let pickedIsZip = false;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setIsImporting(false);
        return;
      }
      const file = result.assets[0];
      pickedIsZip = file.name.toLowerCase().endsWith('.zip');
      logUpload('selected_file', {
        name: file.name,
        size: file.size ?? null,
        mimeType: file.mimeType ?? null,
        isZip: pickedIsZip,
      });
      const dir = `${FileSystem.documentDirectory}imports/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const safeName = `${Date.now()}_${file.name}`;
      const targetUri = `${dir}${safeName}`;
      await FileSystem.copyAsync({ from: file.uri, to: targetUri });

      const meta: ImportedFile = {
        uri: targetUri,
        name: file.name,
        size: file.size ?? 0,
        mimeType: file.mimeType ?? undefined,
      };
      setImportedFile(meta);

      const parsed = await parseKakaoFile(targetUri, file.name);
      setParsedConversation(parsed);
      logUpload('parsed_conversation', {
        messagesCount: parsed.messagesCount,
        rawTextLength: parsed.rawTextLength,
        tags: parsed.tags,
        flags: parsed.flags,
        summaryPreview: parsed.summary.slice(0, 120),
      });

      let analysisResult: AnalysisResult | undefined;
      let replacedAll = false;
      try {
        logUpload('send_to_server', {
          baseUrl: API_BASE_URL,
          fileName: file.name,
          fileSize: file.size ?? null,
          mimeType: file.mimeType ?? null,
          syncAnalysis: true,
        });
        const response = await uploadKakao({
          file: {
            uri: targetUri,
            name: file.name,
            mimeType: file.mimeType ?? undefined,
          },
          syncAnalysis: true,
          force: true,
        });
        const fallbackResult =
          response.analysis_result ??
          (response.dailyreport && response.dailyreport.length > 0
            ? response.dailyreport[response.dailyreport.length - 1]
            : null);
        const rawItems = fallbackResult?.learning_items ?? [];
        const jobId = response.analysis_job_id ?? null;
        const jobDate = response.analysis_jobs?.[0]?.analysis_date ?? null;
        const itemSchema = rawItems.length
          ? 'content_kr' in rawItems[0]
            ? 'new'
            : 'old'
          : 'none';
        logUpload('server_response', {
          analysisStatus: response.analysis_status ?? null,
          analysisJobId: jobId,
          analysisJobDate: jobDate,
          hasAnalysisResult: Boolean(response.analysis_result),
          analysisDate: response.analysis_result?.analysis_date ?? null,
          itemSchema,
          learningItemsCount: rawItems.length,
          summaryTextPreview: response.analysis_result?.summary_text?.slice(0, 120) ?? null,
          warningTextPreview: response.analysis_result?.warning_text?.slice(0, 120) ?? null,
          mockUsed: response.mock_used ?? false,
          mockKeyword: response.mock_keyword ?? null,
        });
        analysisResult = normalizeAnalysisResult(fallbackResult as KakaoUploadResponse['analysis_result']);

        if (response.timeline && response.timeline.length > 0) {
          const mapped = mapTimelineResponseToEntries(response.timeline);
          await saveTimelineEntries(mapped);
        } else {
          const serverTimeline = await fetchTimelineEntries();
          if (serverTimeline.length > 0) {
            await saveTimelineEntries(serverTimeline);
          }
        }

        if (response.dailyreport && response.dailyreport.length > 0) {
          const now = new Date().toISOString();
          const replaced = response.dailyreport.map((item) => {
            const normalized = normalizeAnalysisResult(item);
            return {
              id: `day_${item.analysis_date}`,
              date: item.analysis_date,
              source: 'kakaotalk_txt' as const,
              sourceFileName: file.name,
              extractedSentences: normalized?.learning_items?.map((learn) => learn.content_kr).filter(Boolean).slice(0, 3) ?? [],
              nativeSentences: normalized?.learning_items?.map((learn) => learn.content_fl).filter(Boolean) ?? [],
              flags: parsed.flags,
              uploadCount: 1,
              learned: false,
              immediateRisk: {
                scamUrl: false,
                reportedAccount: false,
                aiImage: false,
              },
              immediateRiskShown: false,
              analysisResult: normalized ?? undefined,
              createdAt: now,
              updatedAt: now,
            };
          });
          await replaceAll(replaced);
          replacedAll = true;
        }

        if (!analysisResult && jobId) {
          void (async () => {
            for (let attempt = 1; attempt <= 6; attempt += 1) {
              await sleep(2000);
              try {
                const status = await apiFetch<AnalysisJobStatus>(`/analysis-jobs/${jobId}`);
                logUpload('job_status', {
                  attempt,
                  jobId,
                  status: status.status,
                  error: status.error_message ?? null,
                  updatedAt: status.updated_at,
                });
                if (status.status === 'FAILED') {
                  setImportError(status.error_message ?? '분석 작업이 실패했어요.');
                  break;
                }
                if (status.status === 'DONE') {
                  const history = await apiFetch<ReportHistoryResponse>('/reports/history?limit=5');
                  const target = jobDate
                    ? history.items.find((item) => item.analysis_date === jobDate)
                    : history.items[0];
                  if (target) {
                    const normalized = normalizeHistoryItem(target);
                    await addOrUpdateToday({
                      extractedSentences: parsed.messages.slice(0, 3),
                      nativeSentences: undefined,
                      flags: parsed.flags,
                      sourceFileName: file.name,
                      analysisResult: normalized,
                    });
                    logUpload('analysis_loaded', {
                      analysisDate: normalized.analysis_date,
                      learningItemsCount: normalized.learning_items.length,
                    });
                  } else {
                    logUpload('analysis_not_found', { jobDate, items: history.items.length });
                  }
                  break;
                }
              } catch (error) {
                logUpload('job_status_error', {
                  attempt,
                  jobId,
                  message: error instanceof Error ? error.message : String(error),
                });
              }
            }
          })();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        logUpload('server_error', {
          baseUrl: API_BASE_URL,
          message: message || 'unknown error',
        });
        setImportError(message ? `분석 서버 연결에 실패했어요: ${message}` : '분석 서버 연결에 실패했어요.');
      }

      if (!replacedAll) {
        const updated = await addOrUpdateToday({
          extractedSentences: parsed.messages.slice(0, 3),
          nativeSentences: undefined,
          flags: parsed.flags,
          sourceFileName: file.name,
          analysisResult,
        });
        if (updated) {
          setFeedReady(true);
          setFeedVisible(true);
          setFeedConsumed(false);
          setEggReady(false);
          feedScale.setValue(1);
          feedOpacity.setValue(1);
          setImportMessage('오늘의 먹이가 준비됐어요. 새에게 먹여볼까요?');
        }
      } else {
        setFeedReady(true);
        setFeedVisible(true);
        setFeedConsumed(false);
        setEggReady(false);
        feedScale.setValue(1);
        feedOpacity.setValue(1);
        setImportMessage('오늘의 먹이가 준비됐어요. 새에게 먹여볼까요?');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (pickedIsZip || message === 'zip_parse_failed') {
        setImportError('ZIP을 읽지 못했어요. TXT로 내보내기 후 다시 시도해 주세요.');
      } else {
        setImportError('파일을 읽지 못했어요. 다시 선택해 주세요.');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const onHeroLayout = () => {
    heroRef.current?.measureInWindow((x, y, width, height) => {
      heroWindow.current = { x, y, width, height };
      feedOrigin.current = {
        x: width / 2 - FEED_CARD_SIZE.width / 2,
        y: height - FEED_CARD_SIZE.height - 28,
      };
      feedPosition.setValue(feedOrigin.current);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!(feedReady && !feedConsumed)}>
        <View style={styles.roomLayer}>
          <TopBar style={styles.topBarAdjust} onPressSettings={() => setSettingsOpen(true)} />

          <Pressable
            style={styles.heroArea}
            ref={heroRef}
            onLayout={onHeroLayout}
            pointerEvents="box-none"
            onPress={eggAvailable ? openNotepad : undefined}
            accessibilityRole="button">
            <View style={[styles.sceneWrap, eggJustLaid && styles.sceneWrapPulse]}>
              <View style={styles.nestWrap}>
                <Nest
                  state={visualState}
                  showEgg={eggAvailable}
                  eggJustLaid={eggJustLaid}
                  onEggPress={openNotepad}
                />
              </View>
              <View style={[styles.birdWrap, learnedToday && styles.birdWrapLearned]} ref={birdRef}>
                <BirdCharacter state={visualState} mouthOpen={mouthOpen} />
              </View>
            </View>

            {feedReady && !feedConsumed ? (
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.feedCard,
                  {
                    transform: [
                      { translateX: feedPosition.x },
                      { translateY: feedPosition.y },
                      { scale: feedScale },
                    ],
                    opacity: feedOpacity,
                  },
                ]}>
                <View style={styles.feedIconRow}>
                  <Image source={FEED_ICON} style={styles.feedIcon} resizeMode="contain" />
                </View>
              </Animated.View>
            ) : null}
          </Pressable>

          <View style={styles.lowerArea}>
            <Pressable
              onPress={handlePickFile}
              style={[styles.uploadButton, isImporting && styles.uploadButtonDisabled]}
              accessibilityRole="button">
              <Text style={styles.uploadButtonText}>
                {isImporting ? '파일을 불러오는 중이에요.' : '오늘의 대화를 새에게 건네기'}
              </Text>
            </Pressable>

            {importMessage ? <Text style={styles.feedNotice}>{importMessage}</Text> : null}
            {eggNotice ? <Text style={styles.eggNotice}>{eggNotice}</Text> : null}
            {importError ? <Text style={styles.errorText}>{importError}</Text> : null}

            <View style={styles.eggRow}>
              <Text style={styles.eggLabel}>
                {eggAvailable
                  ? '오늘의 둥지에 작은 알이 놓였어요.'
                  : '조용히, 무엇이 달라지고 있는지 살펴보세요.'}
              </Text>
            </View>

            {canShowReasonButton && learnedToday ? (
              <Pressable
                style={styles.reasonButton}
                onPress={() => setShowReasons((prev) => !prev)}
                accessibilityRole="button">
                <Text style={styles.reasonButtonText}>조용히 이유를 살펴볼까요?</Text>
              </Pressable>
            ) : null}

            {showReasons && learnedToday ? (
              <View style={styles.reasonWrap}>
                <Text style={styles.reasonText}>
                  최근 대화에 반복된 금전 관련 표현, 도움 요청, 외부 링크가 보였어요.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {showEggOverlay ? (
        <View style={styles.eggOverlay}>
          <Animated.View
            style={[
              styles.eggShellOverlay,
              {
                opacity: eggOverlayOpacity,
                transform: [{ scale: eggOverlayScale }],
              },
            ]}>
            <View style={styles.eggHighlight} />
            <Animated.View
              style={[
                styles.eggCrack,
                {
                  opacity: eggCrackOpacity,
                  transform: [{ scaleX: eggCrackScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.eggCrack,
                styles.eggCrackLower,
                {
                  opacity: eggCrackOpacity,
                  transform: [{ scaleX: eggCrackScale }],
                },
              ]}
            />
          </Animated.View>
        </View>
      ) : null}

      <SettingsMenu visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  content: {
    minHeight: '100%',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  roomLayer: {
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    backgroundColor: '#f7eeea',
  },
  topBar: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  topBarAdjust: {
    marginHorizontal: -14,
    marginTop: -14,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  heroArea: {
    height: 430,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(241, 220, 229, 0.45)',
    borderRadius: 26,
    overflow: 'hidden',
  },
  sceneWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 28,
  },
  sceneWrapPulse: {
    transform: [{ scale: 1.01 }],
  },
  birdWrap: {
    position: 'absolute',
    bottom: 70,
    zIndex: 6,
    elevation: 6,
  },
  birdWrapLearned: {
    transform: [{ scale: 1.01 }],
  },
  nestWrap: {
    width: '100%',
    alignItems: 'center',
    zIndex: 3,
    elevation: 3,
  },
  feedCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FEED_CARD_SIZE.width,
    height: FEED_CARD_SIZE.height,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 8,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
  feedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a7b6f',
  },
  feedIconRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedIcon: {
    width: 52,
    height: 52,
  },
  feedFile: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e45',
    marginTop: 4,
  },
  lowerArea: {
    marginTop: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 8,
  },
  uploadButton: {
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  uploadButtonDisabled: {
    opacity: 0.75,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e45',
  },
  feedNotice: {
    fontSize: 12,
    color: '#7b6c62',
  },
  eggNotice: {
    fontSize: 12,
    color: '#6f5d52',
  },
  errorText: {
    fontSize: 12,
    color: '#8d6f64',
  },
  eggRow: {
    minHeight: 22,
    justifyContent: 'center',
  },
  eggLabel: {
    fontSize: 12,
    color: '#907f73',
  },
  reasonButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    opacity: 0.78,
  },
  reasonButtonText: {
    fontSize: 11,
    color: '#9a8a7d',
  },
  reasonWrap: {
    paddingTop: 2,
    paddingRight: 6,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#7c6d62',
  },
  bottomSpacer: {
    height: 94,
  },
  eggOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 42, 34, 0.2)',
    zIndex: 30,
  },
  eggShellOverlay: {
    width: 170,
    height: 210,
    borderRadius: 100,
    backgroundColor: '#f8f2e4',
    borderWidth: 1,
    borderColor: 'rgba(116, 93, 76, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eggHighlight: {
    position: 'absolute',
    left: 44,
    top: 46,
    width: 36,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  eggCrack: {
    position: 'absolute',
    top: 110,
    width: 96,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(150, 120, 96, 0.7)',
  },
  eggCrackLower: {
    top: 128,
    width: 78,
  },
});
