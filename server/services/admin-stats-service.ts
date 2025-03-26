/**
 * Admin Stats Service
 * 
 * This service provides functions for retrieving platform statistics
 * for the admin dashboard, including booking, transaction, and user metrics.
 */
import { adminDb } from '../firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Get booking statistics
 * @param period The time period for which to retrieve stats ('day', 'week', 'month', 'year')
 */
export async function getPlatformBookingStats(period: string) {
  // Calculate date range
  const { startDate, endDate } = getDateRangeForPeriod(period);
  
  // Get total bookings
  const totalBookingsSnapshot = await adminDb.collection('bookings').count().get();
  const totalBookings = totalBookingsSnapshot.data().count;
  
  // Get bookings in period
  const periodBookingsSnapshot = await adminDb.collection('bookings')
    .where('createdAt', '>=', Timestamp.fromDate(startDate))
    .where('createdAt', '<=', Timestamp.fromDate(endDate))
    .count().get();
  const periodBookings = periodBookingsSnapshot.data().count;
  
  // Get bookings by status
  const pendingBookingsSnapshot = await adminDb.collection('bookings')
    .where('status', '==', 'pending')
    .count().get();
  const pendingBookings = pendingBookingsSnapshot.data().count;
  
  const confirmedBookingsSnapshot = await adminDb.collection('bookings')
    .where('status', '==', 'confirmed')
    .count().get();
  const confirmedBookings = confirmedBookingsSnapshot.data().count;
  
  const canceledBookingsSnapshot = await adminDb.collection('bookings')
    .where('status', '==', 'canceled')
    .count().get();
  const canceledBookings = canceledBookingsSnapshot.data().count;
  
  // Get trend data
  const trendData = await getBookingTrend(period, startDate, endDate);
  
  return {
    total: totalBookings,
    totalInPeriod: periodBookings,
    byStatus: {
      pending: pendingBookings,
      confirmed: confirmedBookings,
      canceled: canceledBookings
    },
    trend: trendData
  };
}

/**
 * Get transaction statistics
 * @param period The time period for which to retrieve stats ('day', 'week', 'month', 'year')
 */
export async function getPlatformTransactionStats(period: string) {
  // Calculate date range
  const { startDate, endDate } = getDateRangeForPeriod(period);
  
  // Get total transactions
  const totalTransactionsSnapshot = await adminDb.collection('transactions').count().get();
  const totalTransactions = totalTransactionsSnapshot.data().count;
  
  // Get transactions in period
  const periodTransactionsSnapshot = await adminDb.collection('transactions')
    .where('createdAt', '>=', Timestamp.fromDate(startDate))
    .where('createdAt', '<=', Timestamp.fromDate(endDate))
    .count().get();
  const periodTransactions = periodTransactionsSnapshot.data().count;
  
  // Get transaction volume
  const transactionsSnapshot = await adminDb.collection('transactions')
    .where('createdAt', '>=', Timestamp.fromDate(startDate))
    .where('createdAt', '<=', Timestamp.fromDate(endDate))
    .get();
  
  let volume = 0;
  transactionsSnapshot.forEach(doc => {
    const transaction = doc.data();
    volume += transaction.amount || 0;
  });
  
  // Get transactions by status
  const successfulTransactionsSnapshot = await adminDb.collection('transactions')
    .where('status', '==', 'successful')
    .count().get();
  const successfulTransactions = successfulTransactionsSnapshot.data().count;
  
  const failedTransactionsSnapshot = await adminDb.collection('transactions')
    .where('status', '==', 'failed')
    .count().get();
  const failedTransactions = failedTransactionsSnapshot.data().count;
  
  // Get trend data
  const trendData = await getTransactionTrend(period, startDate, endDate);
  
  return {
    total: totalTransactions,
    totalInPeriod: periodTransactions,
    volume,
    byStatus: {
      successful: successfulTransactions,
      failed: failedTransactions
    },
    trend: trendData
  };
}

/**
 * Get user statistics
 * @param period The time period for which to retrieve stats ('day', 'week', 'month', 'year')
 */
export async function getPlatformUserStats(period: string) {
  // Calculate date range
  const { startDate, endDate } = getDateRangeForPeriod(period);
  
  // Get total users
  const totalUsersSnapshot = await adminDb.collection('harmonized_users').count().get();
  const totalUsers = totalUsersSnapshot.data().count;
  
  // Get new users in period
  const newUsersSnapshot = await adminDb.collection('harmonized_users')
    .where('createdAt', '>=', Timestamp.fromDate(startDate))
    .where('createdAt', '<=', Timestamp.fromDate(endDate))
    .count().get();
  const newUsers = newUsersSnapshot.data().count;
  
  // Get users by role
  const consumerUsersSnapshot = await adminDb.collection('harmonized_users')
    .where('role', '==', 'consumer')
    .count().get();
  const consumerUsers = consumerUsersSnapshot.data().count;
  
  const producerUsersSnapshot = await adminDb.collection('harmonized_users')
    .where('role', '==', 'producer')
    .count().get();
  const producerUsers = producerUsersSnapshot.data().count;
  
  const partnerUsersSnapshot = await adminDb.collection('harmonized_users')
    .where('role', '==', 'partner')
    .count().get();
  const partnerUsers = partnerUsersSnapshot.data().count;
  
  // Get trend data
  const trendData = await getUserTrend(period, startDate, endDate);
  
  return {
    total: totalUsers,
    newInPeriod: newUsers,
    byRole: {
      consumer: consumerUsers,
      producer: producerUsers,
      partner: partnerUsers
    },
    trend: trendData
  };
}

