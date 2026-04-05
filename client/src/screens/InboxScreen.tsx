/**
 * src/screens/InboxScreen.tsx
 * Main inbox — reads mailbox/category from MailboxContext so the
 * drawer sidebar stays in sync. Header has a menu button to open the drawer.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCategories, getMessages, MessageSummary } from '../api/client';
import CategoryFilter from '../components/CategoryFilter';
import MessageItem from '../components/MessageItem';
import { useMailbox } from '../context/MailboxContext';
import { Colors, Radii, Shadows, Spacing, Typography } from '../theme';

const MAILBOX_LABELS: Record<string, string> = {
  inbox: 'Inbox', sent: 'Sent', starred: 'Starred', spam: 'Spam', trash: 'Trash',
};

export default function InboxScreen({ navigation }: any) {
  const { activeMailbox, activeCategory, setCategory, setInboxCount } = useMailbox();
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [msgs, cats] = await Promise.all([
        getMessages(activeMailbox, activeCategory ?? undefined),
        getCategories(),
      ]);
      setMessages(msgs);
      setCategories(cats);
      // Update inbox count for the drawer badge
      const unread = msgs.filter((m: any) => !m.is_read).length;
      setInboxCount(unread > 0 ? unread : msgs.length);
    } catch (e) {
      console.error('Inbox fetch error:', e);
    }
  }, [activeMailbox, activeCategory, setInboxCount]);

  useEffect(() => {
    setSearch('');
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

  /* Local search filter */
  const filtered = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.from.toLowerCase().includes(q) ||
      (m.subject ?? '').toLowerCase().includes(q)
    );
  });

  const title = activeCategory ?? MAILBOX_LABELS[activeMailbox] ?? 'Inbox';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {/* Hamburger / drawer toggle */}
            <TouchableOpacity
              onPress={() => (navigation as any).openDrawer()}
              style={styles.menuBtn}
              activeOpacity={0.7}
            >
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </TouchableOpacity>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>{title}</Text>
              {!loading && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{filtered.length}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Compose shortcut */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Compose')}
            style={styles.composeBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.composeBtnText}>Compose</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages…"
            placeholderTextColor={Colors.text3}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
              <Text style={styles.searchClearText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category tabs — only show in inbox when no category filter active */}
      {activeMailbox === 'inbox' && !activeCategory && (
        <CategoryFilter
          categories={categories}
          selected={null}
          onSelect={(cat) => {
            if (cat) setCategory(cat);
          }}
        />
      )}

      {/* Message list */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>
            {search ? 'No results found' : 'All clear'}
          </Text>
          <Text style={styles.emptySub}>
            {search
              ? `No messages match "${search}"`
              : `No messages in ${title}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              onPress={() => navigation.navigate('Message', { id: item.id })}
            />
          )}
          onRefresh={onRefresh}
          refreshing={refreshing}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  /* Header */
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 56,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  /* Hamburger */
  menuBtn: {
    gap: 4,
    padding: 4,
    justifyContent: 'center',
  },
  menuLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.text1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.text1,
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  countText: {
    fontSize: Typography.sm,
    color: Colors.text3,
    fontWeight: '500',
  },
  /* Compose shortcut */
  composeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeBtnText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textInv,
    letterSpacing: -0.1,
  },
  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    fontSize: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.text1,
  },
  searchClear: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: Colors.textInv,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  /* List */
  list: {
    flex: 1,
  },
  /* Loading */
  loadingCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.base,
    color: Colors.text3,
  },
  /* Empty */
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing['3xl'],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: Typography.md,
    fontWeight: '600',
    color: Colors.text2,
  },
  emptySub: {
    fontSize: Typography.base,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 20,
  },
});
