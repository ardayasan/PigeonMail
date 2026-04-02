/**
 * src/screens/MessageScreen.tsx
 * Full message view with delete and reply actions.
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

const CATEGORY_COLORS: Record<string, string> = {
  Work:       '#1a73e8',
  Personal:   '#34a853',
  Spam:       '#ea4335',
  Finance:    '#fbbc04',
  Promotions: '#ff6d00',
  Social:     '#9c27b0',
};

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!message) return null;

  const badgeColor = message.category
    ? (CATEGORY_COLORS[message.category] ?? '#888')
    : null;

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.toolbarActions}>
          <TouchableOpacity onPress={handleReply} style={styles.actionBtn}>
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, styles.deleteBtn]}>
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Subject */}
        <Text style={styles.subject}>{message.subject || '(no subject)'}</Text>

        {/* Category badge */}
        {message.category && badgeColor && (
          <View style={[styles.badge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{message.category}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metaCard}>
          <MetaRow label="From" value={message.from_addr} />
          <MetaRow label="To" value={message.to_addr} />
          <MetaRow label="Date" value={message.received_at} />
        </View>

        {/* Body */}
        <View style={styles.bodyCard}>
          <Text style={styles.bodyText}>{message.body || '(empty message)'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: {
    backgroundColor: '#fff',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: '#1a73e8', fontSize: 16 },
  toolbarActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f0f4f8',
  },
  deleteBtn: { backgroundColor: '#fde8e8' },
  actionText: { color: '#1a73e8', fontWeight: '600', fontSize: 13 },
  deleteText: { color: '#ea4335' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  subject: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 30,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaLabel: { width: 44, fontSize: 13, color: '#999', fontWeight: '600' },
  metaValue: { flex: 1, fontSize: 13, color: '#333' },
  bodyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bodyText: { fontSize: 15, color: '#333', lineHeight: 24 },
});
