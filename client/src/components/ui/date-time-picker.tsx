import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  available: boolean;
}

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  duration: number; // duration in hours
  timeSlot: TimeSlot | undefined;
  setTimeSlot: (timeSlot: TimeSlot | undefined) => void;
  availableTimeSlots: TimeSlot[];
  className?: string;
  onDateSelect?: (date: Date) => Promise<TimeSlot[]>;
}

export function DateTimePicker({
  date,
  setDate,
  duration,
  timeSlot,
  setTimeSlot,
  availableTimeSlots: initialTimeSlots,
  className,
  onDateSelect
}: DateTimePickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeSlotOpen, setIsTimeSlotOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots);

  // When date changes, fetch available time slots
  useEffect(() => {
    async function updateTimeSlots() {
      if (date && onDateSelect) {
        try {
          const newTimeSlots = await onDateSelect(date);
          setTimeSlots(newTimeSlots);
          
          // Clear selected time slot if it's no longer available
          if (timeSlot && !newTimeSlots.find(ts => ts.id === timeSlot.id)?.available) {
            setTimeSlot(undefined);
          }
        } catch (error) {
          console.error("Error fetching time slots:", error);
        }
      }
    }
    
    if (date) {
      updateTimeSlots();
    }
  }, [date, onDateSelect, setTimeSlot, timeSlot]);

  // Generate default time slots based on duration
  useEffect(() => {
    if (!onDateSelect && initialTimeSlots.length === 0) {
      // If no custom slots provided, generate default slots
      const defaultSlots: TimeSlot[] = [];
      
      // Standard starting times
      const startTimes = ["09:00", "13:00", "17:00"];
      
      startTimes.forEach((startTime, index) => {
        const [startHour, startMinute] = startTime.split(":").map(Number);
        const endHour = startHour + duration;
        const endTime = `${endHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;
        
        defaultSlots.push({
          id: `slot-${index}`,
          startTime,
          endTime,
          label: `${startTime} - ${endTime}`,
          available: true
        });
      });
      
      setTimeSlots(defaultSlots);
    }
  }, [duration, initialTimeSlots, onDateSelect]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
            {date ? format(date, "PPP") : <span>Select date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate);
              setIsCalendarOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Popover open={isTimeSlotOpen} onOpenChange={setIsTimeSlotOpen}>
        <PopoverTrigger asChild>
          <Button
            id="time-slot"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !timeSlot && "text-muted-foreground",
              !date && "opacity-50 cursor-not-allowed"
            )}
            disabled={!date}
          >
            <Clock className="mr-2 h-4 w-4" />
            {timeSlot ? (
              <span>{timeSlot.label}</span>
            ) : (
              <span>Select time slot</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <h4 className="font-medium">Available Time Slots</h4>
            {timeSlots.length > 0 ? (
              <RadioGroup 
                value={timeSlot?.id} 
                onValueChange={(value) => {
                  const selected = timeSlots.find(slot => slot.id === value);
                  if (selected) {
                    setTimeSlot(selected);
                    setIsTimeSlotOpen(false);
                  }
                }}
              >
                <div className="space-y-2">
                  {timeSlots.map(slot => (
                    <div key={slot.id} className={cn(
                      "flex items-center space-x-2 rounded-md border p-2",
                      !slot.available && "opacity-50 cursor-not-allowed"
                    )}>
                      <RadioGroupItem 
                        value={slot.id} 
                        id={slot.id} 
                        disabled={!slot.available} 
                      />
                      <Label 
                        htmlFor={slot.id} 
                        className={cn(
                          "flex-1 cursor-pointer",
                          !slot.available && "cursor-not-allowed"
                        )}
                      >
                        {slot.label}
                        {!slot.available && (
                          <span className="ml-2 text-sm text-muted-foreground">(Unavailable)</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <p className="text-sm text-muted-foreground">
                No time slots available for the selected date.
              </p>
            )}

            {!date && (
              <p className="text-sm text-muted-foreground">
                Please select a date first.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}