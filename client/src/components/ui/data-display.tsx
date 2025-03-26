import { AreaChart as TremorAreaChart } from '@tremor/react';
import { BarChart as TremorBarChart } from '@tremor/react';
import { Card, CardContent } from '@/components/ui/card';

interface ChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  className?: string;
  showLegend?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
}

export function AreaChart({
  data,
  index,
  categories,
  colors = ['blue', 'green', 'amber'],
  valueFormatter = (value) => `${value}`,
  className = 'h-80',
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
}: ChartProps) {
  return (
    <TremorAreaChart
      data={data}
      index={index}
      categories={categories}
      colors={colors}
      valueFormatter={valueFormatter}
      className={className}
      showLegend={showLegend}
      showXAxis={showXAxis}
      showYAxis={showYAxis}
      autoMinValue={true}
      curveType="natural"
    />
  );
}

export function BarChart({
  data,
  index,
  categories,
  colors = ['blue', 'green', 'amber'],
  valueFormatter = (value) => `${value}`,
  className = 'h-80',
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
}: ChartProps) {
  return (
    <TremorBarChart
      data={data}
      index={index}
      categories={categories}
      colors={colors}
      valueFormatter={valueFormatter}
      className={className}
      showLegend={showLegend}
      showXAxis={showXAxis}
      showYAxis={showYAxis}
      autoMinValue={true}
    />
  );
}