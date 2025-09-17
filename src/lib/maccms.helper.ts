
// lib/maccms.helper.ts

/**
 * @file Provides helper functions for interacting with the Maccms database,
 * with a focus on handling the category tree structure and caching for performance.
 */

import { TABLE_PREFIX } from './maccms.config';
import { queryCmsDB } from './maccms.db';

interface MacType {
  type_id: number;
  type_name: string;
  type_en: string;
  type_pid: number;
}

// In-memory cache for the category tree.
let categoryTreeCache: MacType[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000 * 5; // 5小时

/**
 * Fetches the entire category table from the database and caches it in memory.
 * The cache is invalidated after a set duration to allow for updates.
 * @returns A promise that resolves to the array of all categories.
 */
async function getCategoryTree(): Promise<MacType[]> {
  const now = Date.now();
  if (categoryTreeCache && (now - cacheTimestamp < CACHE_DURATION)) {
    
    return categoryTreeCache;
  }

  
  const sql = `SELECT type_id, type_name, type_en, type_pid FROM ${TABLE_PREFIX}type WHERE type_status = 1`;
  const categories = await queryCmsDB<MacType[]>(sql);
  
  categoryTreeCache = categories;
  cacheTimestamp = now;
  
  return categories;
}

/**
 * Finds all descendant category IDs for a given parent category English name.
 * @param typeEn The English name of the parent category (e.g., 'TV').
 * @returns A promise that resolves to an array of all relevant category IDs, including the parent's.
 */
export async function getChildCategoryIds(typeEn: string): Promise<number[]> {
  const allCategories = await getCategoryTree();

  // Find the root category node based on the English name.
  const rootCategory = allCategories.find(cat => cat.type_en.toLowerCase() === typeEn.toLowerCase());

  if (!rootCategory) {
    return []; // If the root category is not found, return an empty array.
  }

  const allIds: number[] = [rootCategory.type_id];
  const queue: number[] = [rootCategory.type_id];

  // Use a breadth-first search (BFS) to find all descendants.
  while (queue.length > 0) {
    const currentParentId = queue.shift();
    if (currentParentId === undefined) continue;
    const children = allCategories.filter(cat => cat.type_pid === currentParentId);
    for (const child of children) {
      allIds.push(child.type_id);
      queue.push(child.type_id);
    }
  }

  return allIds;
}

/**
 * A simple mapping from frontend-friendly short names to the `type_en` field in the database.
 */
const categoryEnMap: { [key: string]: string } = {
  movie: 'Movie',
  tv: 'TV',
  anime: 'Anime',
  show: 'Show',
  drama: 'Drama',
};

/**
 * Translates a short category name from the frontend to the full `type_en` name.
 * @param shortName The short name used in the frontend (e.g., 'tv').
 * @returns The corresponding full `type_en` name (e.g., 'TV').
 */
export function translateCategory(shortName: string): string {
  return categoryEnMap[shortName.toLowerCase()] || '';
}
