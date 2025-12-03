import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { UserAuth } from '../context/AuthContext';

const VerifyEmailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { session, resendVerification, signOutUser } = UserAuth();
  const fallbackEmail = useMemo(
    () => route.params?.email || session?.user?.email || '',
    [route.params?.email, session?.user?.email],
  );
  const [email] = useState(fallbackEmail);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    setStatus('');
    setError('');
    setSending(true);
    const { success, error: err } = await resendVerification(email);
    if (!success) setError(err || 'Could not resend verification email');
    else setStatus('Verification email sent. Check your inbox.');
    setSending(false);
  };

  const handleSignOut = async () => {
    await signOutUser();
    navigation.navigate('Signin');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Please verify your 5C email</Text>
        <Text style={styles.label}>We sent a verification link to:</Text>
        <Text style={styles.email}>{email || 'your 5C email'}</Text>
        <Text style={styles.hint}>Click the link in that email to finish creating your account.</Text>
        {status ? <Text style={styles.status}>{status}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, (!email || sending) && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={!email || sending}
        >
          <Text style={styles.buttonText}>{sending ? 'Sending…' : 'Resend verification email'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={handleSignOut}>
          <Text style={styles.secondaryText}>Use a different email</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    color: '#4b5563',
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  hint: {
    color: '#6b7280',
  },
  status: {
    color: '#0ea5e9',
  },
  error: {
    color: '#b91c1c',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    color: '#2563eb',
    fontWeight: '600',
  },
});

export default VerifyEmailScreen;
