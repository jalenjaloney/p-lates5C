import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { UserAuth } from '@/src/context/AuthContext';

export default function SigninScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signInUser, resendVerification, session } = UserAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [errorText, setErrorText] = useState('');
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session, router]);

  const handleSignin = async () => {
    setStatus('');
    setErrorText('');
    setShowResend(false);
    if (!email || !password) {
      setErrorText('Please enter email and password.');
      return;
    }

    setLoading(true);
    const { success, error } = await signInUser(email, password);
    setLoading(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      const message = error || 'Invalid credentials';
      const lowered = message.toLowerCase();
      const needsConfirm = lowered.includes('confirm') || lowered.includes('verification');
      setErrorText(message);
      setShowResend(needsConfirm);
    }
  };

  const handleResend = async () => {
    setStatus('');
    setErrorText('');
    if (!email) {
      setErrorText('Enter your email above to resend verification.');
      return;
    }
    const { success, error } = await resendVerification(email);
    if (success) {
      setStatus('Verification email sent.');
    } else {
      setErrorText(error || 'Could not resend verification email.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: tokens.font.display }]}>
          Sign In
        </Text>
        <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
          Welcome back to plates5C
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.ink,
              fontFamily: tokens.font.body,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={colors.inkMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.ink,
              fontFamily: tokens.font.body,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={colors.inkMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleSignin}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { fontFamily: tokens.font.bodySemibold }]}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {showResend && (
          <TouchableOpacity onPress={handleResend} disabled={loading}>
            <Text style={[styles.link, { color: colors.accent, fontFamily: tokens.font.body }]}>
              Resend verification email
            </Text>
          </TouchableOpacity>
        )}

        {status ? (
          <Text style={[styles.status, { color: colors.accent, fontFamily: tokens.font.body }]}>
            {status}
          </Text>
        ) : null}
        {errorText ? (
          <Text style={[styles.error, { color: colors.error, fontFamily: tokens.font.body }]}>
            {errorText}
          </Text>
        ) : null}

        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={[styles.link, { color: colors.accent, fontFamily: tokens.font.body }]}>
            Don't have an account? Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: tokens.space.xl,
    justifyContent: 'center',
    gap: tokens.space.md,
  },
  title: {
    fontSize: tokens.fontSize.hero,
    fontWeight: '700',
    marginBottom: tokens.space.xs,
  },
  subtitle: {
    fontSize: tokens.fontSize.body,
    marginBottom: tokens.space.lg,
  },
  input: {
    height: 48,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.fontSize.body,
  },
  button: {
    height: 48,
    borderRadius: tokens.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: tokens.space.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontWeight: '600',
    letterSpacing: tokens.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  link: {
    textAlign: 'center',
    marginTop: tokens.space.md,
    fontSize: tokens.fontSize.caption,
  },
  status: {
    textAlign: 'center',
    marginTop: tokens.space.sm,
    fontSize: tokens.fontSize.caption,
  },
  error: {
    textAlign: 'center',
    marginTop: tokens.space.sm,
    fontSize: tokens.fontSize.caption,
  },
});