/**
 * Helper function to get booking trend over time
 */
async function getBookingTrend(period: string, startDate: Date, endDate: Date) {
  const intervals = getIntervals(period, startDate, endDate);
  const trend: { date: string; count: number }[] = [];
  
  for (let i = 0; i < intervals.length - 1; i++) {
    const intervalStart = intervals[i];
    const intervalEnd = intervals[i + 1];
    
    const snapshot = await adminDb.collection('bookings')
      .where('createdAt', '>=', Timestamp.fromDate(intervalStart))
      .where('createdAt', '<', Timestamp.fromDate(intervalEnd))
      .count().get();
    
    trend.push({
      date: formatTrendDate(intervalStart, period),
      count: snapshot.data().count
    });
  }
  
  return trend;
}

/**
 * Helper function to get transaction trend over time
 */
async function getTransactionTrend(period: string, startDate: Date, endDate: Date) {
  const intervals = getIntervals(period, startDate, endDate);
  const trend: { date: string; count: number; volume: number }[] = [];
  
  for (let i = 0; i < intervals.length - 1; i++) {
    const intervalStart = intervals[i];
    const intervalEnd = intervals[i + 1];
    
    const snapshot = await adminDb.collection('transactions')
      .where('createdAt', '>=', Timestamp.fromDate(intervalStart))
      .where('createdAt', '<', Timestamp.fromDate(intervalEnd))
      .get();
    
    let volume = 0;
    snapshot.forEach(doc => {
      const transaction = doc.data();
      volume += transaction.amount || 0;
    });
    
    trend.push({
      date: formatTrendDate(intervalStart, period),
      count: snapshot.size,
      volume
    });
  }
  
  return trend;
}

/**
 * Helper function to get user trend over time
 */
async function getUserTrend(period: string, startDate: Date, endDate: Date) {
  const intervals = getIntervals(period, startDate, endDate);
  const trend: { date: string; count: number }[] = [];
  
  for (let i = 0; i < intervals.length - 1; i++) {
    const intervalStart = intervals[i];
    const intervalEnd = intervals[i + 1];
    
    const snapshot = await adminDb.collection('harmonized_users')
      .where('createdAt', '>=', Timestamp.fromDate(intervalStart))
      .where('createdAt', '<', Timestamp.fromDate(intervalEnd))
      .count().get();
    
    trend.push({
      date: formatTrendDate(intervalStart, period),
      count: snapshot.data().count
    });
  }
  
  return trend;
}

/**
 * Helper function to calculate date range for a period
 */
function getDateRangeForPeriod(period: string) {
  const endDate = new Date();
  let startDate = new Date();
  
  switch(period) {
    case 'day':
      startDate.setDate(endDate.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 1);
  }
  
  return { startDate, endDate };
}

/**
 * Generate intervals for trend data based on period
 */
function getIntervals(period: string, startDate: Date, endDate: Date): Date[] {
  const intervals: Date[] = [];
  const currentDate = new Date(startDate);
  
  // Add start date as first interval
  intervals.push(new Date(currentDate));
  
  // Calculate interval step based on period
  switch(period) {
    case 'day':
      // For day, use hourly intervals
      while (currentDate < endDate) {
        currentDate.setHours(currentDate.getHours() + 1);
        if (currentDate <= endDate) {
          intervals.push(new Date(currentDate));
        }
      }
      break;
      
    case 'week':
      // For week, use daily intervals
      while (currentDate < endDate) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate <= endDate) {
          intervals.push(new Date(currentDate));
        }
      }
      break;
      
    case 'month':
      // For month, use 3-day intervals
      while (currentDate < endDate) {
        currentDate.setDate(currentDate.getDate() + 3);
        if (currentDate <= endDate) {
          intervals.push(new Date(currentDate));
        }
      }
      break;
      
    case 'year':
      // For year, use monthly intervals
      while (currentDate < endDate) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        if (currentDate <= endDate) {
          intervals.push(new Date(currentDate));
        }
      }
      break;
      
    default:
      // Default to daily intervals
      while (currentDate < endDate) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate <= endDate) {
          intervals.push(new Date(currentDate));
        }
      }
  }
  
  // If the last interval doesn't match the end date, add the end date
  if (intervals[intervals.length - 1].getTime() !== endDate.getTime()) {
    intervals.push(new Date(endDate));
  }
  
  return intervals;
}

/**
 * Format date for trend data display
 */
function formatTrendDate(date: Date, period: string): string {
  switch(period) {
    case 'day':
      // For day, return hour
      return `${date.getHours()}:00`;
      
    case 'week':
      // For week, return day of week
      return date.toLocaleDateString(undefined, { weekday: 'short' });
      
    case 'month':
      // For month, return day of month
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      
    case 'year':
      // For year, return month
      return date.toLocaleDateString(undefined, { month: 'short' });
      
    default:
      // Default format
      return date.toLocaleDateString();
  }
}