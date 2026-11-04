import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';

export default function AuthScreen() {
  const { login, themeMode } = useApp();
  styles = createStyles();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter a username and password');
      return;
    }
    await login(username.trim(), password.trim(), isLogin);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={Colors.bg}
      />
      
      <View style={styles.card}>
        <Text style={styles.logo}>Kairo<Text style={{color: Colors.accent}}>AI</Text></Text>
        <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Log in to track your macros' : 'Sign up to start your health journey'}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput 
            style={styles.input}
            placeholder="johndoe"
            placeholderTextColor={Colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleAuth} activeOpacity={0.8}>
          <Text style={styles.btnText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toggleBtn} 
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logo: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnText: {
    ...Typography.bodyMedium,
    color: Colors.bg,
    fontWeight: '700',
  },
  toggleBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    ...Typography.caption,
    color: Colors.accent,
  },
});

let styles = createStyles();
