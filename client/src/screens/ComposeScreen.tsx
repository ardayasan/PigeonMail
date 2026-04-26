/**
 * src/screens/ComposeScreen.tsx
 * Compose / reply screen redesigned to match Velox Mail web compose-window.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { sendMessage } from '../api/client';
import { useMailbox } from '../context/MailboxContext';
import { Colors, Radii, Spacing, Typography } from '../theme';

export default function ComposeScreen({ route, navigation }: any) {
  const { syncMailboxMeta, triggerRefresh } = useMailbox();
  const prefill = route.params ?? {};
  const [to, setTo] = useState<string>(prefill.to ?? '');
  const [subject, setSubject] = useState<string>(prefill.subject ?? '');
  const [body, setBody] = useState<string>('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim()) {
      Alert.alert('Error', 'Please enter a recipient.');
      return;
    }
    setSending(true);
    try {
      await sendMessage(to.trim().toLowerCase(), subject.trim(), body.trim());
      await syncMailboxMeta();
      triggerRefresh();
      Alert.alert('Sent', 'Your message has been delivered.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Send Failed', e.message ?? 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Dark title bar */}
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>New Message</Text>
        <View style={styles.titleBarActions}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.titleBarBtn}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Text style={styles.titleBarBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* To field */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>To</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="recipient@localhost"
            placeholderTextColor={Colors.text3}
            autoCapitalize="none"
            keyboardType="email-address"
            value={to}
            onChangeText={setTo}
          />
        </View>

        {/* Subject field */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="(no subject)"
            placeholderTextColor={Colors.text3}
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        {/* Body */}
        <View style={styles.bodyArea}>
          <TextInput
            style={styles.bodyInput}
            placeholder="Write your message…"
            placeholderTextColor={Colors.text3}
            multiline
            value={body}
            onChangeText={setBody}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending || !to.trim()}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator
              color="#fff"
              size="small"
            />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.discardBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.discardBtnText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  /* Dark title bar */
  titleBar: {
    backgroundColor: Colors.text1,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textInv,
    letterSpacing: -0.1,
  },
  titleBarActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  titleBarBtn: {
    width: 24,
    height: 24,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBarBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: Typography.base,
  },
  /* Fields */
  scroll: {
    flex: 1,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLabel: {
    width: 50,
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.text3,
  },
  fieldInput: {
    flex: 1,
    fontSize: Typography.md,
    color: Colors.text1,
  },
  /* Body */
  bodyArea: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    flex: 1,
  },
  bodyInput: {
    fontSize: Typography.md,
    color: Colors.text1,
    minHeight: 300,
    lineHeight: 23,
  },
  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceSoft,
  },
  sendBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: Colors.accent,
    borderRadius: Radii.md,
    alignItems: 'center',
    minWidth: 64,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: Colors.textInv,
    fontWeight: '600',
    fontSize: Typography.base,
    letterSpacing: -0.1,
  },
  discardBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
  },
  discardBtnText: {
    color: Colors.text3,
    fontWeight: '500',
    fontSize: Typography.base,
  },
});
