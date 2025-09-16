
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
