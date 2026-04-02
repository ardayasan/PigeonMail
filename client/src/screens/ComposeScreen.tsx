/**
 * src/screens/ComposeScreen.tsx
 * Compose and send a new email (or reply pre-filled from MessageScreen).
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { sendMessage } from '../api/client';

export default function ComposeScreen({ route, navigation }: any) {
  // Pre-filled when replying
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={sending}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>New Message</Text>
        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* To */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>To</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="recipient@localhost"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            keyboardType="email-address"
            value={to}
            onChangeText={setTo}
          />
        </View>

        {/* Subject */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="(no subject)"
            placeholderTextColor="#bbb"
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        {/* Body */}
        <TextInput
          style={styles.bodyInput}
          placeholder="Write your message here…"
          placeholderTextColor="#bbb"
          multiline
          value={body}
          onChangeText={setBody}
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  toolbar: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  toolbarTitle: { fontWeight: '600', fontSize: 16, color: '#1a1a1a' },
  cancel: { color: '#1a73e8', fontSize: 16 },
  sendBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scroll: { flex: 1 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldLabel: {
    width: 60,
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
  },
  bodyInput: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    color: '#222',
    minHeight: 300,
    lineHeight: 22,
  },
});
