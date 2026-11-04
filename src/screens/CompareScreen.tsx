import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { RISK_LEVEL_LABEL, RiskLevel } from '../types/risk';

const RISK_COLOR: Record<RiskLevel, string> = {
  green: Colors.topPick, yellow: Colors.amber, orange: '#FF9800', red: Colors.skip, grey: Colors.textMuted,
};

// Factor-based comparison only — deliberately no overall "best/healthiest"
// ranking across dishes. The goal is to help the user make an informed
// decision, not to make it for them.
export default function CompareScreen({ navigation, route }: any) {
  const { scannedDishes, riskAssessments, themeMode } = useApp();
  styles = createStyles();
  const dishNames: string[] = route?.params?.dishNames || [];
  const dishes = scannedDishes.filter(d => dishNames.includes(d.name));

  return (
    <View style={styles.container}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Compare Dishes</Text>
          <Text style={styles.subtitle}>Factor-by-factor, based on your profile — not an overall ranking</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {dishes.map(dish => {
          const assessment = riskAssessments[dish.name];
          const allergyFactors = assessment?.riskFactors.filter(f => f.category === 'allergy') || [];
          const conditionFactors = assessment?.riskFactors.filter(f => f.category === 'condition') || [];
          const knownIngredients = assessment?.riskFactors.map(f => f.detectedIngredient).filter(Boolean) as string[] || [];

          return (
            <View key={dish.name} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.dishName}>{dish.name}</Text>
                {assessment && (
                  <View style={[styles.statusBadge, { backgroundColor: `${RISK_COLOR[assessment.overallStatus]}20` }]}>
                    <Text style={[styles.statusText, { color: RISK_COLOR[assessment.overallStatus] }]}>
                      {RISK_LEVEL_LABEL[assessment.overallStatus]}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.macroRow}>
                <Text style={styles.macroText}>{dish.macros.calories} kcal</Text>
                <Text style={styles.macroDot}>·</Text>
                <Text style={styles.macroText}>{dish.macros.protein}g protein</Text>
                <Text style={styles.macroDot}>·</Text>
                <Text style={styles.macroText}>{dish.macros.carbs}g carbs</Text>
              </View>

              <View style={styles.factorRow}>
                <Ionicons name="alert-circle" size={14} color={allergyFactors.length ? Colors.skip : Colors.textMuted} />
                <Text style={styles.factorLabel}>Allergy concern:</Text>
                <Text style={[styles.factorValue, { color: allergyFactors.length ? Colors.skip : Colors.textSecondary }]}>
                  {allergyFactors.length ? allergyFactors.map(f => f.detectedIngredient).join(', ') : 'None identified'}
                </Text>
              </View>

              <View style={styles.factorRow}>
                <Ionicons name="medical" size={14} color={conditionFactors.length ? Colors.amber : Colors.textMuted} />
                <Text style={styles.factorLabel}>Condition-relevant:</Text>
                <Text style={[styles.factorValue, { color: conditionFactors.length ? Colors.amber : Colors.textSecondary }]}>
                  {conditionFactors.length ? conditionFactors.map(f => f.summary).join('; ') : 'None identified'}
                </Text>
              </View>

              <View style={styles.factorRow}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.textMuted} />
                <Text style={styles.factorLabel}>Known ingredients:</Text>
                <Text style={styles.factorValue}>{knownIngredients.length > 0 ? knownIngredients.join(', ') : 'None specifically flagged'}</Text>
              </View>

              <View style={styles.factorRow}>
                <Ionicons name="help-circle" size={14} color={Colors.info} />
                <Text style={styles.factorLabel}>Unknown/unverified:</Text>
                <Text style={[styles.factorValue, { color: Colors.info }]}>
                  {assessment ? `${assessment.unknowns.length} item${assessment.unknowns.length !== 1 ? 's' : ''}` : 'Not assessed'}
                </Text>
              </View>

              <View style={styles.factorRow}>
                <Ionicons name="shield-checkmark" size={14} color={assessment?.recommendedVerification.length ? Colors.amber : Colors.textMuted} />
                <Text style={styles.factorLabel}>Verification needed:</Text>
                <Text style={[styles.factorValue, { color: assessment?.recommendedVerification.length ? Colors.amber : Colors.textSecondary }]}>
                  {assessment?.recommendedVerification.length ? `${assessment.recommendedVerification.length} item(s)` : 'None flagged'}
                </Text>
              </View>
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          This comparison lists factors relevant to your profile side by side — it does not rank dishes by overall healthiness or safety. Use it alongside the full personalized analysis on each dish.
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.h2, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  scroll: { padding: 20 },
  card: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  dishName: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { ...Typography.caption, fontWeight: '700' },
  macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  macroText: { ...Typography.caption, color: Colors.textSecondary },
  macroDot: { color: Colors.textMuted, marginHorizontal: 6 },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  factorLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '700', width: 130 },
  factorValue: { ...Typography.bodySm, color: Colors.textSecondary, flex: 1 },
  disclaimer: { ...Typography.caption, color: Colors.textMuted, marginTop: 8, lineHeight: 18, textAlign: 'center' },
});

let styles = createStyles();
