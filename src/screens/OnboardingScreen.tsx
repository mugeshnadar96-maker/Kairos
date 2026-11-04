import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Spacing, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';
import {
  Allergen, UserAllergy, MedicalCondition, DietaryPreference,
  ALLERGEN_LABEL, CONDITION_LABEL, DIETARY_PREFERENCE_LABEL,
} from '../types/risk';
import { ALLERGEN_OPTIONS, CONDITION_OPTIONS, DIETARY_PREF_OPTIONS, SEVERITY_ORDER, SEVERITY_ABBR } from '../constants/profileOptions';

const { width } = Dimensions.get('window');

const GOALS = [
  { key: 'weight_loss', icon: 'flame', label: 'Weight Loss', desc: 'Calorie deficit focus' },
  { key: 'muscle_gain', icon: 'barbell', label: 'Muscle Gain', desc: 'High protein priority' },
  { key: 'maintenance', icon: 'heart', label: 'Maintenance', desc: 'Balanced nutrition' },
  { key: 'keto', icon: 'leaf', label: 'Keto / Low Carb', desc: 'Strict carb limit (<50g)' },
  { key: 'diabetic_friendly', icon: 'medical', label: 'Diabetic', desc: 'Sugar & carb control' },
  { key: 'heart_healthy', icon: 'fitness', label: 'Heart Healthy', desc: 'Low fat & sodium focus' },
] as const;

const DIET_TYPES = [
  { key: 'anything', label: 'Anything', icon: 'restaurant' },
  { key: 'vegetarian', label: 'Vegetarian', icon: 'leaf' },
  { key: 'vegan', label: 'Vegan', icon: 'nutrition' },
  { key: 'pescatarian', label: 'Pescatarian', icon: 'fish' },
] as const;

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon as any} size={15} color={Colors.textMuted} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

