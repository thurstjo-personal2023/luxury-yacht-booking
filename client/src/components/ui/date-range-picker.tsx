"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CalendarDateRangePickerProps {
  className?: string;
  date: DateRange | undefined;
  setDate?: (date: DateRange | undefined) => void;
  onDateRangeChange?: (date: DateRange | undefined) => void; // Add this prop as an alternative
  onDateChange?: (date: Date) => boolean; // For disabling specific dates
}

export function CalendarDateRangePicker({
  className,
  date,
  setDate,
  onDateRangeChange,
  onDateChange,
}: CalendarDateRangePickerProps) {
  // Handle date changes using either prop
  const handleDateChange = (newDate: DateRange | undefined) => {
    if (setDate) setDate(newDate);
    if (onDateRangeChange) onDateRangeChange(newDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            disabled={(date) =>
              onDateChange ? onDateChange(date) : date < new Date() || date > addDays(new Date(), 90)
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}