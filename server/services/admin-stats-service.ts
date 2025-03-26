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
  try {
    // Calculate date range
    const { startDate, endDate } = getDateRangeForPeriod(period);
    
    // Get total bookings - safely handle if collection doesn't exist
    let totalBookings = 0;
    try {
      const totalBookingsSnapshot = await adminDb.collection('bookings').count().get();
      totalBookings = totalBookingsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting total bookings count, collection may not exist:', error);
    }
    
    // Get bookings in period
    let periodBookings = 0;
    try {
      const periodBookingsSnapshot = await adminDb.collection('bookings')
        .where('createdAt', '>=', Timestamp.fromDate(startDate))
        .where('createdAt', '<=', Timestamp.fromDate(endDate))
        .count().get();
      periodBookings = periodBookingsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting period bookings count:', error);
    }
    
    // Get bookings by status
    let pendingBookings = 0;
    let confirmedBookings = 0;
    let canceledBookings = 0;
    
    try {
      const pendingBookingsSnapshot = await adminDb.collection('bookings')
        .where('status', '==', 'pending')
        .count().get();
      pendingBookings = pendingBookingsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting pending bookings count:', error);
    }
    
    try {
      const confirmedBookingsSnapshot = await adminDb.collection('bookings')
        .where('status', '==', 'confirmed')
        .count().get();
      confirmedBookings = confirmedBookingsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting confirmed bookings count:', error);
    }
    
    try {
      const canceledBookingsSnapshot = await adminDb.collection('bookings')
        .where('status', '==', 'canceled')
        .count().get();
      canceledBookings = canceledBookingsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting canceled bookings count:', error);
    }
    
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
  } catch (error) {
    console.error('Error in getPlatformBookingStats:', error);
    // Return empty stats object in case of error
    return {
      total: 0,
      totalInPeriod: 0,
      byStatus: {
        pending: 0,
        confirmed: 0,
        canceled: 0
      },
      trend: []
    };
  }
}

/**
 * Get transaction statistics
 * @param period The time period for which to retrieve stats ('day', 'week', 'month', 'year')
 */
export async function getPlatformTransactionStats(period: string) {
  try {
    // Calculate date range
    const { startDate, endDate } = getDateRangeForPeriod(period);
    
    // Get total transactions - safely handle if collection doesn't exist
    let totalTransactions = 0;
    try {
      const totalTransactionsSnapshot = await adminDb.collection('transactions').count().get();
      totalTransactions = totalTransactionsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting total transactions count, collection may not exist:', error);
    }
    
    // Get transactions in period
    let periodTransactions = 0;
    try {
      const periodTransactionsSnapshot = await adminDb.collection('transactions')
        .where('createdAt', '>=', Timestamp.fromDate(startDate))
        .where('createdAt', '<=', Timestamp.fromDate(endDate))
        .count().get();
      periodTransactions = periodTransactionsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting period transactions count:', error);
    }
    
    // Get transaction volume
    let volume = 0;
    try {
      const transactionsSnapshot = await adminDb.collection('transactions')
        .where('createdAt', '>=', Timestamp.fromDate(startDate))
        .where('createdAt', '<=', Timestamp.fromDate(endDate))
        .get();
      
      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        volume += transaction.amount || 0;
      });
    } catch (error) {
      console.log('Error calculating transaction volume:', error);
    }
    
    // Get transactions by status
    let successfulTransactions = 0;
    let failedTransactions = 0;
    
    try {
      const successfulTransactionsSnapshot = await adminDb.collection('transactions')
        .where('status', '==', 'successful')
        .count().get();
      successfulTransactions = successfulTransactionsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting successful transactions count:', error);
    }
    
    try {
      const failedTransactionsSnapshot = await adminDb.collection('transactions')
        .where('status', '==', 'failed')
        .count().get();
      failedTransactions = failedTransactionsSnapshot.data().count;
    } catch (error) {
      console.log('Error getting failed transactions count:', error);
    }
    
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
  } catch (error) {
    console.error('Error in getPlatformTransactionStats:', error);
    // Return empty stats object in case of error
    return {
      total: 0,
      totalInPeriod: 0,
      volume: 0,
      byStatus: {
        successful: 0,
        failed: 0
      },
      trend: []
    };
  }
}

/**
 * Get user statistics
 * @param period The time period for which to retrieve stats ('day', 'week', 'month', 'year')
 */
