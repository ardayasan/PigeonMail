/**
 * src/screens/InboxScreen.tsx
 * Main inbox with category filter tabs and pull-to-refresh.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCategories, getMessages, MessageSummary } from '../api/client';
import CategoryFilter from '../components/CategoryFilter';
import MessageItem from '../components/MessageItem';
import { useAuth } from '../context/AuthContext';

export default function InboxScreen({ navigation }: any) {
  const { username, signOut } = useAuth();
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [msgs, cats] = await Promise.all([
        getMessages(selectedCategory ?? undefined),
        getCategories(),
      ]);
      setMessages(msgs);
      setCategories(cats);
    } catch (e) {
      console.error('Inbox fetch error:', e);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Re-fetch when returning from Compose or MessageDetail
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, [navigation, fetchData]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inbox</Text>
          <Text style={styles.headerSub}>{username}@localhost</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <CategoryFilter
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Message list */}
      {loading ? (
        <ActivityIndicator style={styles.spinner} size="large" color="#1a73e8" />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No messages</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              onPress={() => navigation.navigate('Message', { id: item.id })}
            />
          )}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}

      {/* FAB — compose */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Compose')}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#fff',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  headerSub: { fontSize: 13, color: '#777', marginTop: 2 },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f4f8',
  },
  signOutText: { color: '#1a73e8', fontWeight: '600', fontSize: 13 },
  spinner: { marginTop: 60 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#999' },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1a73e8',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabIcon: { fontSize: 22 },
});
