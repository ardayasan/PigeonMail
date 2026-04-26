/**
 * src/screens/LoginScreen.tsx
 * Redesigned to match Velox Mail web auth-screen.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Colors, Radii, Shadows, Spacing, Typography } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await login(username.trim(), password.trim());
      await signIn(res.token, res.username);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        {/* Dark header */}
        <View style={styles.cardHeader}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>✉️</Text>
          </View>
          <Text style={styles.cardTitle}>Pigeon Mail</Text>
          <Text style={styles.cardSub}>Sign in to continue</Text>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. alice"
              placeholderTextColor={Colors.text3}
              autoCapitalize="none"
              autoComplete="username"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="••••••••"
              placeholderTextColor={Colors.text3}
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.switchLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  /* Dark header area */
  cardHeader: {
    backgroundColor: Colors.text1,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  logoEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textInv,
    letterSpacing: -0.6,
    marginBottom: Spacing.xs,
  },
  cardSub: {
    fontSize: Typography.base,
    color: Colors.darkTextDim,
  },
  /* Body */
  cardBody: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  errorBox: {
    backgroundColor: Colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.danger,
  },
  field: {
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.text2,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  fieldInput: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    fontSize: Typography.md,
    color: Colors.text1,
    backgroundColor: Colors.surfaceSoft,
  },
  submitBtn: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: Colors.accent,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: Colors.textInv,
    fontWeight: '600',
    fontSize: Typography.md,
    letterSpacing: -0.1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  switchText: {
    fontSize: Typography.sm,
    color: Colors.text3,
  },
  switchLink: {
    fontSize: Typography.sm,
    color: Colors.accent,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
