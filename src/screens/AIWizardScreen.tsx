import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { Allergen, UserAllergy, MedicalCondition, ALLERGEN_LABEL, CONDITION_LABEL } from '../types/risk';
import { ALLERGEN_OPTIONS, CONDITION_OPTIONS, SEVERITY_ORDER, SEVERITY_ABBR } from '../constants/profileOptions';

const TOTAL_STEPS = 6;

export default function AIWizardScreen() {
  const { profile, updateProfile, themeMode } = useApp();
  styles = createStyles();
  const [step, setStep] = useState(0);

  const [gender, setGender] = useState<'male'|'female'>('male');
  const [age, setAge] = useState('25');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('170');
  const [goal, setGoal] = useState<'muscle_gain'|'weight_loss'|'maintenance'>('maintenance');
  const [activity, setActivity] = useState<'sedentary'|'light'|'moderate'|'active'>('moderate');
  const [allergies, setAllergies] = useState<UserAllergy[]>(profile.allergies || []);
  const [conditions, setConditions] = useState<MedicalCondition[]>(profile.conditions || []);

  // Tap cycles: not selected -> moderate -> severe -> mild -> not selected.
  const cycleAllergy = (key: Allergen) => {
    setAllergies(prev => {
      const existing = prev.find(a => a.allergen === key);
      if (!existing) return [...prev, { allergen: key, severity: 'moderate' }];
      const nextIdx = SEVERITY_ORDER.indexOf(existing.severity) + 1;
      if (nextIdx >= SEVERITY_ORDER.length) return prev.filter(a => a.allergen !== key);
      return prev.map(a => a.allergen === key ? { ...a, severity: SEVERITY_ORDER[nextIdx] } : a);
    });
  };

  const toggleCondition = (key: MedicalCondition) => {
    setConditions(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);
  };

  const conditionsByCategory = CONDITION_OPTIONS.reduce((acc, c) => {
    (acc[c.category] ||= []).push(c);
    return acc;
  }, {} as Record<string, typeof CONDITION_OPTIONS>);

  const handleComplete = async () => {
    // Calculate Macros using Mifflin-St Jeor Equation
    const w = parseFloat(weight) || 70;
    const h = parseFloat(height) || 170;
    const a = parseFloat(age) || 25;

    // BMR
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr += gender === 'male' ? 5 : -161;

    // Activity Multiplier
    const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
    const tdee = bmr * multipliers[activity];

    // Goal Adjustment
    let targetCalories = tdee;
    if (goal === 'weight_loss') targetCalories -= 500;
    if (goal === 'muscle_gain') targetCalories += 300;

    targetCalories = Math.round(targetCalories);

    // Macros: Protein 2g/kg, Fat 1g/kg, Rest Carbs
    const proteinTarget = Math.round(w * 2.2); // ~1g per lb
    const fatTarget = Math.round(w * 1);
    const carbTarget = Math.round((targetCalories - (proteinTarget * 4) - (fatTarget * 9)) / 4);
    const fiberLimit = Math.round((targetCalories / 1000) * 14); // 14g per 1000 cals

    await updateProfile({
      ...profile,
      goal,
      dailyCalories: targetCalories,
      proteinTarget,
      carbLimit: carbTarget > 0 ? carbTarget : 100, // Fallback
      fiberLimit,
      allergies,
      conditions,
      age: a,
      gender,
      weightKg: w,
      heightCm: h,
      activityLevel: activity,
      onboardingComplete: true,
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.content}>
            <Text style={styles.aiGreeting}>👋 Hi! I'm Kairo AI.</Text>
            <Text style={styles.aiQuestion}>To personalize your macro recommendations, tell me about yourself. First, what is your biological gender and age?</Text>

            <View style={styles.row}>
              <TouchableOpacity style={[styles.choiceBtn, gender === 'male' && styles.choiceBtnActive]} onPress={() => setGender('male')}>
                <Text style={[styles.choiceText, gender === 'male' && styles.choiceTextActive]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.choiceBtn, gender === 'female' && styles.choiceBtnActive]} onPress={() => setGender('female')}>
                <Text style={[styles.choiceText, gender === 'female' && styles.choiceTextActive]}>Female</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Age</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} />
          </View>
        );
      case 1:
        return (
          <View style={styles.content}>
            <Text style={styles.aiQuestion}>Got it. Next, what are your current body metrics?</Text>

            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} />

            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={height} onChangeText={setHeight} />
          </View>
        );
      case 2:
        return (
          <View style={styles.content}>
            <Text style={styles.aiQuestion}>How active are you on an average week?</Text>

            {(['sedentary', 'light', 'moderate', 'active'] as const).map(act => (
              <TouchableOpacity
                key={act}
                style={[styles.choiceBtn, activity === act && styles.choiceBtnActive, { marginBottom: 12 }]}
                onPress={() => setActivity(act)}
              >
                <Text style={[styles.choiceText, activity === act && styles.choiceTextActive]}>
                  {act === 'sedentary' ? 'Sedentary (Office job, little exercise)' :
                   act === 'light' ? 'Light (Exercise 1-3 days/wk)' :
                   act === 'moderate' ? 'Moderate (Exercise 3-5 days/wk)' :
                   'Active (Exercise 6-7 days/wk)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 3:
        return (
          <View style={styles.content}>
            <Text style={styles.aiQuestion}>Almost done! What is your primary fitness goal?</Text>

            <TouchableOpacity style={[styles.choiceBtn, goal === 'weight_loss' && styles.choiceBtnActive, { marginBottom: 12 }]} onPress={() => setGoal('weight_loss')}>
              <Text style={[styles.choiceText, goal === 'weight_loss' && styles.choiceTextActive]}>🔥 Cutting (Lose fat)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.choiceBtn, goal === 'maintenance' && styles.choiceBtnActive, { marginBottom: 12 }]} onPress={() => setGoal('maintenance')}>
              <Text style={[styles.choiceText, goal === 'maintenance' && styles.choiceTextActive]}>⚖️ Maintenance (Stay same weight)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.choiceBtn, goal === 'muscle_gain' && styles.choiceBtnActive, { marginBottom: 12 }]} onPress={() => setGoal('muscle_gain')}>
              <Text style={[styles.choiceText, goal === 'muscle_gain' && styles.choiceTextActive]}>💪 Bulking (Build muscle)</Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View style={styles.content}>
            <Text style={styles.aiQuestion}>Do you have any food allergies I should watch for?</Text>
            <Text style={styles.aiSubQuestion}>Tap an allergen to add it, tap again to cycle its severity (Moderate → Severe → Mild), tap once more to remove it.</Text>

            <View style={styles.chipGrid}>
              {ALLERGEN_OPTIONS.map(a => {
                const entry = allergies.find(x => x.allergen === a.key);
                const active = !!entry;
                return (
                  <TouchableOpacity
                    key={a.key}
                    style={[styles.chip, active && styles.chipActive, active && entry.severity === 'severe' && styles.chipSevere]}
                    onPress={() => cycleAllergy(a.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={a.icon as any} size={14} color={active ? (entry.severity === 'severe' ? Colors.skip : Colors.accent) : Colors.textSecondary} />
                    <Text style={[styles.chipText, active && styles.chipTextActive, active && entry.severity === 'severe' && { color: Colors.skip }]}>
                      {ALLERGEN_LABEL[a.key]}{entry ? ` · ${SEVERITY_ABBR[entry.severity]}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {allergies.length === 0 && (
              <Text style={styles.emptyHint}>No allergies selected — you can skip this and add them later from Profile.</Text>
            )}
          </View>
        );
      case 5:
        return (
          <View style={styles.content}>
            <Text style={styles.aiQuestion}>Any medical conditions relevant to your diet?</Text>
            <Text style={styles.aiSubQuestion}>This only flags condition-relevant dietary factors when you scan food — it never diagnoses or prescribes.</Text>

            {Object.entries(conditionsByCategory).map(([category, opts]) => (
              <View key={category} style={{ marginBottom: 16 }}>
                <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
                {opts.map(c => {
                  const active = conditions.includes(c.key);
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.conditionCard, active && styles.conditionCardActive]}
                      onPress={() => toggleCondition(c.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.conditionIconWrap, active && { backgroundColor: Colors.accentBg }]}>
                        <Ionicons name={c.icon as any} size={18} color={active ? Colors.accent : Colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.conditionTitle, active && { color: Colors.accent }]}>{CONDITION_LABEL[c.key]}</Text>
                        <Text style={styles.conditionDesc}>{c.description}</Text>
                      </View>
                      <View style={[styles.checkCircle, active && styles.checkCircleActive]}>
                        {active && <Ionicons name="checkmark" size={14} color={Colors.bg} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <Text style={styles.disclaimer}>
              You can change any of this anytime from your Profile.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <Text style={styles.progressText}>Step {step + 1} of {TOTAL_STEPS}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.aiBox}>
          <Ionicons name="sparkles" size={24} color={Colors.accent} style={{ marginBottom: 12 }} />
          {renderStepContent()}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step === 0 && { flex: 1 }]}
          onPress={() => step < TOTAL_STEPS - 1 ? setStep(step + 1) : handleComplete()}
        >
          <Text style={styles.nextText}>{step < TOTAL_STEPS - 1 ? 'Continue' : 'Finish Setup'}</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.bg} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 60 },
  header: { marginBottom: 40 },
  progressText: { ...Typography.caption, color: Colors.textMuted, marginBottom: 8, textAlign: 'center' },
  progressTrack: { height: 4, backgroundColor: Colors.bgInput, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.accent, borderRadius: 2 },
  aiBox: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl, padding: 24, borderWidth: 1, borderColor: Colors.accentBorder },
  aiGreeting: { ...Typography.h2, color: Colors.accent, marginBottom: 12 },
  aiQuestion: { ...Typography.bodyMedium, color: Colors.textPrimary, lineHeight: 24, marginBottom: 8 },
  aiSubQuestion: { ...Typography.bodySm, color: Colors.textMuted, lineHeight: 20, marginBottom: 20 },
  content: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  choiceBtn: { flex: 1, padding: 16, borderRadius: BorderRadius.md, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  choiceBtnActive: { backgroundColor: Colors.accentBg, borderColor: Colors.accent },
  choiceText: { ...Typography.bodyMedium, color: Colors.textSecondary },
  choiceTextActive: { color: Colors.accent, fontWeight: '700' },
  inputLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 16, color: Colors.textPrimary, ...Typography.bodyMedium, marginBottom: 20 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.accentBg, borderColor: Colors.accent },
  chipSevere: { backgroundColor: 'rgba(255,82,82,0.1)', borderColor: Colors.skip },
  chipText: { ...Typography.bodySm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accent, fontWeight: '700' },
  emptyHint: { ...Typography.caption, color: Colors.textMuted, marginTop: 14, fontStyle: 'italic' },
  categoryLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  conditionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  conditionCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accentBg },
  conditionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  conditionTitle: { ...Typography.bodySm, color: Colors.textPrimary, fontWeight: '700' },
  conditionDesc: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  checkCircleActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  disclaimer: { ...Typography.caption, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  footer: { flexDirection: 'row', padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg },
  backBtn: { padding: 16, borderRadius: BorderRadius.lg, backgroundColor: Colors.bgInput, marginRight: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  backText: { ...Typography.bodyMedium, color: Colors.textSecondary, fontWeight: '600' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: BorderRadius.lg, backgroundColor: Colors.accent },
  nextText: { ...Typography.bodyMedium, color: Colors.bg, fontWeight: '700' },
});

let styles = createStyles();
