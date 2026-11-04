// Location + SQLite caching service for restaurant menus
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import { DishWithMacros } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('menumind.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        restaurant_name TEXT DEFAULT '',
        dishes TEXT NOT NULL,
        last_scanned INTEGER NOT NULL
      );
    `);
  }
  return db;
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch {
    return null;
  }
}

// Check if cached menu exists within ~100m radius
export async function getCachedMenu(
  lat: number,
  lng: number
): Promise<DishWithMacros[] | null> {
  try {
    const database = await getDB();
    const radius = 0.001; // ~100 meters
    const rows = await database.getAllAsync<{ dishes: string }>(
      `SELECT dishes FROM restaurants 
       WHERE ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?
       ORDER BY last_scanned DESC LIMIT 1`,
      [lat, radius, lng, radius]
    );
    if (rows.length > 0) {
      return JSON.parse(rows[0].dishes);
    }
    return null;
  } catch {
    return null;
  }
}

export async function cacheMenu(
  lat: number,
  lng: number,
  restaurantName: string,
  dishes: DishWithMacros[]
): Promise<void> {
  try {
    const database = await getDB();
    await database.runAsync(
      `INSERT INTO restaurants (latitude, longitude, restaurant_name, dishes, last_scanned) VALUES (?, ?, ?, ?, ?)`,
      [lat, lng, restaurantName, JSON.stringify(dishes), Date.now()]
    );
  } catch (err) {
    console.error('Cache save failed:', err);
  }
}