export default function OnboardingScreen({ navigation }: any) {
  const { profile, updateProfile, logout, isAuthenticated, themeMode } = useApp();
  styles = createStyles();
  const [goal, setGoal] = useState<string>(profile.goal);
  const [dietType, setDietType] = useState<string>(profile.dietType || 'anything');
  const [calories, setCalories] = useState(String(profile.dailyCalories));
  const [protein, setProtein] = useState(String(profile.proteinTarget));
  const [carbs, setCarbs] = useState(String(profile.carbLimit));
  const [hydrationTarget, setHydrationTarget] = useState(String(profile.hydrationTargetMl || 2000));
  const [age, setAge] = useState(String(profile.age || 30));
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [weightKg, setWeightKg] = useState(String(profile.weightKg || 70));
  const [heightCm, setHeightCm] = useState(String(profile.heightCm || 170));
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active'>(profile.activityLevel || 'moderate');
  const [allergies, setAllergies] = useState<UserAllergy[]>(profile.allergies || []);
  const [conditions, setConditions] = useState<MedicalCondition[]>(profile.conditions || []);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>(profile.dietaryPreferences || []);
  const [cheatDay, setCheatDay] = useState(profile.cheatDayEnabled);
  const [conditionsExpanded, setConditionsExpanded] = useState(conditions.length > 0);

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

  const toggleDietaryPref = (key: DietaryPreference) => {
    setDietaryPreferences(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    await updateProfile({
      goal: goal as any,
      dietType: dietType as any,
      dailyCalories: parseInt(calories) || 2000,
      proteinTarget: parseInt(protein) || 120,
      carbLimit: parseInt(carbs) || 250,
      fiberLimit: profile.fiberLimit || 30,
      allergies,
      conditions,
      dietaryPreferences,
      hydrationTargetMl: parseInt(hydrationTarget) || 2000,
      age: parseInt(age) || 30,
      gender,
      weightKg: parseFloat(weightKg) || 70,
      heightCm: parseFloat(heightCm) || 170,
      activityLevel,
      cheatDayEnabled: cheatDay,
      onboardingComplete: true,
    });
    navigation.navigate('Home');
  };

  const accentColor = cheatDay ? Colors.amber : Colors.accent;
  const accentBg = cheatDay ? Colors.amberBg : Colors.accentBg;

  const conditionsByCategory = CONDITION_OPTIONS.reduce((acc, c) => {
    (acc[c.category] ||= []).push(c);
    return acc;
  }, {} as Record<string, typeof CONDITION_OPTIONS>);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🧠 KAIROS</Text>
          <Text style={styles.title}>Your Health{'\n'}& Diet Profile</Text>
          <Text style={styles.subtitle}>
            This powers every personalized risk check — the more complete, the better KAIROS can flag what actually matters to you.
          </Text>
        </View>

        {/* Body & Activity */}
        <SectionHeader icon="body" label="BODY & ACTIVITY" />
        <View style={styles.row2Col}>
          <TouchableOpacity style={[styles.genderBtn, gender === 'male' && { borderColor: accentColor, backgroundColor: accentBg }]} onPress={() => setGender('male')}>
            <Text style={[styles.genderBtnText, gender === 'male' && { color: accentColor }]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.genderBtn, gender === 'female' && { borderColor: accentColor, backgroundColor: accentBg }]} onPress={() => setGender('female')}>
            <Text style={[styles.genderBtnText, gender === 'female' && { color: accentColor }]}>Female</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.macroInputRow}>
          <View style={styles.macroInputCard}>
            <Text style={styles.macroInputLabel}>Age</Text>
            <TextInput style={styles.macroInput} value={age} onChangeText={setAge} keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.macroUnit}>yrs</Text>
          </View>
          <View style={styles.macroInputCard}>
            <Text style={styles.macroInputLabel}>Weight</Text>
            <TextInput style={styles.macroInput} value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.macroUnit}>kg</Text>
          </View>
          <View style={styles.macroInputCard}>
            <Text style={styles.macroInputLabel}>Height</Text>
            <TextInput style={styles.macroInput} value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.macroUnit}>cm</Text>
          </View>
        </View>
        <View style={styles.restrictionGrid}>
          {(['sedentary', 'light', 'moderate', 'active'] as const).map(act => (
            <TouchableOpacity
              key={act}
              style={[styles.restrictionChip, activityLevel === act && { borderColor: accentColor, backgroundColor: accentBg }]}
              onPress={() => setActivityLevel(act)}
              activeOpacity={0.7}
            >
              <Text style={[styles.restrictionLabel, activityLevel === act && { color: accentColor }]}>
                {act.charAt(0).toUpperCase() + act.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal Selection */}
        <SectionHeader icon="flag" label="YOUR GOAL" />
        <View style={styles.goalGrid}>
          {GOALS.map(g => (
            <TouchableOpacity
              key={g.key}
              style={[
                styles.goalCard,
                goal === g.key && { borderColor: accentColor, backgroundColor: accentBg },
              ]}
              onPress={() => setGoal(g.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={g.icon as any}
                size={28}
                color={goal === g.key ? accentColor : Colors.textSecondary}
              />
              <Text style={[styles.goalLabel, goal === g.key && { color: accentColor }]}>
                {g.label}
              </Text>
              <Text style={styles.goalDesc}>{g.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Macro Targets */}
        <SectionHeader icon="stats-chart" label="DAILY TARGETS" />
        <View style={styles.macroInputRow}>
          <View style={styles.macroInputCard}>
            <View style={[styles.macroIcon, { backgroundColor: 'rgba(255,82,82,0.12)' }]}>
              <Ionicons name="flame" size={18} color={Colors.macroCalories} />
            </View>
            <Text style={styles.macroInputLabel}>Calories</Text>
            <TextInput
              style={styles.macroInput}
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
              placeholder="2000"
            />
            <Text style={styles.macroUnit}>kcal</Text>
          </View>

          <View style={styles.macroInputCard}>
            <View style={[styles.macroIcon, { backgroundColor: 'rgba(179,136,255,0.12)' }]}>
              <Ionicons name="barbell" size={18} color={Colors.macroProtein} />
            </View>
            <Text style={styles.macroInputLabel}>Protein</Text>
            <TextInput
              style={styles.macroInput}
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
              placeholder="120"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>

          <View style={styles.macroInputCard}>
            <View style={[styles.macroIcon, { backgroundColor: 'rgba(255,179,0,0.12)' }]}>
              <Ionicons name="nutrition" size={18} color={Colors.macroCarbs} />
            </View>
            <Text style={styles.macroInputLabel}>Carbs</Text>
            <TextInput
              style={styles.macroInput}
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
              placeholder="250"
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>
        </View>

        {/* Diet Type */}
        <SectionHeader icon="restaurant" label="DIET PREFERENCE" />
        <View style={styles.restrictionGrid}>
          {DIET_TYPES.map(d => (
            <TouchableOpacity
              key={d.key}
              style={[
                styles.restrictionChip,
                dietType === d.key && { borderColor: accentColor, backgroundColor: accentBg },
              ]}
              onPress={() => setDietType(d.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={d.icon as any}
                size={16}
                color={dietType === d.key ? accentColor : Colors.textSecondary}
              />
              <Text style={[styles.restrictionLabel, dietType === d.key && { color: accentColor }]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Allergies (tap to add at Moderate, tap again to cycle severity, tap once more to remove) */}
        <SectionHeader icon="alert-circle" label="ALLERGIES" />
        <Text style={styles.sectionHint}>Tap to add, tap again to change severity (Moderate → Severe → Mild)</Text>
        <View style={styles.restrictionGrid}>
          {ALLERGEN_OPTIONS.map(a => {
            const entry = allergies.find(x => x.allergen === a.key);
            const active = !!entry;
            const severe = active && entry.severity === 'severe';
            return (
              <TouchableOpacity
                key={a.key}
                style={[
                  styles.restrictionChip,
                  active && { borderColor: accentColor, backgroundColor: accentBg },
                  severe && { borderColor: Colors.skip, backgroundColor: 'rgba(255,82,82,0.1)' },
                ]}
                onPress={() => cycleAllergy(a.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={a.icon as any} size={16} color={severe ? Colors.skip : active ? accentColor : Colors.textSecondary} />
                <Text style={[styles.restrictionLabel, active && { color: accentColor }, severe && { color: Colors.skip }]}>
                  {ALLERGEN_LABEL[a.key]}{entry ? ` · ${SEVERITY_ABBR[entry.severity]}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Medical Conditions — grouped, descriptive cards since the list is long */}
        <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => setConditionsExpanded(!conditionsExpanded)} activeOpacity={0.7}>
          <Ionicons name="medical" size={15} color={Colors.textMuted} />
          <Text style={styles.sectionLabel}>MEDICAL CONDITIONS</Text>
          {conditions.length > 0 && (
            <View style={styles.countBadge}><Text style={styles.countBadgeText}>{conditions.length}</Text></View>
          )}
          <View style={{ flex: 1 }} />
          <Ionicons name={conditionsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        {conditionsExpanded && (
          <>
            <Text style={styles.sectionHint}>Used only to surface condition-relevant dietary factors, never to diagnose or prescribe.</Text>
            {Object.entries(conditionsByCategory).map(([category, opts]) => (
              <View key={category} style={{ marginBottom: 14 }}>
                <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
                {opts.map(c => {
                  const active = conditions.includes(c.key);
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.conditionCard, active && { borderColor: accentColor, backgroundColor: accentBg }]}
                      onPress={() => toggleCondition(c.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.conditionIconWrap, active && { backgroundColor: Colors.bgCard }]}>
                        <Ionicons name={c.icon as any} size={17} color={active ? accentColor : Colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.conditionTitle, active && { color: accentColor }]}>{CONDITION_LABEL[c.key]}</Text>
                        <Text style={styles.conditionDesc}>{c.description}</Text>
                      </View>
                      <View style={[styles.checkCircle, active && { backgroundColor: accentColor, borderColor: accentColor }]}>
                        {active && <Ionicons name="checkmark" size={13} color={Colors.bg} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </>
        )}

        {/* Additional Dietary Preferences */}
        <SectionHeader icon="leaf" label="OTHER DIETARY PREFERENCES" />
        <View style={styles.restrictionGrid}>
          {DIETARY_PREF_OPTIONS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.restrictionChip,
                dietaryPreferences.includes(p.key) && { borderColor: accentColor, backgroundColor: accentBg },
              ]}
              onPress={() => toggleDietaryPref(p.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={p.icon as any} size={16} color={dietaryPreferences.includes(p.key) ? accentColor : Colors.textSecondary} />
              <Text style={[styles.restrictionLabel, dietaryPreferences.includes(p.key) && { color: accentColor }]}>
                {DIETARY_PREFERENCE_LABEL[p.key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hydration Target — always user/clinician-set, never auto-derived from conditions */}
        <SectionHeader icon="water" label="DAILY HYDRATION TARGET" />
        <View style={styles.macroInputRow}>
          <View style={[styles.macroInputCard, { flex: 1 }]}>
            <View style={[styles.macroIcon, { backgroundColor: 'rgba(100,181,246,0.12)' }]}>
              <Ionicons name="water" size={18} color={Colors.info} />
            </View>
            <Text style={styles.macroInputLabel}>Target</Text>
            <TextInput
              style={styles.macroInput}
              value={hydrationTarget}
              onChangeText={setHydrationTarget}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
              placeholder="2000"
            />
            <Text style={styles.macroUnit}>ml/day</Text>
          </View>
        </View>
        <Text style={styles.sectionHint}>
          Set your own target, or use a clinician-recommended one. KAIROS never automatically increases this based on a medical condition (e.g. CKD, where fluid needs vary and should be set by your doctor).
        </Text>

        {/* Cheat Day Toggle */}
        <SectionHeader icon="pizza" label="CHEAT DAY MODE" />
        <TouchableOpacity
          style={[
            styles.cheatDayCard,
            cheatDay && { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
          ]}
          onPress={() => setCheatDay(!cheatDay)}
          activeOpacity={0.7}
        >
          <View style={styles.cheatDayLeft}>
            <Text style={{ fontSize: 28 }}>🍕</Text>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.cheatDayTitle, cheatDay && { color: Colors.amber }]}>
                Cheat Day
              </Text>
              <Text style={styles.cheatDayDesc}>
                Find the least damaging option instead
              </Text>
            </View>
          </View>
          <View style={[styles.toggle, cheatDay && styles.toggleOn]}>
            <View style={[styles.toggleDot, cheatDay && styles.toggleDotOn]} />
          </View>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accentColor }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={22} color={Colors.bg} />
          <Text style={styles.saveBtnText}>Save Profile & Continue</Text>
        </TouchableOpacity>

        {/* Logout Button (only show if authenticated) */}
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out" size={20} color={Colors.skip} />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 28,
  },
  logo: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 12,
    letterSpacing: 1,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  sectionHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: -8,
    marginBottom: 10,
  },
  countBadge: {
    backgroundColor: Colors.accentBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 2,
  },
  countBadgeText: { ...Typography.caption, color: Colors.accent, fontWeight: '700', fontSize: 11 },
  categoryLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
  conditionIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center',
  },
  conditionTitle: { ...Typography.bodySm, color: Colors.textPrimary, fontWeight: '700' },
  conditionDesc: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  checkCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  row2Col: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  genderBtnText: { ...Typography.bodySm, color: Colors.textSecondary, fontWeight: '600' },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalCard: {
    width: (width - 50) / 2,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    gap: 6,
  },
  goalLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  goalDesc: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroInputCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  macroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroInputLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  macroInput: {
    ...Typography.numberSm,
    color: Colors.textPrimary,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  macroUnit: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  restrictionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  restrictionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restrictionLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  cheatDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
  },
  cheatDayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cheatDayTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  cheatDayDesc: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgInput,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: Colors.amber,
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.textSecondary,
  },
  toggleDotOn: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    marginTop: 32,
  },
  saveBtnText: {
    ...Typography.bodyMedium,
    color: Colors.bg,
    fontWeight: '700',
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 12, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255,82,82,0.1)', borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)' },
  logoutBtnText: { ...Typography.bodyMedium, color: Colors.skip, fontWeight: '700' },
});

let styles = createStyles();
