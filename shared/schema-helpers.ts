/**
 * Schema Helper Functions
 * 
 * This file provides utility functions for working with schemas and Firestore timestamps
 * across both client and server environments.
 */

/**
 * Get the current timestamp in a format compatible with both client and server
 * 
 * @returns Current timestamp
 */
export function clientNow(): any {
  // If server-side Firestore Admin SDK is available
  if (typeof window === 'undefined' && process?.env?.FIREBASE_ADMIN_INITIALIZED === 'true') {
    try {
      // Try to use server-side Firestore timestamp
      const { Timestamp } = require('firebase-admin/firestore');
      return Timestamp.now();
    } catch (error) {
      // Fall back to Date if import fails
      return new Date();
    }
  }
  
  // Client-side handling
  try {
    // Try to use client-side Firebase SDK
    const { Timestamp } = require('firebase/firestore');
    return Timestamp.now();
  } catch (error) {
    // Fall back to Date if import fails
    return new Date();
  }
}

/**
 * Convert a JavaScript Date to a timestamp compatible with both client and server
 * 
 * @param date JavaScript Date object
 * @returns Firestore-compatible timestamp
 */
export function dateToClientTimestamp(date: Date): any {
  if (!date) return null;
  
  // If server-side Firestore Admin SDK is available
  if (typeof window === 'undefined' && process?.env?.FIREBASE_ADMIN_INITIALIZED === 'true') {
    try {
      // Try to use server-side Firestore timestamp
      const { Timestamp } = require('firebase-admin/firestore');
      return Timestamp.fromDate(date);
    } catch (error) {
      // Fall back to Date if import fails
      return date;
    }
  }
  
  // Client-side handling
  try {
    // Try to use client-side Firebase SDK
    const { Timestamp } = require('firebase/firestore');
    return Timestamp.fromDate(date);
  } catch (error) {
    // Fall back to Date if import fails
    return date;
  }
}

/**
 * Convert any timestamp value to a JavaScript Date
 * 
 * @param timestamp Timestamp value (could be Firebase Timestamp, Date, or number)
 * @returns JavaScript Date object
 */
export function toClientDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  // Already a Date object
  if (timestamp instanceof Date) return timestamp;
  
  // Firebase Timestamp (has toDate method)
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Unix timestamp (milliseconds since epoch)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // ISO date string
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  // Unknown format
  console.warn('Unknown timestamp format:', timestamp);
  return null;
}

/**
 * Generate a unique ID with optional prefix
 * 
 * @param prefix Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const randomChars = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}-${randomChars}`;
}