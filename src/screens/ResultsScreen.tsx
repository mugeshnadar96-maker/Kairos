import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { RankedDish, Verdict } from '../types';
import { RiskAssessment, RiskLevel, RISK_LEVEL_LABEL } from '../types/risk';

const { width } = Dimensions.get('window');

const VERDICT_CONFIG: Record<Verdict, { label: string; emoji: string; color: string; bg: string }> = {
  top_pick: { label: 'Top Pick', emoji: '⭐', color: Colors.topPick, bg: 'rgba(0,230,118,0.1)' },
  good: { label: 'Good Fit', emoji: '👍', color: Colors.goodFit, bg: 'rgba(100,181,246,0.1)' },
  skip: { label: 'Skip', emoji: '⛔', color: Colors.skip, bg: 'rgba(255,82,82,0.1)' },
};

const RISK_CONFIG: Record<RiskLevel, { emoji: string; color: string; bg: string }> = {
  green: { emoji: '✅', color: Colors.topPick, bg: 'rgba(0,230,118,0.1)' },
  yellow: { emoji: '⚠️', color: Colors.amber, bg: Colors.amberBg },
  orange: { emoji: '🟠', color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
  red: { emoji: '🔴', color: Colors.skip, bg: 'rgba(255,82,82,0.1)' },
  grey: { emoji: '❔', color: Colors.textMuted, bg: Colors.bgInput },
};

function PersonalizedAnalysis({ assessment }: { assessment: RiskAssessment }) {
  const [expanded, setExpanded] = useState(assessment.overallStatus === 'red');
  const cfg = RISK_CONFIG[assessment.overallStatus];

  return (
    <View style={[styles.riskContainer, { borderColor: cfg.color + '40' }]}>
      <TouchableOpacity style={styles.riskHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={[styles.riskBadge, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 12 }}>{cfg.emoji}</Text>
          <Text style={[styles.riskBadgeText, { color: cfg.color }]}>PERSONALIZED ANALYSIS · {RISK_LEVEL_LABEL[assessment.overallStatus]}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.riskBody}>
          {assessment.riskFactors.length > 0 && (
            <View style={styles.riskSection}>
              <Text style={styles.riskSectionTitle}>WHY?</Text>
              {assessment.riskFactors.map((f, i) => (
                <View key={f.id || i} style={styles.riskFactorRow}>
                  <View style={[styles.riskDot, { backgroundColor: RISK_CONFIG[f.level].color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riskFactorFactor}>Your profile: {f.userFactor}</Text>
                    <Text style={styles.riskFactorSummary}>{f.summary}</Text>
                    {f.evidence.map((e, j) => (
                      <Text key={j} style={styles.riskEvidence}>Evidence: {e.source} — "{e.evidenceText}" ({e.status.replace('_', ' ')})</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.riskSection}>
            <Text style={styles.riskSectionTitle}>WHAT DON'T WE KNOW?</Text>
            {assessment.unknowns.map((u, i) => (
              <Text key={i} style={styles.riskUnknown}>? {u}</Text>
            ))}
          </View>

          {assessment.recommendedVerification.length > 0 && (
            <View style={styles.riskSection}>
              <Text style={styles.riskSectionTitle}>WHAT SHOULD I VERIFY?</Text>
              {assessment.recommendedVerification.map((v, i) => (
                <Text key={i} style={styles.riskListItem}>• {v}</Text>
              ))}
            </View>
          )}

          {assessment.possibleModifications.length > 0 && (
            <View style={styles.riskSection}>
              <Text style={styles.riskSectionTitle}>POSSIBLE MODIFICATIONS</Text>
              {assessment.possibleModifications.map((m, i) => (
                <Text key={i} style={styles.riskListItem}>• {m}</Text>
              ))}
            </View>
          )}

          {assessment.questionsToAsk.length > 0 && (
            <View style={styles.riskSection}>
              <Text style={styles.riskSectionTitle}>❓ ASK BEFORE YOU EAT</Text>
              {assessment.questionsToAsk.map((q, i) => (
                <Text key={i} style={styles.riskListItem}>• {q}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function MacroBar({ label, value, color, unit }: { label: string; value: number; color: string; unit: string }) {
  const maxWidth = 100;
  const barWidth = Math.min(maxWidth, (value / 600) * maxWidth);
  return (
    <View style={styles.macroBarRow}>
      <Text style={[styles.macroBarLabel, { color }]}>{label}</Text>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: barWidth, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroBarValue}>{value}{unit}</Text>
    </View>
  );
}

function DishCard({ dish, onLog, isCheatDay, assessment, compareMode, compareSelected, onToggleCompare }: {
  dish: RankedDish; onLog: () => void; isCheatDay: boolean; assessment?: RiskAssessment;
  compareMode?: boolean; compareSelected?: boolean; onToggleCompare?: () => void;
}) {
  const verdict = VERDICT_CONFIG[dish.verdict] || VERDICT_CONFIG.good;
  const isTopPick = dish.verdict === 'top_pick';

  return (
    <View style={[
      styles.dishCard,
      isTopPick && {
        borderColor: isCheatDay ? Colors.amberBorder : Colors.accentBorder,
        borderWidth: 1.5,
      },
      compareSelected && { borderColor: Colors.info, borderWidth: 1.5 },
    ]}>
      {/* Header */}
      <View style={styles.dishHeader}>
        <View style={styles.dishNameRow}>
          {compareMode && (
            <TouchableOpacity onPress={onToggleCompare} style={[styles.compareChk, compareSelected && styles.compareChkSel]}>
              {compareSelected && <Ionicons name="checkmark" size={14} color={Colors.bg} />}
            </TouchableOpacity>
          )}
          <Text style={styles.dishName}>{dish.name}</Text>
          <View style={[styles.scoreBadge, { backgroundColor: verdict.bg }]}>
            <Text style={[styles.scoreText, { color: verdict.color }]}>{dish.score}</Text>
          </View>
        </View>
        <View style={[styles.verdictBadge, { backgroundColor: verdict.bg }]}>
          <Text style={{ fontSize: 12 }}>{verdict.emoji}</Text>
          <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.label}</Text>
        </View>
      </View>

      {/* Macro Bars */}
      <View style={styles.macroBars}>
        <MacroBar label="Cal" value={dish.macros.calories} color={Colors.macroCalories} unit="" />
        <MacroBar label="Pro" value={dish.macros.protein} color={Colors.macroProtein} unit="g" />
        <MacroBar label="Crb" value={dish.macros.carbs} color={Colors.macroCarbs} unit="g" />
        <MacroBar label="Fat" value={dish.macros.fat} color={Colors.macroFat} unit="g" />
        <MacroBar label="Fib" value={dish.macros.fiber || 0} color={Colors.goodFit} unit="g" />
      </View>

      {/* AI Reason */}
      <View style={styles.reasonRow}>
        <Text style={styles.reasonTitle}>💡 Why this was selected:</Text>
        <Text style={styles.reasonText}>{dish.reason}</Text>
      </View>

      {/* Customization Tip */}
      {dish.customizationTip && (
        <View style={styles.tipRow}>
          <Ionicons name="create" size={14} color={Colors.amber} />
          <Text style={styles.tipText}>{dish.customizationTip}</Text>
        </View>
      )}

      {/* Warnings (Things to Avoid) */}
      {dish.warnings && dish.warnings.length > 0 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>⚠️ Things to watch out for:</Text>
          {dish.warnings.map((w, idx) => (
            <View key={idx} style={styles.warningItem}>
              <Ionicons name="alert-circle" size={12} color={Colors.skip} />
              <Text style={styles.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Personalized Risk Analysis */}
      {assessment && <PersonalizedAnalysis assessment={assessment} />}

      {/* Match Type Badge */}
      <View style={styles.matchRow}>
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>
            {dish.matchType === 'exact' ? '✅ DB Match' :
             dish.matchType === 'partial' ? '🔍 Partial Match' :
             dish.matchType === 'keyword' ? '🔑 Keyword Match' :
             dish.matchType === 'label_provided' ? '🏷️ From Label' : '🤖 AI Estimated'}
          </Text>
        </View>
      </View>

      {/* Log Button */}
      <TouchableOpacity style={styles.logBtn} onPress={onLog} activeOpacity={0.8}>
        <Ionicons name="add-circle" size={18} color={Colors.bg} />
        <Text style={styles.logBtnText}>Log This Meal</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ResultsScreen({ navigation }: any) {
  const { scannedDishes, profile, budget, addMeal, trackDish, restaurantName, themeMode, riskAssessments } = useApp();
  styles = createStyles();
  const isCheatDay = profile.cheatDayEnabled;
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());

  const toggleCompareSelection = (name: string) => {
    setCompareSelection(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleLog = async (dish: RankedDish) => {
    const assessment = riskAssessments[dish.name];
    const meal = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      name: dish.name,
      macros: dish.macros,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      restaurantName: restaurantName || undefined,
      riskLevel: assessment?.overallStatus,
      riskFactorSummaries: assessment?.riskFactors.map(f => f.summary),
    };
    await addMeal(meal);
    await trackDish(dish.name, true);
    Alert.alert('Logged!', `${dish.name} added to today's meals.`);
  };

  const absoluteTopPick = scannedDishes.length > 0 && scannedDishes[0].score >= 40 ? scannedDishes[0] : null;
  const topPicks = scannedDishes.filter(d => d.verdict === 'top_pick' && d.name !== absoluteTopPick?.name);
  const goodFits = scannedDishes.filter(d => d.verdict === 'good' && d.name !== absoluteTopPick?.name);
  const skips = scannedDishes.filter(d => d.verdict === 'skip' && d.name !== absoluteTopPick?.name);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {isCheatDay ? '🍕 Damage Control' : '🎯 Your Picks'}
            </Text>
            <Text style={styles.subtitle}>
              {scannedDishes.length} dishes analyzed · {budget.calories} kcal remaining
            </Text>
          </View>
          {scannedDishes.length > 1 && (
            <TouchableOpacity
              style={[styles.compareToggleBtn, compareMode && { backgroundColor: Colors.info, borderColor: Colors.info }]}
              onPress={() => { setCompareMode(!compareMode); setCompareSelection(new Set()); }}
            >
              <Ionicons name="git-compare" size={16} color={compareMode ? Colors.bg : Colors.textSecondary} />
              <Text style={[styles.compareToggleText, compareMode && { color: Colors.bg }]}>Compare</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Budget Summary */}
        <View style={styles.budgetRow}>
          <View style={[styles.budgetChip, { borderColor: `${Colors.macroCalories}30` }]}>
            <Text style={[styles.budgetValue, { color: Colors.macroCalories }]}>{budget.calories}</Text>
            <Text style={styles.budgetLabel}>kcal left</Text>
          </View>
          <View style={[styles.budgetChip, { borderColor: `${Colors.macroProtein}30` }]}>
            <Text style={[styles.budgetValue, { color: Colors.macroProtein }]}>{budget.protein}g</Text>
            <Text style={styles.budgetLabel}>protein left</Text>
          </View>
          <View style={[styles.budgetChip, { borderColor: `${Colors.macroCarbs}30` }]}>
            <Text style={[styles.budgetValue, { color: Colors.macroCarbs }]}>{budget.carbs}g</Text>
            <Text style={styles.budgetLabel}>carbs left</Text>
          </View>
        </View>

        {/* Absolute Top Pick Hero Card */}
        {absoluteTopPick && (
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroTrophy}>🏆</Text>
              <Text style={styles.heroTitle}>THE PERFECT CHOICE</Text>
            </View>
            <Text style={styles.heroDishName}>{absoluteTopPick.name}</Text>
            
            <View style={styles.heroMacroRow}>
              <View style={styles.heroMacroItem}>
                <Text style={styles.heroMacroValue}>{absoluteTopPick.macros.calories}</Text>
                <Text style={styles.heroMacroLabel}>kcal</Text>
              </View>
              <View style={styles.heroMacroItem}>
                <Text style={styles.heroMacroValue}>{absoluteTopPick.macros.protein}g</Text>
                <Text style={styles.heroMacroLabel}>Protein</Text>
              </View>
              <View style={styles.heroMacroItem}>
                <Text style={styles.heroMacroValue}>{absoluteTopPick.macros.carbs}g</Text>
                <Text style={styles.heroMacroLabel}>Carbs</Text>
              </View>
              <View style={styles.heroMacroItem}>
                <Text style={styles.heroMacroValue}>{absoluteTopPick.macros.fat}g</Text>
                <Text style={styles.heroMacroLabel}>Fat</Text>
              </View>
              <View style={styles.heroMacroItem}>
                <Text style={styles.heroMacroValue}>{absoluteTopPick.macros.fiber || 0}g</Text>
                <Text style={styles.heroMacroLabel}>Fiber</Text>
              </View>
            </View>

            <View style={styles.heroExplainBox}>
              <Text style={styles.heroExplainTitle}>💡 Why you should have this:</Text>
              <Text style={styles.heroExplainText}>{absoluteTopPick.reason}</Text>
              {absoluteTopPick.customizationTip && (
                <Text style={styles.heroExplainTip}>Chef's tip: {absoluteTopPick.customizationTip}</Text>
              )}
            </View>

            {riskAssessments[absoluteTopPick.name] && (
              <PersonalizedAnalysis assessment={riskAssessments[absoluteTopPick.name]} />
            )}

            <TouchableOpacity style={styles.heroLogBtn} onPress={() => handleLog(absoluteTopPick)} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={20} color={Colors.bg} />
              <Text style={styles.heroLogBtnText}>Log This Meal</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Top Picks */}
        {topPicks.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: Colors.topPick }]}>
              ⭐ OTHER TOP PICKS ({topPicks.length})
            </Text>
            {topPicks.map((dish, i) => (
              <DishCard key={i} dish={dish} onLog={() => handleLog(dish)} isCheatDay={isCheatDay} assessment={riskAssessments[dish.name]} compareMode={compareMode} compareSelected={compareSelection.has(dish.name)} onToggleCompare={() => toggleCompareSelection(dish.name)} />
            ))}
          </>
        )}

        {/* Good Fits */}
        {goodFits.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: Colors.goodFit }]}>
              👍 GOOD OPTIONS ({goodFits.length})
            </Text>
            {goodFits.map((dish, i) => (
              <DishCard key={i} dish={dish} onLog={() => handleLog(dish)} isCheatDay={isCheatDay} assessment={riskAssessments[dish.name]} compareMode={compareMode} compareSelected={compareSelection.has(dish.name)} onToggleCompare={() => toggleCompareSelection(dish.name)} />
            ))}
          </>
        )}

        {/* Skips */}
        {skips.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: Colors.skip }]}>
              ⛔ SKIP ({skips.length})
            </Text>
            {skips.map((dish, i) => (
              <DishCard key={i} dish={dish} onLog={() => handleLog(dish)} isCheatDay={isCheatDay} assessment={riskAssessments[dish.name]} compareMode={compareMode} compareSelected={compareSelection.has(dish.name)} onToggleCompare={() => toggleCompareSelection(dish.name)} />
            ))}
          </>
        )}

        {/* Compare CTA */}
        {compareMode && compareSelection.size >= 2 && (
          <TouchableOpacity
            style={styles.compareCta}
            onPress={() => navigation.navigate('Compare', { dishNames: Array.from(compareSelection) })}
            activeOpacity={0.8}
          >
            <Ionicons name="git-compare" size={20} color={Colors.bg} />
            <Text style={styles.compareCtaText}>Compare {compareSelection.size} dishes</Text>
          </TouchableOpacity>
        )}

        {/* Chat CTA */}
        <TouchableOpacity
          style={styles.chatCta}
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubbles" size={22} color={Colors.accent} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.chatCtaTitle}>Ask about this menu</Text>
            <Text style={styles.chatCtaSubtext}>
              "Which has the most protein?" "Can I eat two dishes?"
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  title: { ...Typography.h2, color: Colors.textPrimary },
  subtitle: { ...Typography.bodySm, color: Colors.textSecondary, marginTop: 2 },
  budgetRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  budgetChip: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md,
    borderWidth: 1, padding: 10, alignItems: 'center',
  },
  budgetValue: { ...Typography.numberSm },
  budgetLabel: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  sectionLabel: { ...Typography.label, marginTop: 16, marginBottom: 10 },
  
  // Hero Card Styles
  heroCard: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.topPick,
    padding: 20,
    marginBottom: 24,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  heroTrophy: { fontSize: 24 },
  heroTitle: { ...Typography.label, color: Colors.topPick, letterSpacing: 1.5 },
  heroDishName: { ...Typography.h2, color: Colors.textPrimary, marginBottom: 16 },
  heroMacroRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BorderRadius.md, padding: 12, marginBottom: 16 },
  heroMacroItem: { alignItems: 'center' },
  heroMacroValue: { ...Typography.bodyMedium, color: Colors.textPrimary, fontWeight: '700' },
  heroMacroLabel: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  heroExplainBox: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: BorderRadius.lg, marginBottom: 20 },
  heroExplainTitle: { ...Typography.bodyMedium, color: Colors.topPick, fontWeight: '700', marginBottom: 6 },
  heroExplainText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  heroExplainTip: { ...Typography.caption, color: Colors.amber, marginTop: 8, fontStyle: 'italic' },
  heroLogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.topPick, paddingVertical: 14, borderRadius: BorderRadius.lg },
  heroLogBtnText: { ...Typography.bodyMedium, color: Colors.bg, fontWeight: '800' },

  // Standard Dish Card Styles
  dishCard: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 12,
  },
  dishHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  dishNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dishName: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  scoreBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm,
  },
  scoreText: { ...Typography.caption, fontWeight: '700' },
  verdictBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full,
  },
  verdictText: { ...Typography.caption, fontWeight: '600' },
  macroBars: { gap: 6, marginBottom: 12 },
  macroBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroBarLabel: { ...Typography.caption, width: 28 },
  macroBarTrack: {
    flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.bgInput,
  },
  macroBarFill: { height: 6, borderRadius: 3 },
  macroBarValue: { ...Typography.caption, color: Colors.textSecondary, width: 42, textAlign: 'right' },
  reasonRow: {
    backgroundColor: Colors.accentBg, borderRadius: BorderRadius.sm, padding: 10, marginBottom: 6,
  },
  reasonTitle: { ...Typography.caption, color: Colors.accent, fontWeight: '700', marginBottom: 4 },
  reasonText: { ...Typography.bodySm, color: Colors.textSecondary },
  tipRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.amberBg, borderRadius: BorderRadius.sm, padding: 10, marginBottom: 10,
  },
  tipText: { ...Typography.bodySm, color: Colors.amberLight, flex: 1 },
  matchRow: { marginBottom: 10 },
  matchBadge: {
    backgroundColor: Colors.bgInput, borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  matchText: { ...Typography.caption, color: Colors.textMuted },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.accent, borderRadius: BorderRadius.md, paddingVertical: 12,
  },
  logBtnText: { ...Typography.bodyMedium, color: Colors.bg, fontWeight: '700' },
  chatCta: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.accentBorder, padding: 16, marginTop: 24,
  },
  chatCtaTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  chatCtaSubtext: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  warningContainer: {
    backgroundColor: 'rgba(255,82,82,0.05)', borderRadius: BorderRadius.sm, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,82,82,0.1)'
  },
  warningTitle: { ...Typography.caption, color: Colors.skip, fontWeight: '700', marginBottom: 6 },
  warningItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  warningText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },

  // Personalized Risk Analysis
  riskContainer: { borderWidth: 1, borderRadius: BorderRadius.md, marginBottom: 10, overflow: 'hidden' },
  riskHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, flexShrink: 1 },
  riskBadgeText: { ...Typography.caption, fontWeight: '700' },
  riskBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  riskSection: { gap: 4 },
  riskSectionTitle: { ...Typography.caption, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  riskFactorRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  riskDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  riskFactorFactor: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '700' },
  riskFactorSummary: { ...Typography.bodySm, color: Colors.textSecondary, marginTop: 2 },
  riskEvidence: { ...Typography.caption, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  riskUnknown: { ...Typography.bodySm, color: Colors.textSecondary },
  riskListItem: { ...Typography.bodySm, color: Colors.textSecondary },

  // Menu comparison
  compareToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  compareToggleText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  compareChk: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  compareChkSel: { backgroundColor: Colors.info, borderColor: Colors.info },
  compareCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.info, borderRadius: BorderRadius.lg, paddingVertical: 14, marginTop: 12 },
  compareCtaText: { ...Typography.bodyMedium, color: Colors.bg, fontWeight: '700' },
});

let styles = createStyles();
