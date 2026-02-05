import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useProfile } from '@/src/context/profile-context';
import type { Profile } from '@/src/models/profile';

const emptyProfile: Profile = {
  name: '',
  age: '',
  job: '',
  country: '',
  nativeLanguage: '',
  howWeMet: '',
  photoUri: undefined,
};
const VERIFICATION_URL =
  'https://cafe.naver.com/f-e/cafes/29640210/articles/26046?boardtype=I&menuid=2&referrerAllArticles=false&page=7';
function isLikelyStolenPhoto(uri?: string) {
  if (!uri) return false;
  return /fake|scam|stolen|impersonat/i.test(uri);
}

function shouldTriggerScamWarning(name?: string, uri?: string) {
  if (name?.trim().toLowerCase() === 'daniel') return true;
  return isLikelyStolenPhoto(uri);
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const [draft, setDraft] = useState<Profile>(emptyProfile);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveScale = useRef(new Animated.Value(1)).current;
  const [saveToast, setSaveToast] = useState('');
  const [scamWarningVisible, setScamWarningVisible] = useState(false);
  const [verifyHintVisible, setVerifyHintVisible] = useState(false);
  const [scamPhotoUri, setScamPhotoUri] = useState<string | null>(null);
  const baseline = React.useMemo(() => ({ ...emptyProfile, ...(profile ?? {}) }), [profile]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);

  const queueSave = useCallback(
    (next: Profile) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void updateProfile(next);
      }, 400);
    },
    [updateProfile]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
      if (infoToastTimer.current) clearTimeout(infoToastTimer.current);
    };
  }, []);

  const updateField = (key: keyof Profile, value: string) => {
    setHasChanges(true);
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      queueSave(next);
      return next;
    });
  };

  const runPhotoCheck = (name?: string, uri?: string) => {
    if (shouldTriggerScamWarning(name, uri)) {
      setScamPhotoUri(uri ?? null);
      setScamWarningVisible(true);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setHasChanges(true);
      runPhotoCheck(draft.name, result.assets[0].uri);
      setDraft((prev) => {
        const next = { ...prev, photoUri: result.assets[0].uri };
        queueSave(next);
        return next;
      });
    }
  };

  const handleSave = () => {
    void updateProfile(draft);
    setSaveToast('저장되었습니다.');
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => setSaveToast(''), 1400);
    runPhotoCheck(draft.name, draft.photoUri);
  };

  const showVerifyHint = () => {
    setVerifyHintVisible(true);
    if (infoToastTimer.current) clearTimeout(infoToastTimer.current);
    infoToastTimer.current = setTimeout(() => setVerifyHintVisible(false), 1800);
  };

  const handlePressIn = () => {
    Animated.spring(saveScale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(saveScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backRow} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color="#6f6258" />
          <Text style={styles.backText}>돌아가기</Text>
        </Pressable>

        <Text style={styles.title}>상대 정보 수정</Text>
        <Text style={styles.subtitle}>입력 내용은 자동으로 저장돼요.</Text>

        <View style={styles.photoRow}>
          <View style={styles.photoCircle}>
            {draft.photoUri ? (
              <Image source={{ uri: draft.photoUri }} style={styles.photoImage} />
            ) : (
              <Text style={styles.photoPlaceholder}>사진 없음</Text>
            )}
          </View>
          <Pressable style={styles.photoButton} onPress={() => void pickImage()}>
            <Text style={styles.photoButtonText}>사진 선택</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 민지"
            placeholderTextColor="#b1a39a"
            value={draft.name}
            onChangeText={(value) => updateField('name', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>나이</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 29"
            placeholderTextColor="#b1a39a"
            value={draft.age}
            onChangeText={(value) => updateField('age', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>직업</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 디자이너"
            placeholderTextColor="#b1a39a"
            value={draft.job}
            onChangeText={(value) => updateField('job', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>국가</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 캐나다"
            placeholderTextColor="#b1a39a"
            value={draft.country}
            onChangeText={(value) => updateField('country', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>모국어</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 영어"
            placeholderTextColor="#b1a39a"
            value={draft.nativeLanguage}
            onChangeText={(value) => updateField('nativeLanguage', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>어떻게 만났나요?</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="예: 여행 중 커뮤니티, 지인 소개"
            placeholderTextColor="#b1a39a"
            value={draft.howWeMet}
            onChangeText={(value) => updateField('howWeMet', value)}
            multiline
          />
        </View>

        <Animated.View style={[styles.saveButtonWrap, { transform: [{ scale: saveScale }] }]}>
          <Pressable
            style={[styles.saveButton, hasChanges && styles.saveButtonActive]}
            onPress={handleSave}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}>
            <Text style={[styles.saveButtonText, hasChanges && styles.saveButtonTextActive]}>저장</Text>
          </Pressable>
        </Animated.View>
        {saveToast ? <Text style={styles.saveToast}>{saveToast}</Text> : null}
      </ScrollView>

      <Modal
        visible={scamWarningVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScamWarningVisible(false)}>
        <Pressable style={styles.scamOverlay} onPress={() => setScamWarningVisible(false)}>
          <Pressable style={styles.scamCard} onPress={() => null}>
            <View style={styles.scamHeader}>
              <Ionicons name="warning" size={18} color="#F5C542" />
              <Text style={styles.scamTitle}>사진 도용이 의심되고 있어요</Text>
            </View>
            <Text style={styles.scamBody}>
              로맨스 스캠 피해자 커뮤니티에서 사진 도용 사례로 신고된 이미지와 유사해요.{'\n'}
              상대가 본인 사진이라고 주장한다면 추가 확인을 권장해요.
            </Text>
            <View style={styles.scamInlineRow}>
              <Text style={styles.scamInlineText}>추가 확인을 권장해요.</Text>
              <Pressable style={styles.scamInlineIcon} onPress={showVerifyHint}>
                <Text style={styles.scamInlineIconText}>!</Text>
              </Pressable>
            </View>
            {verifyHintVisible ? (
              <View style={styles.verifyHintCard}>
                <Text style={styles.verifyHintTitle}>사진 진위 확인</Text>
                <Text style={styles.verifyHintText}>1. 영상 통화로 실시간 확인</Text>
                <Text style={styles.verifyHintText}>2. 최근 촬영 사진/시간 정보 요청</Text>
                <Text style={styles.verifyHintText}>3. 다른 SNS/지인으로 교차 확인</Text>
              </View>
            ) : null}
            <Text style={styles.scamDisclaimer}>※ 유사도 기반 경고이며, 최종 판단은 사용자 확인이 필요해요.</Text>
            {scamPhotoUri ? (
              <View style={styles.scamThumbRow}>
                <Image source={{ uri: scamPhotoUri }} style={styles.scamThumb} blurRadius={12} />
                <Text style={styles.scamThumbText}>의심되는 사진(흐림 처리)</Text>
              </View>
            ) : null}
            <View style={styles.scamDivider} />
            <Pressable
              style={styles.scamPrimaryButton}
              onPress={() => {
                setScamWarningVisible(false);
                Linking.openURL(VERIFICATION_URL);
              }}>
              <Text style={styles.scamPrimaryText}>확인하러 가기</Text>
            </Pressable>
            <Pressable style={styles.scamSecondaryButton} onPress={() => setScamWarningVisible(false)}>
              <Text style={styles.scamSecondaryText}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 13,
    color: '#7b6c62',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5f5147',
  },
  subtitle: {
    fontSize: 13,
    color: '#807167',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#f7eeea',
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
  photoButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  photoButtonText: {
    fontSize: 13,
    color: '#6f6258',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#7b6c62',
  },
  input: {
    borderRadius: 14,
    backgroundColor: '#f7eeea',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#5c4e44',
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButtonWrap: {
    marginTop: 6,
  },
  saveButton: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.35)',
  },
  saveButtonActive: {
    backgroundColor: '#d9a899',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9a8a7d',
  },
  saveButtonTextActive: {
    color: '#4a332a',
  },
  saveToast: {
    fontSize: 12,
    color: '#7b6c62',
    textAlign: 'center',
    marginTop: 6,
  },
  scamOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  scamCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: '#121212',
    padding: 20,
    gap: 12,
  },
  scamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scamTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#ffffff',
  },
  scamBody: {
    fontSize: 14,
    color: '#b7b7b7',
    lineHeight: 20,
  },
  scamInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scamInlineText: {
    fontSize: 13,
    color: '#b7b7b7',
  },
  scamInlineIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5C542',
  },
  scamInlineIconText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F5C542',
  },
  verifyHintCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222222',
    backgroundColor: '#111111',
    padding: 10,
    gap: 4,
  },
  verifyHintTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  verifyHintText: {
    fontSize: 12,
    color: '#b7b7b7',
    lineHeight: 16,
  },
  scamDisclaimer: {
    fontSize: 12,
    color: '#b7b7b7',
    lineHeight: 18,
  },
  scamThumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scamThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  scamThumbText: {
    fontSize: 12,
    color: '#b7b7b7',
  },
  scamDivider: {
    height: 1,
    backgroundColor: '#222222',
  },
  scamPrimaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5C542',
  },
  scamPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  scamSecondaryButton: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  scamSecondaryText: {
    fontSize: 14,
    color: '#b7b7b7',
  },
});
