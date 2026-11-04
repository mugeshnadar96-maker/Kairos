import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Spacing, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import { getDietRecommendation, profileToDietQuery, explainDietRecommendation } from '../services/dietRecommendationService';
import { DietRecommendationResult } from '../data/dietRecommendationDB';

function profileHash(p: UserProfile): string {
  return [p.age, p.gender, p.weightKg, p.heightCm, p.activityLevel, [...p.conditions].sort().join(','), p.allergies.map(a => a.allergen).sort().join(',')].join('|');
}

const REC_LABEL: Record<string, string> = { Balanced: 'Balanced Diet', Low_Carb: 'Low-Carb Focus', Low_Sodium: 'Low-Sodium Focus' };

function DietRecommendationCard({ profile }: { profile: UserProfile }) {
  const [result, setResult] = useState<DietRecommendationResult | null>(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [hash, setHash] = useState('');

  const compute = async (force = false) => {
    const currentHash = profileHash(profile);
    if (!force && currentHash === hash) return;
    setHash(currentHash);
    const query = profileToDietQuery(profile);
    const rec = getDietRecommendation(profile);
    setResult(rec);
    setExplanation('');
    setLoading(true);
    try {
      const text = await explainDietRecommendation(profile, query, rec);
      setExplanation(text);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { compute(); }, [profile.age, profile.gender, profile.weightKg, profile.heightCm, profile.activityLevel, profile.conditions.join(','), profile.allergies.map(a => a.allergen).join(',')]);

  if (!result) return null;

  return (
    <View style={styles.dietRecCard}>
      <View style={styles.dietRecHeader}>
        <View style={styles.dietRecIconWrap}>
          <Ionicons name="nutrition" size={18} color={Colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dietRecTitle}>{REC_LABEL[result.recommendation] || result.recommendation}</Text>
          <Text style={styles.dietRecSubtitle}>Based on {result.matchCount} similar reference profiles · {Math.round(result.confidence * 100)}% agreement</Text>
        </View>
        <TouchableOpacity onPress={() => compute(true)} style={styles.dietRecRefreshBtn}>
          <Ionicons name="refresh" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.dietRecLoadingRow}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.dietRecLoadingText}>Generating explanation...</Text>
        </View>
      ) : (
        <Text style={styles.dietRecExplanation}>{explanation}</Text>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

function MacroCard({
  label, current, total, color, icon, unit,
}: {
  label: string; current: number; total: number; color: string; icon: string; unit: string;
}) {
  const remaining = Math.max(0, total - current);
  const pct = Math.min(1, current / total);

  return (
    <View style={[styles.macroCard, { borderColor: `${color}20` }]}>
      <View style={[styles.macroIconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={[styles.macroNumber, { color }]}>{remaining}</Text>
      <Text style={styles.macroUnit}>{unit} left</Text>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroSubtext}>{current} / {total}</Text>
    </View>
  );
}

const QUICK_ADD_ML = [250, 500];

export default function HomeScreen({ navigation }: any) {
  const {
    profile, todayMeals, budget, refreshMeals, deleteMeal, themeMode, toggleTheme,
    riskAssessments, hydrationToday, refreshHydration, logWater,
  } = useApp();
  styles = createStyles();
  const isCheatDay = profile.cheatDayEnabled;
  const accentColor = isCheatDay ? Colors.amber : Colors.accent;

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { refreshMeals(); refreshHydration(); });
    return unsub;
  }, [navigation, refreshMeals, refreshHydration]);

  const assessmentList = Object.values(riskAssessments);
  const allergyAlerts = assessmentList.filter(a => a.allergens.length > 0).length;
  const dietaryAlerts = assessmentList.filter(a => a.riskFactors.some(f => f.category === 'dietary_preference')).length;
  const verificationNeeded = assessmentList.filter(a => a.recommendedVerification.length > 0).length;
  const hydrationPct = Math.min(1, hydrationToday / Math.max(1, profile.hydrationTargetMl));

  const handleDeleteMeal = (id: string, name: string) => {
    Alert.alert('Remove Meal', `Remove ${name} from today's log?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMeal(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {isCheatDay ? '🍕 Cheat Day Active' : '👋 Hey there!'}
            </Text>
            <Text style={styles.title}>
              {isCheatDay ? 'Damage Control Mode' : "Today's Budget"}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.themeToggle}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <Ionicons name={themeMode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={18} color={Colors.textPrimary} />
              <Text style={styles.themeToggleText}>{themeMode === 'dark' ? 'Dark' : 'Light'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('History')}
            >
              <Ionicons name="time" size={26} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="settings" size={26} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cheat Day Banner */}
        {isCheatDay && (
          <View style={styles.cheatBanner}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <Text style={styles.cheatBannerText}>
              Limits relaxed — finding least damaging options
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
            onPress={() => navigation.navigate('Scanner', { scanType: 'menu' })}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="document-text" size={24} color={Colors.bg} />
            </View>
            <Text style={styles.actionBtnTitle}>Scan Menu</Text>
            <Text style={styles.actionBtnSub}>Analyze full menu</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.accentBorder }]}
            onPress={() => navigation.navigate('Scanner', { scanType: 'dish' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.accentBg }]}>
              <Ionicons name="restaurant" size={24} color={Colors.accent} />
            </View>
            <Text style={[styles.actionBtnTitle, { color: Colors.textPrimary }]}>Scan Dish</Text>
            <Text style={styles.actionBtnSub}>Identify food & macros</Text>
          </TouchableOpacity>
        </View>

        {/* Cook at Home */}
        <TouchableOpacity style={styles.cookAtHomeCard} onPress={() => navigation.navigate('CookAtHome')} activeOpacity={0.8}>
          <View style={styles.cookAtHomeIconWrap}>
            <Ionicons name="flame" size={22} color={Colors.amber} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cookAtHomeTitle}>Cook at Home</Text>
            <Text style={styles.cookAtHomeSub}>Search recipes — flagged ingredients get an alternative or a risk tag</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Macro Cards */}
        <View style={styles.macroRow}>
          <MacroCard
            label="Calories"
            current={todayMeals.reduce((s, m) => s + m.macros.calories, 0)}
            total={profile.dailyCalories}
            color={Colors.macroCalories}
            icon="flame"
            unit="kcal"
          />
          <MacroCard
            label="Protein"
            current={todayMeals.reduce((s, m) => s + m.macros.protein, 0)}
            total={profile.proteinTarget}
            color={Colors.macroProtein}
            icon="barbell"
            unit="g"
          />
          <MacroCard
            label="Carbs"
            current={todayMeals.reduce((s, m) => s + m.macros.carbs, 0)}
            total={profile.carbLimit}
            color={Colors.macroCarbs}
            icon="nutrition"
            unit="g"
          />
          <MacroCard
            label="Fiber"
            current={todayMeals.reduce((s, m) => s + m.macros.fiber || 0, 0)}
            total={profile.fiberLimit || 30}
            color={Colors.goodFit}
            icon="leaf"
            unit="g"
          />
        </View>

        {/* Personalized Diet Recommendation — deterministic lookup, Groq only explains */}
        <DietRecommendationCard profile={profile} />

        {/* Dietary & Allergy Alerts — from the most recent scan's risk assessments */}
        {assessmentList.length > 0 && (allergyAlerts > 0 || dietaryAlerts > 0 || verificationNeeded > 0) && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionLabel}>FROM YOUR LAST SCAN</Text>
            <View style={styles.alertsRow}>
              {allergyAlerts > 0 && (
                <View style={[styles.alertChip, { borderColor: `${Colors.skip}40` }]}>
                  <Ionicons name="alert-circle" size={16} color={Colors.skip} />
                  <Text style={[styles.alertChipValue, { color: Colors.skip }]}>{allergyAlerts}</Text>
                  <Text style={styles.alertChipLabel}>Allergy alert{allergyAlerts !== 1 ? 's' : ''}</Text>
                </View>
              )}
              {dietaryAlerts > 0 && (
                <View style={[styles.alertChip, { borderColor: `${Colors.amber}40` }]}>
                  <Ionicons name="leaf" size={16} color={Colors.amber} />
                  <Text style={[styles.alertChipValue, { color: Colors.amber }]}>{dietaryAlerts}</Text>
                  <Text style={styles.alertChipLabel}>Dietary alert{dietaryAlerts !== 1 ? 's' : ''}</Text>
                </View>
              )}
              {verificationNeeded > 0 && (
                <View style={[styles.alertChip, { borderColor: `${Colors.info}40` }]}>
                  <Ionicons name="help-circle" size={16} color={Colors.info} />
                  <Text style={[styles.alertChipValue, { color: Colors.info }]}>{verificationNeeded}</Text>
                  <Text style={styles.alertChipLabel}>Need verification</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Hydration */}
        <View style={styles.hydrationCard}>
          <View style={styles.hydrationHeader}>
            <View style={styles.hydrationTitleRow}>
              <Ionicons name="water" size={18} color={Colors.info} />
              <Text style={styles.hydrationTitle}>Hydration</Text>
            </View>
            <Text style={styles.hydrationValue}>{(hydrationToday / 1000).toFixed(2)}L / {(profile.hydrationTargetMl / 1000).toFixed(1)}L</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${hydrationPct * 100}%`, backgroundColor: Colors.info }]} />
          </View>
          <View style={styles.hydrationQuickAddRow}>
            {QUICK_ADD_ML.map(ml => (
              <TouchableOpacity key={ml} style={styles.hydrationQuickAddBtn} onPress={() => logWater(ml)} activeOpacity={0.7}>
                <Ionicons name="add" size={14} color={Colors.info} />
                <Text style={styles.hydrationQuickAddText}>{ml}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meals Logged Today */}
        <View style={styles.mealsSection}>
          <Text style={styles.sectionLabel}>
            MEALS LOGGED TODAY ({todayMeals.length})
          </Text>
          {todayMeals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="restaurant-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No meals logged yet</Text>
              <Text style={styles.emptySubtext}>
                Scan a menu to get started
              </Text>
            </View>
          ) : (
            todayMeals.map(meal => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealLeft}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <View style={styles.mealMacroRow}>
                    <Text style={[styles.mealMacro, { color: Colors.macroCalories }]}>
                      {meal.macros.calories} kcal
                    </Text>
                    <Text style={styles.macroDot}>·</Text>
                    <Text style={[styles.mealMacro, { color: Colors.macroProtein }]}>
                      {meal.macros.protein}g P
                    </Text>
                    <Text style={styles.macroDot}>·</Text>
                    <Text style={[styles.mealMacro, { color: Colors.macroCarbs }]}>
                      {meal.macros.carbs}g C
                    </Text>
                    <Text style={styles.macroDot}>·</Text>
                    <Text style={[styles.mealMacro, { color: Colors.macroFat }]}>
                      {meal.macros.fat}g F
                    </Text>
                    <Text style={styles.macroDot}>·</Text>
                    <Text style={[styles.mealMacro, { color: Colors.goodFit }]}>
                      {meal.macros.fiber || 0}g Fib
                    </Text>
                  </View>
                  {meal.restaurantName && (
                    <Text style={styles.mealRestaurant}>📍 {meal.restaurantName}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteMeal(meal.id, meal.name)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 4 },
  title: { ...Typography.h2, color: Colors.textPrimary },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  themeToggleText: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600' },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  profileBtn: { padding: 4 },
  cheatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.amberBg,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: 16,
  },
  cheatBannerText: { ...Typography.bodySm, color: Colors.amber, flex: 1 },
  
  // Quick Actions
  actionsContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, padding: 16, borderRadius: BorderRadius.xl, alignItems: 'flex-start' },
  actionIconWrap: { padding: 10, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  actionBtnTitle: { ...Typography.bodyMedium, color: Colors.bg, fontWeight: '700', marginBottom: 2 },
  actionBtnSub: { ...Typography.caption, color: Colors.textMuted },
  cookAtHomeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.amberBorder, padding: 16, marginBottom: 20 },
  cookAtHomeIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.amberBg, alignItems: 'center', justifyContent: 'center' },
  cookAtHomeTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  cookAtHomeSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  macroRow: { flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  macroCard: {
    width: '48%',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  macroIconBg: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  macroLabel: { ...Typography.caption, color: Colors.textSecondary },
  macroNumber: { ...Typography.number, color: Colors.textPrimary },
  macroUnit: { ...Typography.caption, color: Colors.textMuted },
  progressBg: {
    width: '100%', height: 4, borderRadius: 2,
    backgroundColor: Colors.bgInput, marginTop: 4,
  },
  progressFill: { height: 4, borderRadius: 2 },
  macroSubtext: { ...Typography.caption, color: Colors.textMuted, fontSize: 10 },
  mealsSection: { marginTop: 24 },
  sectionLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: 12 },
  emptyCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textSecondary },
  emptySubtext: { ...Typography.caption, color: Colors.textMuted },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
  },
  mealLeft: { flex: 1 },
  mealName: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 4 },
  mealMacroRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  mealMacro: { ...Typography.caption, fontSize: 11 },
  macroDot: { color: Colors.textMuted, marginHorizontal: 4, fontSize: 10 },
  mealRestaurant: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
  deleteBtn: { padding: 4 },

  dietRecCard: { marginTop: 20, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.accentBorder, padding: 16 },
  dietRecHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dietRecIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  dietRecTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, fontWeight: '700' },
  dietRecSubtitle: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  dietRecRefreshBtn: { padding: 6 },
  dietRecLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dietRecLoadingText: { ...Typography.caption, color: Colors.textMuted },
  dietRecExplanation: { ...Typography.bodySm, color: Colors.textSecondary, marginTop: 12, lineHeight: 20 },
  alertsSection: { marginTop: 24 },
  alertsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  alertChipValue: { ...Typography.bodyMedium, fontWeight: '700' },
  alertChipLabel: { ...Typography.caption, color: Colors.textSecondary },

  hydrationCard: { marginTop: 24, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  hydrationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  hydrationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hydrationTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  hydrationValue: { ...Typography.bodySm, color: Colors.info, fontWeight: '700' },
  hydrationQuickAddRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  hydrationQuickAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.info}15`, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: `${Colors.info}30`, paddingHorizontal: 12, paddingVertical: 6 },
  hydrationQuickAddText: { ...Typography.caption, color: Colors.info, fontWeight: '700' },
});

let styles = createStyles();