export async function getPlatformUserStats(period: string) {
  try {
    // Calculate date range
    const { startDate, endDate } = getDateRangeForPeriod(period);
    
    // Get total users - safely handle if collection doesn't exist
    let totalUsers = 0;
    try {
      const totalUsersSnapshot = await adminDb.collection('harmonized_users').count().get();
      totalUsers = totalUsersSnapshot.data().count;
    } catch (error) {
      console.log('Error getting total users count, collection may not exist:', error);
    }
    
    // Get new users in period
    let newUsers = 0;
    try {
      const newUsersSnapshot = await adminDb.collection('harmonized_users')
        .where('createdAt', '>=', Timestamp.fromDate(startDate))
        .where('createdAt', '<=', Timestamp.fromDate(endDate))
        .count().get();
      newUsers = newUsersSnapshot.data().count;
    } catch (error) {
      console.log('Error getting new users count:', error);
    }
    
    // Get users by role
    let consumerUsers = 0;
    let producerUsers = 0;
    let partnerUsers = 0;
    
    try {
      const consumerUsersSnapshot = await adminDb.collection('harmonized_users')
        .where('role', '==', 'consumer')
        .count().get();
      consumerUsers = consumerUsersSnapshot.data().count;
    } catch (error) {
      console.log('Error getting consumer users count:', error);
    }
    
    try {
      const producerUsersSnapshot = await adminDb.collection('harmonized_users')
        .where('role', '==', 'producer')
        .count().get();
      producerUsers = producerUsersSnapshot.data().count;
    } catch (error) {
      console.log('Error getting producer users count:', error);
    }
    
    try {
      const partnerUsersSnapshot = await adminDb.collection('harmonized_users')
        .where('role', '==', 'partner')
        .count().get();
      partnerUsers = partnerUsersSnapshot.data().count;
    } catch (error) {
      console.log('Error getting partner users count:', error);
    }
    
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
  } catch (error) {
    console.error('Error in getPlatformUserStats:', error);
    // Return empty stats object in case of error
    return {
      total: 0,
      newInPeriod: 0,
      byRole: {
        consumer: 0,
        producer: 0,
        partner: 0
      },
      trend: []
    };
  }
}

/**
 * Helper function to get booking trend over time
 */
async function getBookingTrend(period: string, startDate: Date, endDate: Date) {
  try {
    const intervals = getIntervals(period, startDate, endDate);
    const trend: { date: string; count: number }[] = [];
    
    for (let i = 0; i < intervals.length - 1; i++) {
      const intervalStart = intervals[i];
      const intervalEnd = intervals[i + 1];
      
      try {
        const snapshot = await adminDb.collection('bookings')
          .where('createdAt', '>=', Timestamp.fromDate(intervalStart))
          .where('createdAt', '<', Timestamp.fromDate(intervalEnd))
          .count().get();
        
        trend.push({
          date: formatTrendDate(intervalStart, period),
          count: snapshot.data().count
        });
      } catch (error) {
        console.log(`Error getting booking trend for interval ${formatTrendDate(intervalStart, period)}:`, error);
        // Still add the interval with 0 count
        trend.push({
          date: formatTrendDate(intervalStart, period),
          count: 0
        });
      }
    }
    
    return trend;
  } catch (error) {
    console.error('Error in getBookingTrend:', error);
    return [];
  }
}

/**
 * Helper function to get transaction trend over time
 */
async function getTransactionTrend(period: string, startDate: Date, endDate: Date) {
  try {
    const intervals = getIntervals(period, startDate, endDate);
    const trend: { date: string; count: number; volume: number }[] = [];
    
    for (let i = 0; i < intervals.length - 1; i++) {
      const intervalStart = intervals[i];
      const intervalEnd = intervals[i + 1];
      
      try {
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
      } catch (error) {
        console.log(`Error getting transaction trend for interval ${formatTrendDate(intervalStart, period)}:`, error);
        // Still add the interval with 0 count and volume
        trend.push({
          date: formatTrendDate(intervalStart, period),
          count: 0,
          volume: 0
        });
      }
    }
    
    return trend;
  } catch (error) {
    console.error('Error in getTransactionTrend:', error);
    return [];
  }
}

/**
 * Helper function to get user trend over time
 */
async function getUserTrend(period: string, startDate: Date, endDate: Date) {
  try {
    const intervals = getIntervals(period, startDate, endDate);
    const trend: { date: string; count: number }[] = [];
    
    for (let i = 0; i < intervals.length - 1; i++) {
      const intervalStart = intervals[i];
      const intervalEnd = intervals[i + 1];
      
      try {
        const snapshot = await adminDb.collection('harmonized_users')
          .where('createdAt', '>=', Timestamp.fromDate(intervalStart))
          .where('createdAt', '<', Timestamp.fromDate(intervalEnd))
          .count().get();
        
        trend.push({
          date: formatTrendDate(intervalStart, period),
          count: snapshot.data().count
        });
      } catch (error) {
        console.log(`Error getting user trend for interval ${formatTrendDate(intervalStart, period)}:`, error);
        // Still add the interval with 0 count
        trend.push({
          date: formatTrendDate(intervalStart, period),
          count: 0
        });
      }
    }
    
    return trend;
  } catch (error) {
    console.error('Error in getUserTrend:', error);
    return [];
  }
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