/**
 * src/components/MessageItem.tsx
 * Inbox message row matching web msg-row design.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MessageSummary } from '../api/client';
import {
  Colors,
  CATEGORY_COLORS,
  avatarColor,
  initials,
  formatTime,
  Spacing,
  Typography,
} from '../theme';

interface Props {
  message: MessageSummary;
  onPress: () => void;
}

export default function MessageItem({ message, onPress }: Props) {
  const avColor = avatarColor(message.from);
  const catColor = message.category
    ? (CATEGORY_COLORS[message.category] ?? '#888')
    : null;

  // Simulate unread state — messages without is_read property or is_read = false
  const isUnread = !(message as any).is_read;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {/* Unread left bar */}
      <View style={[styles.unreadBar, isUnread && styles.unreadBarActive]} />

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avColor }]}>
        <Text style={styles.avatarText}>{initials(message.from)}</Text>
      </View>

      {/* Content */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text
            style={[styles.from, isUnread && styles.fromUnread]}
            numberOfLines={1}
          >
            {message.from.split('@')[0]}
          </Text>
          <Text style={styles.time}>{formatTime(message.received_at)}</Text>
        </View>
        <Text
          style={[styles.subject, isUnread && styles.subjectUnread]}
          numberOfLines={1}
        >
          {message.subject || '(no subject)'}
        </Text>
        {/* Category badge */}
        {message.category && catColor && (
          <View style={styles.meta}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: catColor + '14',
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: catColor }]}>
                {message.category}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 68,
  },
  /* Unread indicator bar */
  unreadBar: {
    width: 3,
    backgroundColor: 'transparent',
  },
  unreadBarActive: {
    backgroundColor: Colors.unreadBar,
  },
  /* Avatar */
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: Spacing.md,
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.textInv,
    fontWeight: '600',
    fontSize: Typography.sm,
    letterSpacing: 0.2,
  },
  /* Body */
  body: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: Spacing.base,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: 3,
  },
  from: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: '400',
    color: Colors.text2,
  },
  fromUnread: {
    fontWeight: '700',
    color: Colors.text1,
  },
  time: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  subject: {
    fontSize: Typography.base,
    fontWeight: '400',
    color: Colors.text1,
    marginBottom: 3,
  },
  subjectUnread: {
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.02,
  },
});
