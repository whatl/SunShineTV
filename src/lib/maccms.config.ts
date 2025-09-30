
// lib/maccms.config.ts

/**
 * @file Defines the configuration for the Maccms database connection.
 * It centralizes the table prefix, making it easily configurable via environment variables.
 */

/**
 * The table prefix for the Maccms database.
 * It defaults to 'mac_' but can be overridden by the `MAC_TABLE_PREFIX` environment variable.
 * This allows the application to adapt to different database schemas without code changes.
 */
export const TABLE_PREFIX = process.env.MAC_TABLE_PREFIX || 'mac_';

/**
 * The base URL for Maccms API endpoints.
 * - If NEXT_PUBLIC_MACCMS_API_BASE is set, use it (e.g., 'http://localhost:8089')
 * - Otherwise, use empty string for Next.js API routes (default behavior)
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_MACCMS_API_BASE || '';
