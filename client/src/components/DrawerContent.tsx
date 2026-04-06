/**
 * src/components/DrawerContent.tsx
 * Mobile sidebar drawer — mirrors the web Velox Mail sidebar design.
 *
 * Sections:
 *  •  Logo + app name
 *  •  Compose button
 *  •  Mailbox items: Inbox, Sent, Starred, Spam, Trash
 *  •  Divider
 *  •  Category labels (dynamic)
 *  •  Divider
 *  •  User footer with username + sign-out
 */

import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import Svg, { Path, Circle, Line, Polygon, Polyline } from 'react-native-svg';
import { getCategories } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Colors, CATEGORY_COLORS, Spacing, Typography, Radii } from '../theme';

/* ── SVG Icon Components ── */
const InboxIcon = ({ size = 20, color = Colors.text2 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
    <Path d="M22 12h-6l-2 3H10l-2-3H2"/>
    <Path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </Svg>
);

const SentIcon = ({ size = 20, color = Colors.text2 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
    <Line x1="22" y1="2" x2="11" y2="13"/>
    <Polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </Svg>
);

const StarredIcon = ({ size = 20, color = Colors.text2 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
    <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </Svg>
);

const SpamIcon = ({ size = 20, color = Colors.text2 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10"/>
    <Line x1="12" y1="8" x2="12" y2="12"/>
    <Line x1="12" y1="16" x2="12.01" y2="16"/>
  </Svg>
);

const TrashIcon = ({ size = 20, color = Colors.text2 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
    <Polyline points="3 6 5 6 21 6"/>
    <Path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <Path d="M10 11v6M14 11v6"/>
    <Path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </Svg>
);

const SignOutIcon = ({ size = 14, color = Colors.text2 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <Polyline points="16 17 21 12 16 7"/>
    <Line x1="21" y1="12" x2="9" y2="12"/>
  </Svg>
);

/* ── Mailbox Configuration ── */
const MAILBOXES = [
  { id: 'inbox',   label: 'Inbox',   icon: InboxIcon },
  { id: 'sent',    label: 'Sent',    icon: SentIcon },
  { id: 'starred', label: 'Starred', icon: StarredIcon },
  { id: 'spam',    label: 'Spam',    icon: SpamIcon },
  { id: 'trash',   label: 'Trash',   icon: TrashIcon },
] as const;

type MailboxId = typeof MAILBOXES[number]['id'];

interface Props extends DrawerContentComponentProps {
  /** Currently active mailbox. Passed from parent so sidebar stays in sync. */
  activeMailbox: MailboxId;
  activeCategory: string | null;
  inboxCount: number;
  onSelectMailbox: (id: MailboxId) => void;
  onSelectCategory: (cat: string) => void;
}

export default function DrawerContent({
  navigation,
  activeMailbox,
  activeCategory,
  inboxCount,
  onSelectMailbox,
  onSelectCategory,
}: Props) {
  const { username, signOut } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleMailbox = (id: MailboxId) => {
    onSelectMailbox(id);
    navigation.closeDrawer();
  };

  const handleCategory = (cat: string) => {
    onSelectCategory(cat);
    navigation.closeDrawer();
  };

  const initial = (username ?? '?')[0].toUpperCase();

  return (
    <View style={styles.root}>
      {/* ── Logo ── */}
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>✉️</Text>
        </View>
        <Text style={styles.logoName}>Pigeon Mail</Text>
      </View>

      {/* ── Navigation items ── */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Mailboxes */}
        {MAILBOXES.map((mb) => {
          const isActive = activeMailbox === mb.id && !activeCategory;
          const IconComponent = mb.icon;
          return (
            <TouchableOpacity
              key={mb.id}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => handleMailbox(mb.id)}
              activeOpacity={0.7}
            >
              <IconComponent size={20} color={isActive ? Colors.accent : Colors.text2} />
              <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                {mb.label}
              </Text>
              {mb.id === 'inbox' && inboxCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {inboxCount > 99 ? '99+' : inboxCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Divider */}
        {categories.length > 0 && <View style={styles.divider} />}

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Labels</Text>
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              const dotColor = CATEGORY_COLORS[cat] ?? Colors.text3;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.item, isActive && styles.itemActive]}
                  onPress={() => handleCategory(cat)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catDot, { backgroundColor: dotColor }]} />
                  <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.divider} />
          </>
        )}
      </ScrollView>

      {/* ── User footer ── */}
      <View style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{username}</Text>
          <Text style={styles.userDomain} numberOfLines={1}>{username}@localhost</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.7} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <SignOutIcon size={14} color={Colors.darkTextDim} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },

  /* Logo */
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: Spacing.md,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 14,
  },
  logoName: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.textInv,
    letterSpacing: -0.3,
    marginLeft: Spacing.sm,
  },

  /* Sign out button */
  signOutBtn: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll / nav area */
  scrollArea: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },

  /* Mailbox / category items */
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 7,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: Colors.darkActiveBg,
  },
  itemLabel: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: '400',
    color: Colors.darkText,
  },
  itemLabelActive: {
    color: Colors.darkActiveText,
    fontWeight: '600',
  },

  /* Inbox badge */
  badge: {
    backgroundColor: Colors.badgeBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.badgeText,
  },

  /* Category dot */
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  /* Section label */
  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.darkTextDim,
    letterSpacing: 0.06 * Typography.xs,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: Colors.darkBorder,
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.sm,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.darkBorder,
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.md,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textInv,
  },
  userInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  userName: {
    fontSize: Typography.base,
    fontWeight: '500',
    color: Colors.textInv,
  },
  userDomain: {
    fontSize: Typography.xs,
    color: Colors.darkTextDim,
  },
});
