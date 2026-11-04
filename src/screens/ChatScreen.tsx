import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { localChatResponse } from '../services/localChatService';
import { ChatMessage } from '../types';

const QUICK_REPLIES = [
  'Which has the most protein?',
  'Why was this flagged?',
  'What don\'t we know?',
  'What should I verify?',
  'How can I modify this?',
  'Can I eat two dishes?',
  'Lowest calorie option?',
];

export default function ChatScreen({ navigation }: any) {
  const { dishesWithMacros, budget, profile, themeMode, riskAssessments } = useApp();
  styles = createStyles();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const greeting: ChatMessage = {
      id: 'greeting',
      role: 'assistant',
      content: `I have ${dishesWithMacros.length} dishes loaded with full nutrition info. You have ${budget.calories} kcal and ${budget.protein}g protein remaining today. Ask me anything! 🍽️`,
      timestamp: Date.now(),
    };
    setMessages([greeting]);
  }, []);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    // Get local response instantly (no API call)
    const response = localChatResponse(
      text.trim(),
      dishesWithMacros,
      budget,
      profile.goal,
      riskAssessments
    );

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Menu Assistant</Text>
          <Text style={styles.subtitle}>
            {dishesWithMacros.length} dishes loaded · {budget.calories} kcal left
          </Text>
        </View>
        <View style={styles.offlineBadge}>
          <View style={styles.offlineDot} />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.aiAvatar}>
                <Text style={{ fontSize: 14 }}>🧠</Text>
              </View>
            )}
            <View style={[
              styles.bubbleContent,
              msg.role === 'user' ? styles.userBubbleContent : styles.aiBubbleContent,
            ]}>
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' && styles.userBubbleText,
              ]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Quick Replies */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRepliesContainer}
      >
        {QUICK_REPLIES.map((reply, i) => (
          <TouchableOpacity
            key={i}
            style={styles.quickReply}
            onPress={() => sendMessage(reply)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickReplyText}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about the menu..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="send"
            size={20}
            color={input.trim() ? Colors.bg : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  title: { ...Typography.bodyMedium, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textMuted },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentBg, borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  offlineText: { ...Typography.caption, color: Colors.accent, fontSize: 10 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 20, gap: 12 },
  bubble: { flexDirection: 'row', gap: 8, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiBubble: { alignSelf: 'flex-start' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, marginTop: 2,
  },
  bubbleContent: { borderRadius: BorderRadius.lg, padding: 12, maxWidth: '90%' },
  userBubbleContent: { backgroundColor: Colors.accent },
  aiBubbleContent: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  bubbleText: { ...Typography.bodySm, color: Colors.textPrimary, lineHeight: 20 },
  userBubbleText: { color: Colors.bg },
  quickRepliesContainer: {
    paddingHorizontal: 20, paddingVertical: 8, gap: 8,
  },
  quickReply: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  quickReplyText: { ...Typography.caption, color: Colors.accent },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg,
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: 12,
    color: Colors.textPrimary, ...Typography.bodySm, maxHeight: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.bgInput },
});

let styles = createStyles();
