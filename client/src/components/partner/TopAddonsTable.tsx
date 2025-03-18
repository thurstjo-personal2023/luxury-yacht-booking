import React from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AddOnPopularityData } from '@/types/partner';
import { Package, ArrowUp, ArrowRight } from 'lucide-react';

interface TopAddonsTableProps {
  data: AddOnPopularityData[];
  isLoading?: boolean;
}

export function TopAddonsTable({ data, isLoading = false }: TopAddonsTableProps) {
  // If no data or loading, display a placeholder
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto opacity-20" />
          <p className="mt-2">No add-on usage data available</p>
        </div>
      </div>
    );
  }

  // Sort data by count in descending order
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Add-on</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Bookings</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((addon) => (
          <TableRow key={addon.id}>
            <TableCell className="font-medium">{addon.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {addon.category}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end">
                <Badge className="bg-green-100 text-green-800 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  {addon.count}
                </Badge>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}