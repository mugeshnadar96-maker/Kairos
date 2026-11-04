import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ActivityIndicator, Image, Dimensions, Alert, FlatList, TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, BorderRadius } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { parseMenuImage, parseIngredientLabel } from '../services/geminiService';
import { indianFoodDB, findNutrition, FoodEntry } from '../data/indianFoodDB';
import { rankDishesLocally } from '../services/localRankingService';
import { assessDishes, assessPackagedFood } from '../services/riskEngine/riskEngine';
import { DishWithMacros, ParsedDish } from '../types';

const { width, height } = Dimensions.get('window');

type Stage = 'camera' | 'scanning' | 'select' | 'manual';
type ScanType = 'menu' | 'dish' | 'label';

export default function ScannerScreen({ navigation, route }: any) {
  const { profile, budget, setScannedDishes, setDishesWithMacros, setRiskAssessments, themeMode } = useApp();
  styles = createStyles();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>('camera');
  const [scanType, setScanType] = useState<ScanType>(route?.params?.scanType || 'menu');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const [parsedDishes, setParsedDishes] = useState<DishWithMacros[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());
  const cameraRef = useRef<any>(null);

  // --- PROCESS PACKAGED FOOD LABEL: Gemini reads ingredients/allergen text verbatim ---
  const processLabelImage = async (imageUri: string) => {
    setStage('scanning');
    setCapturedImage(imageUri);
    setStatusText('Reading ingredient label...');

    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as any });
      setStatusText('Extracting ingredients & allergen declaration...');
      const scan = await parseIngredientLabel(base64);

      if (!scan.ingredientsText.trim() && !scan.allergenText.trim()) {
        Alert.alert('Label unreadable', 'Could not read the ingredient list or allergen declaration. Try a clearer, well-lit photo of the label.', [
          { text: 'Try Again', onPress: () => setStage('camera') },
        ]);
        return;
      }

      // Avoid collisions between multiple scans that all got the generic
      // fallback name (riskAssessments/scannedDishes are keyed by name).
      const productName = scan.productName === 'Scanned Product'
        ? `Scanned Product (${new Date().toLocaleTimeString()})`
        : scan.productName;

      let macros = scan.macros;
      let matchType: DishWithMacros['matchType'] = 'label_provided';
      if (!macros) {
        // Nutrition panel wasn't legible on the label — fall back to the
        // local nutrition database the same way menu/dish scanning does,
        // instead of silently showing all-zero macros.
        const dbMatch = findNutrition(productName);
        if (dbMatch) {
          macros = { calories: dbMatch.entry.calories, protein: dbMatch.entry.protein, carbs: dbMatch.entry.carbs, fat: dbMatch.entry.fat, fiber: dbMatch.entry.fiber };
          matchType = dbMatch.matchType;
        } else {
          macros = { calories: 200, protein: 8, carbs: 20, fat: 8, fiber: 3 };
          matchType = 'ai_estimated';
        }
      }

      const product: DishWithMacros = {
        name: productName,
        description: scan.ingredientsText,
        macros,
        matchType,
      };

      const ranked = rankDishesLocally([product], budget, profile);
      const assessment = assessPackagedFood(product, scan.ingredientsText, scan.allergenText, profile);

      setDishesWithMacros([product]);
      setScannedDishes(ranked);
      setRiskAssessments({ [product.name]: assessment });

      navigation.navigate('Results');
    } catch (error: any) {
      console.error('Label scan error:', error);
      Alert.alert('Scan Failed', error?.message || 'Unknown error', [
        { text: 'Try Again', onPress: () => setStage('camera') },
      ]);
    }
  };

  // --- PROCESS IMAGE: Gemini scans → local DB matches macros ---
  const processMenuImage = async (imageUri: string) => {
    if (scanType === 'label') return processLabelImage(imageUri);

    setStage('scanning');
    setCapturedImage(imageUri);
    setStatusText('Reading menu with AI...');

    try {
      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });

      // Send to Gemini to extract dish names
      setStatusText(scanType === 'menu' ? 'Reading the menu...' : 'Identifying the dish...');
      const dishes: ParsedDish[] = await parseMenuImage(base64, scanType === 'dish' ? 'dish' : 'menu');

      if (dishes.length === 0) {
        Alert.alert('No dishes found', 'Could not read the menu. Try a clearer photo or select dishes manually.');
        setStage('camera');
        return;
      }

      setStatusText(`Found ${dishes.length} dishes! Looking up nutrition...`);

      // Match each dish against local database for macros
      const withMacros: DishWithMacros[] = dishes.map(dish => {
        const match = findNutrition(dish.name);
        if (match) {
          return {
            name: dish.name,
            description: dish.description,
            macros: {
              calories: match.entry.calories,
              protein: match.entry.protein,
              carbs: match.entry.carbs,
              fat: match.entry.fat,
              fiber: match.entry.fiber,
            },
            matchType: match.matchType,
          };
        }
        // No match — use a reasonable estimate
        return {
          name: dish.name,
          description: dish.description,
          macros: { calories: 200, protein: 8, carbs: 20, fat: 8, fiber: 3 },
          matchType: 'ai_estimated' as const,
        };
      });

      // Rank locally (no Claude needed)
      const ranked = rankDishesLocally(withMacros, budget, profile);

      setDishesWithMacros(withMacros);
      setScannedDishes(ranked);
      setRiskAssessments(assessDishes(withMacros, profile));

      // Go to results
      navigation.navigate('Results');
    } catch (error: any) {
      console.error('Scan error:', error);
      const errMsg = error?.message || 'Unknown error';
      Alert.alert(
        'Scan Failed',
        `Error: ${errMsg}\n\nTap Select Manually to choose dishes yourself.`,
        [
          { text: 'Try Again', onPress: () => setStage('camera') },
          { text: 'Select Manually', onPress: () => setStage('manual') },
        ]
      );
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        await processMenuImage(photo.uri);
      } catch (err) {
        console.error('Capture error:', err);
        setStage('manual');
      }
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        await processMenuImage(result.assets[0].uri);
      }
    } catch {
      setStage('manual');
    }
  };

  // --- MANUAL SELECTION fallback ---
  const filteredDishes = searchQuery.trim()
    ? indianFoodDB.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.keywords.some(k => k.includes(searchQuery.toLowerCase()))
      )
    : indianFoodDB;

  const toggleDish = (name: string) => {
    setSelectedDishes(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const processManualSelection = () => {
    if (selectedDishes.size === 0) {
      Alert.alert('No dishes selected', 'Tap dishes you see on the menu.');
      return;
    }
    const withMacros: DishWithMacros[] = [];
    for (const name of selectedDishes) {
      const entry = indianFoodDB.find(f => f.name === name);
      if (entry) {
        withMacros.push({
          name: entry.name,
          description: entry.keywords.join(', '),
          macros: { calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat, fiber: entry.fiber },
          matchType: 'exact',
        });
      }
    }
    const ranked = rankDishesLocally(withMacros, budget, profile);
    setDishesWithMacros(withMacros);
    setScannedDishes(ranked);
    setRiskAssessments(assessDishes(withMacros, profile));
    navigation.navigate('Results');
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
        <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSubtext}>Scan restaurant menus to get instant macro analysis</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.altBtn} onPress={handlePickImage}>
          <Ionicons name="images" size={20} color={Colors.accent} />
          <Text style={styles.altBtnText}>Upload menu photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.altBtn} onPress={() => setStage('manual')}>
          <Ionicons name="list" size={20} color={Colors.accent} />
          <Text style={styles.altBtnText}>Select dishes manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- SCANNING STATE ----
  if (stage === 'scanning') {
    return (
      <View style={styles.scanningContainer}>
        <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
        {capturedImage && (
          <Image source={{ uri: capturedImage }} style={styles.bgPreview} blurRadius={10} />
        )}
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningCard}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.scanningTitle}>🔍 Scanning Menu</Text>
            <Text style={styles.scanningStatus}>{statusText}</Text>
            <View style={styles.stageRow}>
              <View style={[styles.stageDot, { backgroundColor: Colors.accent }]} />
              <Text style={[styles.stageLabel, { color: Colors.accent }]}>Read</Text>
              <View style={styles.stageLine} />
              <View style={[styles.stageDot, statusText.includes('nutrition') ? { backgroundColor: Colors.accent } : {}]} />
              <Text style={styles.stageLabel}>Match</Text>
              <View style={styles.stageLine} />
              <View style={styles.stageDot} />
              <Text style={styles.stageLabel}>Rank</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ---- MANUAL SELECT ----
  if (stage === 'manual') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
        <View style={styles.manualHeader}>
          <TouchableOpacity onPress={() => setStage('camera')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.manualTitle}>Select Menu Dishes</Text>
            <Text style={styles.manualSub}>{selectedDishes.size} selected · Tap to toggle</Text>
          </View>
        </View>
        {capturedImage && (
          <View style={styles.thumbContainer}>
            <Image source={{ uri: capturedImage }} style={styles.thumbImage} />
            <View style={styles.thumbOverlay}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
              <Text style={styles.thumbText}>Menu captured</Text>
            </View>
          </View>
        )}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery}
            placeholder="Search dishes..." placeholderTextColor={Colors.textMuted} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filteredDishes}
          keyExtractor={item => item.name}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const sel = selectedDishes.has(item.name);
            return (
              <TouchableOpacity style={[styles.dishRow, sel && styles.dishRowSel]} onPress={() => toggleDish(item.name)}>
                <View style={[styles.chk, sel && styles.chkSel]}>
                  {sel && <Ionicons name="checkmark" size={14} color={Colors.bg} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dishName, sel && { color: Colors.accent }]}>{item.name}</Text>
                  <Text style={styles.dishMacros}>
                    {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                  </Text>
                </View>
                {item.calories <= budget.calories && (
                  <View style={styles.fitsBadge}><Text style={styles.fitsText}>Fits</Text></View>
                )}
              </TouchableOpacity>
            );
          }}
        />
        {selectedDishes.size > 0 && (
          <View style={styles.bottomAction}>
            <TouchableOpacity style={styles.analyzeBtn} onPress={processManualSelection}>
              <Ionicons name="analytics" size={20} color={Colors.bg} />
              <Text style={styles.analyzeBtnText}>Analyze {selectedDishes.size} dishes</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ---- CAMERA VIEW ----
  return (
    <View style={styles.container}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={Colors.bg} />
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.camBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, scanType === 'menu' && styles.toggleBtnActive]} 
              onPress={() => setScanType('menu')}
            >
              <Ionicons name="document-text" size={14} color={scanType === 'menu' ? Colors.bg : '#fff'} />
              <Text style={[styles.toggleText, scanType === 'menu' && styles.toggleTextActive]}>Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, scanType === 'dish' && styles.toggleBtnActive]}
              onPress={() => setScanType('dish')}
            >
              <Ionicons name="restaurant" size={14} color={scanType === 'dish' ? Colors.bg : '#fff'} />
              <Text style={[styles.toggleText, scanType === 'dish' && styles.toggleTextActive]}>Dish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, scanType === 'label' && styles.toggleBtnActive]}
              onPress={() => setScanType('label')}
            >
              <Ionicons name="barcode" size={14} color={scanType === 'label' ? Colors.bg : '#fff'} />
              <Text style={[styles.toggleText, scanType === 'label' && styles.toggleTextActive]}>Label</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setStage('manual')} style={styles.camBtn}>
            <Ionicons name="list" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cTL]} />
          <View style={[styles.corner, styles.cTR]} />
          <View style={[styles.corner, styles.cBL]} />
          <View style={[styles.corner, styles.cBR]} />
        </View>
        <Text style={styles.hint}>
          {scanType === 'menu' ? 'Point at the menu' : scanType === 'label' ? 'Point at the ingredients/allergen panel' : 'Point at your food'} and tap capture
        </Text>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.sideBtn} onPress={handlePickImage}>
            <Ionicons name="images" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <View style={styles.capInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn} onPress={() => setStage('manual')}>
            <Ionicons name="list" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  camera: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20 },
  camBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 4 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: Colors.accent },
  toggleText: { ...Typography.caption, color: '#fff', fontWeight: '600' },
  toggleTextActive: { color: Colors.bg },
  scanFrame: { flex: 1, marginHorizontal: 30, marginVertical: 40 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: Colors.accent, borderWidth: 3 },
  cTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: { ...Typography.bodySm, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 40, paddingHorizontal: 40 },
  sideBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  capInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  // Permission
  permissionContainer: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  permTitle: { ...Typography.h3, color: Colors.textPrimary, marginTop: 12 },
  permSubtext: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  permBtn: { backgroundColor: Colors.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: BorderRadius.lg, marginTop: 16 },
  permBtnText: { ...Typography.bodyMedium, color: Colors.bg, fontWeight: '700' },
  altBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  altBtnText: { ...Typography.bodySm, color: Colors.accent },
  // Scanning
  scanningContainer: { flex: 1, backgroundColor: '#000' },
  bgPreview: { ...StyleSheet.absoluteFillObject, width, height, opacity: 0.3 },
  scanningOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  scanningCard: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, padding: 32, alignItems: 'center', width: '100%', gap: 12 },
  scanningTitle: { ...Typography.h3, color: Colors.textPrimary },
  scanningStatus: { ...Typography.bodySm, color: Colors.textSecondary, textAlign: 'center' },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  stageDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.textMuted },
  stageLabel: { ...Typography.caption, color: Colors.textMuted },
  stageLine: { width: 20, height: 2, backgroundColor: Colors.border },
  // Manual
  manualHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  manualTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  manualSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  thumbContainer: { marginHorizontal: 16, marginTop: 12, marginBottom: 8, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  thumbImage: { width: '100%', height: 80, borderRadius: BorderRadius.lg },
  thumbOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6 },
  thumbText: { ...Typography.caption, color: Colors.accent },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 10, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.textPrimary, ...Typography.bodySm },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  dishRowSel: { borderColor: Colors.accentBorder, backgroundColor: Colors.accentBg },
  chk: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  chkSel: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dishName: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 2 },
  dishMacros: { ...Typography.caption, color: Colors.textMuted },
  fitsBadge: { backgroundColor: Colors.accentBg, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.accentBorder },
  fitsText: { ...Typography.caption, color: Colors.accent, fontSize: 10 },
  bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32, backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: BorderRadius.lg, paddingVertical: 16 },
  analyzeBtnText: { ...Typography.bodyMedium, color: Colors.bg, fontWeight: '700' },
});

let styles = createStyles();
