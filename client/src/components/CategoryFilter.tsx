/**
 * src/components/CategoryFilter.tsx
 * Tab-style category filter matching web list-tabs design.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, CATEGORY_COLORS, Spacing, Typography } from '../theme';

interface Props {
  categories: string[];
  selected: string | null;
  onSelect: (cat: string | null) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: Props) {
  if (categories.length === 0) return null;

  const tabs = ['All', ...categories];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {tabs.map((tab) => {
          const isActive = tab === 'All' ? selected === null : selected === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelect(tab === 'All' ? null : tab)}
              activeOpacity={0.7}
            >
              {tab !== 'All' && (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: CATEGORY_COLORS[tab] ?? Colors.text3 },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.borderBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  content: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accent,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  tabText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.text3,
  },
  tabTextActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
  borderBottom: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
