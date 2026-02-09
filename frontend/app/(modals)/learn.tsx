import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import QuizScreen from '@/src/screens/QuizScreen';

export default function LearnModal() {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>퀴즈</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>
        <QuizScreen />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8f0eb',
    padding: 16,
    width: '100%',
    height: '70%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5a4b42',
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#f2e6df',
  },
  closeText: {
    fontSize: 12,
    color: '#6b5b52',
  },
});
