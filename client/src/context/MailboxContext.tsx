/**
 * src/context/MailboxContext.tsx
 * Shared mailbox + category state so drawer and inbox stay in sync.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';

export type MailboxId = 'inbox' | 'sent' | 'starred' | 'spam' | 'trash';

interface MailboxState {
  activeMailbox: MailboxId;
  activeCategory: string | null;
  inboxCount: number;
  setMailbox: (id: MailboxId) => void;
  setCategory: (cat: string | null) => void;
  setInboxCount: (n: number) => void;
}

const MailboxContext = createContext<MailboxState>({
  activeMailbox: 'inbox',
  activeCategory: null,
  inboxCount: 0,
  setMailbox: () => {},
  setCategory: () => {},
  setInboxCount: () => {},
});

export function MailboxProvider({ children }: { children: React.ReactNode }) {
  const [activeMailbox, setActiveMailbox] = useState<MailboxId>('inbox');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);

  const setMailbox = useCallback((id: MailboxId) => {
    setActiveMailbox(id);
    setActiveCategory(null);
  }, []);

  const setCategory = useCallback((cat: string | null) => {
    setActiveCategory(cat);
    if (cat !== null) setActiveMailbox('inbox');
  }, []);

  return (
    <MailboxContext.Provider
      value={{
        activeMailbox,
        activeCategory,
        inboxCount,
        setMailbox,
        setCategory,
        setInboxCount,
      }}
    >
      {children}
    </MailboxContext.Provider>
  );
}

export function useMailbox() {
  return useContext(MailboxContext);
}
