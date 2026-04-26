/**
 * src/context/MailboxContext.tsx
 * Shared mailbox + category state so drawer and inbox stay in sync.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getCategories, getStats } from '../api/client';

export type MailboxId = 'inbox' | 'sent' | 'starred' | 'spam' | 'trash';

interface MailboxState {
  activeMailbox: MailboxId;
  activeCategory: string | null;
  categories: string[];
  inboxCount: number;
  refreshKey: number;
  setMailbox: (id: MailboxId) => void;
  setCategory: (cat: string | null) => void;
  setInboxCount: (n: number) => void;
  setCategories: (cats: string[]) => void;
  triggerRefresh: () => void;
  syncMailboxMeta: () => Promise<void>;
}

const MailboxContext = createContext<MailboxState>({
  activeMailbox: 'inbox',
  activeCategory: null,
  categories: [],
  inboxCount: 0,
  refreshKey: 0,
  setMailbox: () => {},
  setCategory: () => {},
  setInboxCount: () => {},
  setCategories: () => {},
  triggerRefresh: () => {},
  syncMailboxMeta: async () => {},
});

export function MailboxProvider({ children }: { children: React.ReactNode }) {
  const [activeMailbox, setActiveMailbox] = useState<MailboxId>('inbox');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const setMailbox = useCallback((id: MailboxId) => {
    setActiveMailbox(id);
    setActiveCategory(null);
  }, []);

  const setCategory = useCallback((cat: string | null) => {
    setActiveCategory(cat);
    if (cat !== null) setActiveMailbox('inbox');
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const syncMailboxMeta = useCallback(async () => {
    try {
      const [cats, stats] = await Promise.all([getCategories(), getStats()]);
      setCategories(cats);
      setInboxCount(stats.inbox);
    } catch {
      // Keep the last successful snapshot.
    }
  }, []);

  const value = useMemo(
    () => ({
      activeMailbox,
      activeCategory,
      categories,
      inboxCount,
      refreshKey,
      setMailbox,
      setCategory,
      setInboxCount,
      setCategories,
      triggerRefresh,
      syncMailboxMeta,
    }),
    [
      activeMailbox,
      activeCategory,
      categories,
      inboxCount,
      refreshKey,
      setMailbox,
      setCategory,
      triggerRefresh,
      syncMailboxMeta,
    ],
  );

  return (
    <MailboxContext.Provider
      value={value}
    >
      {children}
    </MailboxContext.Provider>
  );
}

export function useMailbox() {
  return useContext(MailboxContext);
}
