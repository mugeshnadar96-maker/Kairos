import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, BorderRadius } from '../theme/typography';
import { getAllMeals, seedMockHistory } from '../services/storageService';
import { MealEntry } from '../types';
import { RiskLevel } from '../types/risk';
import { useApp } from '../context/AppContext';

const RISK_DOT_COLOR: Record<RiskLevel, string> = {
  green: Colors.topPick, yellow: Colors.amber, orange: '#FF9800', red: Colors.skip, grey: Colors.textMuted,
};

export default function HistoryScreen({ navigation }: any) {
  const { themeMode } = useApp();
  styles = createStyles();
  const [history, setHistory] = useState<Record<string, MealEntry[]>>({});
  const [totalMeals, setTotalMeals] = useState(0);
  const [chartData, setChartData] = useState<{date: string, cals: number}[]>([]);

  useEffect(() => {
    (async () => {
      await seedMockHistory();
      const meals = await getAllMeals();
      setTotalMeals(meals.length);
      
      // Group by date
      const grouped = meals.reverse().reduce((acc, meal) => {
        if (!acc[meal.date]) acc[meal.date] = [];
        acc[meal.date].push(meal);
        return acc;
      }, {} as Record<string, MealEntry[]>);
      
      // Prepare chart data (last 7 days of calories)
      const last7Days = [];
      const todayDate = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const dayCals = grouped[ds]?.reduce((sum, m) => sum + m.macros.calories, 0) || 0;
        last7Days.push({
          date: d.toLocaleDateString(undefined, { weekday: 'short' }),
          cals: dayCals
        });
      }
      setChartData(last7Days);
      setHistory(grouped);
    })();
  }, []);

  const maxCals = Math.max(...chartData.map(d => d.cals), 2000);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.title}>Meal History</Text>
          <Text style={styles.subtitle}>{totalMeals} meals logged over time</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Simple Bar Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Calorie Intake (Last 7 Days)</Text>
            <View style={styles.chartContainer}>
              {chartData.map((data, idx) => {
                const heightPct = Math.max(5, (data.cals / maxCals) * 100);
                const isOverBudget = data.cals > 2000; // Mock budget
                return (
                  <View key={idx} style={styles.barWrapper}>
                    <Text style={styles.barVal}>{data.cals > 0 ? data.cals : ''}</Text>
                    <View style={styles.barTrack}>
                      <View style={[
                        styles.barFill, 
                        { height: `${heightPct}%`, backgroundColor: isOverBudget ? Colors.skip : Colors.accent }
                      ]} />
                    </View>
                    <Text style={styles.barLabel}>{data.date}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {Object.entries(history).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptySub}>Your logged meals will appear here</Text>
          </View>
        ) : (
          Object.entries(history).map(([date, meals]) => (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Ionicons name="calendar" size={16} color={Colors.accent} />
                <Text style={styles.dateText}>{new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                <View style={styles.dateLine} />
              </View>

              {meals.map(meal => (
                <View key={meal.id} style={styles.mealCard}>
                  <View style={styles.mealNameRow}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    {meal.riskLevel && (
                      <View style={[styles.riskDot, { backgroundColor: RISK_DOT_COLOR[meal.riskLevel] }]} />
                    )}
                  </View>
                  {meal.riskFactorSummaries && meal.riskFactorSummaries.length > 0 && (
                    <Text style={styles.riskSummaryText} numberOfLines={2}>{meal.riskFactorSummaries[0]}</Text>
                  )}
                  <View style={styles.mealMacroRow}>
                    <Text style={[styles.mealMacro, { color: Colors.macroCalories }]}>{meal.macros.calories} kcal</Text>
                    <Text style={styles.macroDot}>·</Text>
                    <Text style={[styles.mealMacro, { color: Colors.macroProtein }]}>{meal.macros.protein}g P</Text>
                    <Text style={styles.macroDot}>·</Text>
                    <Text style={[styles.mealMacro, { color: Colors.macroCarbs }]}>{meal.macros.carbs}g C</Text>
                    <Text style={styles.macroDot}>·</Text>
                    <Text style={[styles.mealMacro, { color: Colors.macroFat }]}>{meal.macros.fat}g F</Text>
                    <Text style={styles.macroDot}>·</Text>
                    <Text style={[styles.mealMacro, { color: Colors.goodFit }]}>{meal.macros.fiber || 0}g Fib</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.h2, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textMuted },
  scroll: { padding: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 8 },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textSecondary },
  emptySub: { ...Typography.caption, color: Colors.textMuted },
  dateGroup: { marginBottom: 24 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dateText: { ...Typography.bodySm, color: Colors.accent, fontWeight: '700' },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  mealCard: { backgroundColor: Colors.bgCard, padding: 16, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  mealNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  mealName: { ...Typography.bodyMedium, color: Colors.textPrimary },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskSummaryText: { ...Typography.caption, color: Colors.textMuted, marginBottom: 6, fontStyle: 'italic' },
  mealMacroRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  mealMacro: { ...Typography.caption, fontSize: 12 },
  macroDot: { color: Colors.textMuted, marginHorizontal: 6, fontSize: 10 },
  
  chartCard: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  chartTitle: { ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 16, textAlign: 'center' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160 },
  barWrapper: { alignItems: 'center', flex: 1 },
  barTrack: { width: 24, height: 120, backgroundColor: Colors.bgInput, borderRadius: 12, justifyContent: 'flex-end', marginVertical: 4 },
  barFill: { width: '100%', borderRadius: 12 },
  barLabel: { ...Typography.caption, fontSize: 10, color: Colors.textMuted },
  barVal: { ...Typography.caption, fontSize: 9, color: Colors.textSecondary },
});

let styles = createStyles();
