/**
 * src/screens/MessageScreen.tsx
 * Full message view redesigned to match Velox Mail web thread-pane.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteMessage, getMessage, MessageDetail } from '../api/client';
import {
  Colors,
  CATEGORY_COLORS,
  avatarColor,
  initials,
  formatFullTime,
  Radii,
  Shadows,
  Spacing,
  Typography,
} from '../theme';

export default function MessageScreen({ route, navigation }: any) {
  const { id } = route.params as { id: number };
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMessage(id)
      .then(setMessage)
      .catch((e) => {
        Alert.alert('Error', e.message);
        navigation.goBack();
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Delete Message', 'Move this message to trash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleReply = () => {
    if (!message) return;
    navigation.navigate('Compose', {
      to: message.from_addr,
      subject: message.subject ? `Re: ${message.subject}` : '',
    });
  };

  const handleForward = () => {
    if (!message) return;
    navigation.navigate('Compose', {
      to: '',
      subject: message.subject ? `Fwd: ${message.subject}` : '',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="small" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!message) return null;

  const fromAddr = message.from_addr || (message as any).from || '';
  const toAddr = message.to_addr || (message as any).to || '';
  const avBg = avatarColor(fromAddr);
  const catColor = message.category
    ? (CATEGORY_COLORS[message.category] ?? '#888')
    : null;

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.toolbarActions}>
          <TouchableOpacity
            onPress={handleReply}
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnPrimaryText}>↩ Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleForward}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>↪ Forward</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnDangerText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Thread header */}
        <View style={styles.threadHeader}>
          <Text style={styles.subject}>{message.subject || '(no subject)'}</Text>
          {message.category && catColor && (
            <View
              style={[
                styles.catPill,
                {
                  backgroundColor: catColor + '18',
                  borderColor: catColor + '30',
                },
              ]}
            >
              <Text style={[styles.catPillText, { color: catColor }]}>
                {message.category}
              </Text>
            </View>
          )}
        </View>

        {/* Message card */}
        <View style={styles.messageCard}>
          {/* Message header */}
          <View style={styles.msgHeader}>
            <View style={[styles.msgAvatar, { backgroundColor: avBg }]}>
              <Text style={styles.msgAvatarText}>{initials(fromAddr)}</Text>
            </View>
            <View style={styles.msgSenderBlock}>
              <Text style={styles.msgFrom}>{fromAddr}</Text>
              <Text style={styles.msgTo}>to {toAddr}</Text>
            </View>
            <Text style={styles.msgTime}>{formatFullTime(message.received_at)}</Text>
          </View>
          {/* Message body */}
          <View style={styles.msgBody}>
            <Text style={styles.bodyText}>
              {message.body || '(empty message)'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceThread,
  },
  loadingCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceThread,
  },
  loadingText: {
    fontSize: Typography.base,
    color: Colors.text3,
  },
  /* Toolbar */
  toolbar: {
    backgroundColor: Colors.surface,
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: Spacing.sm,
  },
  backText: {
    fontSize: 20,
    color: Colors.text2,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.accent,
    borderColor: 'transparent',
  },
  actionBtnText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.text2,
  },
  actionBtnPrimaryText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textInv,
  },
  actionBtnDangerText: {
    fontSize: 13,
  },
  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  /* Thread header */
  threadHeader: {
    gap: Spacing.md,
  },
  subject: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.text1,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  catPill: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  catPillText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  /* Message card */
  messageCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  msgAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: {
    color: Colors.textInv,
    fontWeight: '600',
    fontSize: Typography.md,
  },
  msgSenderBlock: {
    flex: 1,
  },
  msgFrom: {
    fontSize: Typography.md,
    fontWeight: '600',
    color: Colors.text1,
    marginBottom: 2,
  },
  msgTo: {
    fontSize: Typography.sm,
    color: Colors.text3,
  },
  msgTime: {
    fontSize: Typography.sm,
    color: Colors.text3,
  },
  msgBody: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  bodyText: {
    fontSize: Typography.md,
    color: Colors.text1,
    lineHeight: 24,
  },
});
