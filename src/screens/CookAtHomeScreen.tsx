import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { searchRecipes, getRecipeIngredientList, RecipeEntry } from '../data/recipeDB';
import { assessRecipe } from '../services/riskEngine/recipeRiskEngine';
import { RiskLevel, RISK_LEVEL_LABEL } from '../types/risk';

const RISK_CONFIG: Record<RiskLevel, { emoji: string; color: string; bg: string }> = {
  green: { emoji: '✅', color: Colors.topPick, bg: 'rgba(0,230,118,0.1)' },
  yellow: { emoji: '⚠️', color: Colors.amber, bg: Colors.amberBg },
  orange: { emoji: '🟠', color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
  red: { emoji: '🔴', color: Colors.skip, bg: 'rgba(255,82,82,0.1)' },
  grey: { emoji: '❔', color: Colors.textMuted, bg: Colors.bgInput },
};

function RiskBadge({ level, compact }: { level: RiskLevel; compact?: boolean }) {
  const cfg = RISK_CONFIG[level];
  return (
    <View style={[styles.riskBadge, { backgroundColor: cfg.bg }]}>
      <Text style={{ fontSize: compact ? 10 : 12 }}>{cfg.emoji}</Text>
      {!compact && <Text style={[styles.riskBadgeText, { color: cfg.color }]}>{RISK_LEVEL_LABEL[level]}</Text>}
    </View>
  );
}

export default function CookAtHomeScreen({ navigation }: any) {
  const { profile, themeMode } = useApp();
  styles = createStyles();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RecipeEntry | null>(null);

  const results = useMemo(() => searchRecipes(query, 30), [query]);
  const resultsWithRisk = useMemo(
    () => results.map(r => ({ recipe: r, assessment: assessRecipe(r, profile) })),
    [results, profile]
  );

  const selectedAssessment = useMemo(() => selected ? assessRecipe(selected, profile) : null, [selected, profile]);
  const selectedIngredients = useMemo(() => selected ? getRecipeIngredientList(selected) : [], [selected]);

  if (selected && selectedAssessment) {
    const flagMap = new Map(selectedAssessment.flaggedIngredients.map(f => [f.canonicalName, f]));
    return (
      <View style={styles.container}>
        <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title} numberOfLines={2}>{selected.name}</Text>
            <Text style={styles.subtitle}>{selected.cuisine}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.overallBanner, { borderColor: `${RISK_CONFIG[selectedAssessment.overallStatus].color}40` }]}>
            <RiskBadge level={selectedAssessment.overallStatus} />
            <Text style={styles.overallText}>
              {selectedAssessment.flaggedIngredients.length > 0
                ? `${selectedAssessment.flaggedIngredients.length} of ${selectedAssessment.totalIngredients} ingredients need your attention`
                : 'No relevant concern identified from your profile for this recipe'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>INGREDIENTS</Text>
          {selectedIngredients.map((ing, i) => {
            const flag = [...flagMap.values()].find(f => ing.includes(f.canonicalName || '___'));
            if (!flag) {
              return (
                <View key={i} style={styles.ingredientRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={Colors.textMuted} />
                  <Text style={styles.ingredientText}>{ing}</Text>
                </View>
              );
            }
            const cfg = RISK_CONFIG[flag.severity];
            return (
              <View key={i} style={[styles.flaggedCard, { borderColor: `${cfg.color}40`, backgroundColor: cfg.bg }]}>
                <View style={styles.flaggedHeader}>
                  <Text style={{ fontSize: 14 }}>{cfg.emoji}</Text>
                  <Text style={[styles.flaggedName, { color: cfg.color }]}>{ing}</Text>
                  <View style={[styles.severityTag, { backgroundColor: cfg.color }]}>
                    <Text style={styles.severityTagText}>{flag.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.flaggedReason}>Why: {flag.reason} (relevant to your {flag.userFactor})</Text>
                {flag.alternative && (
                  <View style={styles.altRow}>
                    <Ionicons name="swap-horizontal" size={13} color={Colors.accent} />
                    <Text style={styles.altText}>Try instead: {flag.alternative}</Text>
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>FULL RECIPE (WITH QUANTITIES)</Text>
          <Text style={styles.rawIngredients}>{selected.ingredientsText}</Text>

          <Text style={styles.disclaimer}>
            {selectedAssessment.unknowns.join(' ')} Verify any substitution works for your specific allergy or condition before cooking.
          </Text>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Cook at Home</Text>
          <Text style={styles.subtitle}>Search a recipe — flagged ingredients get an alternative or a risk tag</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search recipes (e.g. paneer, biryani, dosa)..."
          placeholderTextColor={Colors.textMuted}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={resultsWithRisk}
        keyExtractor={(item, i) => item.recipe.name + i}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.recipeRow} onPress={() => setSelected(item.recipe)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipeName} numberOfLines={1}>{item.recipe.name}</Text>
              <Text style={styles.recipeCuisine}>{item.recipe.cuisine}</Text>
            </View>
            {item.assessment.overallStatus !== 'green' && <RiskBadge level={item.assessment.overallStatus} compact />}
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No recipes found. Try a different search term.</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.bodyMedium, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 12, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.textPrimary, ...Typography.bodySm },
  recipeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 8 },
  recipeName: { ...Typography.bodyMedium, color: Colors.textPrimary },
  recipeCuisine: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 10 },
  emptyText: { ...Typography.bodySm, color: Colors.textMuted, textAlign: 'center' },
  overallBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 20 },
  overallText: { ...Typography.bodySm, color: Colors.textSecondary, flex: 1 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  riskBadgeText: { ...Typography.caption, fontWeight: '700' },
  sectionTitle: { ...Typography.label, color: Colors.textMuted, marginBottom: 10, marginTop: 8 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  ingredientText: { ...Typography.bodySm, color: Colors.textSecondary },
  flaggedCard: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 8 },
  flaggedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  flaggedName: { ...Typography.bodySm, fontWeight: '700', flex: 1, textTransform: 'capitalize' },
  severityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  severityTagText: { ...Typography.caption, color: '#fff', fontWeight: '700', fontSize: 10 },
  flaggedReason: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 17 },
  altRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, backgroundColor: Colors.accentBg, borderRadius: BorderRadius.sm, padding: 8 },
  altText: { ...Typography.caption, color: Colors.accent, flex: 1, lineHeight: 16 },
  rawIngredients: { ...Typography.bodySm, color: Colors.textSecondary, lineHeight: 22, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  disclaimer: { ...Typography.caption, color: Colors.textMuted, marginTop: 16, lineHeight: 18 },
});

let styles = createStyles();
