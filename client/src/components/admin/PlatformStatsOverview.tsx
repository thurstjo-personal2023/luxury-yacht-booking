import { useState } from 'react';
import { usePlatformStats } from '@/hooks/use-platform-stats';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, BarChart } from '@tremor/react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, AlertCircleIcon, TrendingUpIcon, TrendingDownIcon, UserIcon, CreditCardIcon, CalendarIcon } from 'lucide-react';

export function PlatformStatsOverview() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const { data, isLoading, isError, error } = usePlatformStats(period);

  const handlePeriodChange = (value: string) => {
    setPeriod(value as 'day' | 'week' | 'month' | 'year');
  };

  if (isError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Error Loading Stats</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load platform statistics.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Platform Overview</h2>
        <Tabs defaultValue="week" onValueChange={handlePeriodChange}>
          <TabsList>
            <TabsTrigger value="day">24 Hours</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Bookings Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.bookings.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {data?.bookings.totalInPeriod || 0} new in selected period
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <Badge variant="outline" className="bg-green-50">Confirmed: {data?.bookings.byStatus.confirmed || 0}</Badge>
                  <Badge variant="outline" className="bg-yellow-50">Pending: {data?.bookings.byStatus.pending || 0}</Badge>
                  <Badge variant="outline" className="bg-red-50">Cancelled: {data?.bookings.byStatus.canceled || 0}</Badge>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-2">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <AreaChart
                data={data?.bookings.trend || []}
                index="date"
                categories={['count']}
                colors={['blue']}
                valueFormatter={(value) => `${value} bookings`}
                className="h-24"
                showLegend={false}
                showXAxis={true}
                showYAxis={false}
              />
            )}
          </CardFooter>
        </Card>

        {/* Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data?.users.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {data?.users.newInPeriod || 0} new in selected period
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-50">Consumers: {data?.users.byRole.consumer || 0}</Badge>
                  <Badge variant="outline" className="bg-purple-50">Producers: {data?.users.byRole.producer || 0}</Badge>
                  <Badge variant="outline" className="bg-cyan-50">Partners: {data?.users.byRole.partner || 0}</Badge>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-2">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <AreaChart
                data={data?.users.trend || []}
                index="date"
                categories={['count']}
                colors={['green']}
                valueFormatter={(value) => `${value} users`}
                className="h-24"
                showLegend={false}
                showXAxis={true}
                showYAxis={false}
              />
            )}
          </CardFooter>
        </Card>

        {/* Transactions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.transactions.volume ? `$${data.transactions.volume.toLocaleString()}` : '$0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.transactions.totalInPeriod || 0} transactions in selected period
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <Badge variant="outline" className="bg-green-50">Successful: {data?.transactions.byStatus.successful || 0}</Badge>
                  <Badge variant="outline" className="bg-red-50">Failed: {data?.transactions.byStatus.failed || 0}</Badge>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-2">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <BarChart
                data={data?.transactions.trend || []}
                index="date"
                categories={['volume']}
                colors={['violet']}
                valueFormatter={(value) => `$${value}`}
                className="h-24"
                showLegend={false}
                showXAxis={true}
                showYAxis={false}
              />
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="mt-2 text-sm text-muted-foreground">
        <HoverCard>
          <HoverCardTrigger className="flex items-center space-x-1">
            <InfoIcon className="h-3 w-3" />
            <span>About these statistics</span>
          </HoverCardTrigger>
          <HoverCardContent>
            <p className="text-sm">
              These statistics are collected from various platform activities and are updated every 5 minutes.
              Data is shown for the selected time period based on transaction dates and other timestamps.
            </p>
          </HoverCardContent>
        </HoverCard>
      </div>
    </div>
  );
}