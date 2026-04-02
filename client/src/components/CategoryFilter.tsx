/**
 * src/components/CategoryFilter.tsx
 * Horizontal scrollable category pill bar.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

const CATEGORY_COLORS: Record<string, string> = {
  Work:       '#1a73e8',
  Personal:   '#34a853',
  Spam:       '#ea4335',
  Finance:    '#fbbc04',
  Promotions: '#ff6d00',
  Social:     '#9c27b0',
};

interface Props {
  categories: string[];
  selected: string | null;
  onSelect: (cat: string | null) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: Props) {
  const all = ['All', ...categories];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {all.map((cat) => {
        const isSelected = cat === 'All' ? selected === null : selected === cat;
        const color = cat === 'All' ? '#555' : (CATEGORY_COLORS[cat] ?? '#555');
        return (
          <TouchableOpacity
            key={cat}
            style={[
              styles.pill,
              isSelected && { backgroundColor: color, borderColor: color },
            ]}
            onPress={() => onSelect(cat === 'All' ? null : cat)}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  pillText: { fontSize: 13, fontWeight: '500', color: '#555' },
  pillTextSelected: { color: '#fff' },
});
