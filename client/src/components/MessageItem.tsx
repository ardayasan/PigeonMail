/**
 * src/components/MessageItem.tsx
 * Single row in the inbox list.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MessageSummary } from '../api/client';

const CATEGORY_COLORS: Record<string, string> = {
  Work:       '#1a73e8',
  Personal:   '#34a853',
  Spam:       '#ea4335',
  Finance:    '#fbbc04',
  Promotions: '#ff6d00',
  Social:     '#9c27b0',
};

interface Props {
  message: MessageSummary;
  onPress: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessageItem({ message, onPress }: Props) {
  const badgeColor = message.category
    ? (CATEGORY_COLORS[message.category] ?? '#888')
    : '#ccc';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: badgeColor }]}>
        <Text style={styles.avatarText}>
          {(message.from || '?')[0].toUpperCase()}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.from} numberOfLines={1}>{message.from}</Text>
          <Text style={styles.date}>{formatDate(message.received_at)}</Text>
        </View>
        <Text style={styles.subject} numberOfLines={1}>
          {message.subject || '(no subject)'}
        </Text>
        {message.category && (
          <View style={[styles.badge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{message.category}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  body: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  from: { fontWeight: '600', fontSize: 14, color: '#222', flex: 1, marginRight: 8 },
  date: { fontSize: 12, color: '#999' },
  subject: { fontSize: 13, color: '#555', marginBottom: 4 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
