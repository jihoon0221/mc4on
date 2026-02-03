import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useProfile } from '@/src/context/profile-context';
import TopBar from '@/src/components/TopBar';
import type { Profile } from '@/src/models/profile';

const emptyProfile: Profile = {
  age: '',
  job: '',
  country: '',
  nativeLanguage: '',
  howWeMet: '',
  photoUri: undefined,
};

export default function ProfileScreen() {
  const { profile, updateProfile } = useProfile();
  const [draft, setDraft] = useState<Profile>(emptyProfile);

  useEffect(() => {
    if (profile) {
      setDraft(profile);
    }
  }, [profile]);

  const updateField = (key: keyof Profile, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await updateProfile(draft);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setDraft((prev) => ({ ...prev, photoUri: result.assets[0].uri }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar />

        <Text style={styles.title}>프로필</Text>
        <Text style={styles.subtitle}>상대의 정보를 차분히 기록해두세요.</Text>

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

        <Pressable style={styles.saveButton} onPress={() => void handleSave()}>
          <Text style={styles.saveText}>저장</Text>
        </Pressable>

        <Pressable style={styles.reportButton} onPress={() => {}}>
          <Text style={styles.reportText}>신고</Text>
        </Pressable>
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
  topBar: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  topSpacer: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5f5147',
  },
  subtitle: {
    fontSize: 14,
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
  saveButton: {
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5d4e45',
  },
  reportButton: {
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  reportText: {
    fontSize: 14,
    color: '#5d4e45',
  },
});


