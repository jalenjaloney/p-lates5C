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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { UserAuth } from '@/src/context/AuthContext';

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signUpNewUser, resendVerification, session } = UserAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session, router]);

  const handleSignup = async () => {
    setStatus('');
    setErrorText('');
    if (!email || !password || !confirmPassword) {
      setErrorText('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorText('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorText('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { success, error, data } = await signUpNewUser(email, password);
    setLoading(false);

    if (success) {
      if (data?.session) {
        router.replace('/(tabs)');
      } else {
        setStatus('Account created. Check your email to verify your account.');
      }
    } else {
      setErrorText(error || 'Could not create account.');
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.ink, fontFamily: tokens.font.display }]}>
            Sign Up
          </Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
            Join the plates5C community
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
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.inkMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
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
            placeholder="Confirm Password"
            placeholderTextColor={colors.inkMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password-new"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { fontFamily: tokens.font.bodySemibold }]}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

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

          {status ? (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={[styles.link, { color: colors.accent, fontFamily: tokens.font.body }]}>
                Resend verification email
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.link, { color: colors.accent, fontFamily: tokens.font.body }]}>
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
