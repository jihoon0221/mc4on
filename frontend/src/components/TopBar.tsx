import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

type TopBarProps = {
  title?: string;
  style?: ViewStyle;
};

export default function TopBar({ title, style }: TopBarProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.sideSpacer} />
      <Text style={styles.title}>{title ?? ''}</Text>
      <View style={styles.iconRow}>
        <Pressable style={styles.iconButton} accessibilityRole="button">
          <Ionicons name="notifications-outline" size={20} color="#7b6e64" />
        </Pressable>
        <Pressable style={styles.iconButton} accessibilityRole="button">
          <Ionicons name="settings-outline" size={20} color="#7b6e64" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideSpacer: {
    width: 64,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5f5147',
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
});
