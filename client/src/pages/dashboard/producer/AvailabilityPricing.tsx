import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { addDays, format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CreditCard, 
  DollarSign, 
  Edit, 
  ExternalLink, 
  Plus, 
  Save, 
  Trash, 
  X 
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, Timestamp, deleteDoc } from "firebase/firestore";
import { 
  AvailabilitySchedule,
  TimeSlot,
  YachtExperience
} from "@shared/firestore-schema";

// Time slot utility functions
const DEFAULT_TIME_SLOTS = [
  { id: "morning", startTime: "09:00", endTime: "12:00", label: "Morning (9am - 12pm)" },
  { id: "afternoon", startTime: "13:00", endTime: "16:00", label: "Afternoon (1pm - 4pm)" },
  { id: "evening", startTime: "17:00", endTime: "20:00", label: "Evening (5pm - 8pm)" },
];

function generateDefaultTimeSlots(): TimeSlot[] {
  return DEFAULT_TIME_SLOTS.map(slot => ({
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    available: true,
    price: undefined,
  }));
}

interface SelectedDateInfo {
  date: Date;
  scheduleId?: string;
  timeSlots: TimeSlot[];
  specialPricing?: {
    type: 'discount' | 'surge';
    percentage: number;
    reason?: string;
  };
  isFullyBooked: boolean;
  isDayOff: boolean;
}

interface ScheduleByYacht {
  [yachtId: string]: {
    schedules: {
      [dateKey: string]: AvailabilitySchedule
    };
    name: string;
    basePrice: number;
  }
}

export default function AvailabilityPricing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedYacht, setSelectedYacht] = useState<string | null>(null);
  const [producerYachts, setProducerYachts] = useState<YachtExperience[]>([]);
  const [schedulesByYacht, setSchedulesByYacht] = useState<ScheduleByYacht>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDateInfo, setSelectedDateInfo] = useState<SelectedDateInfo | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Fetch producer's yachts and their availability schedules
  useEffect(() => {
    const fetchYachtsAndSchedules = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLocation("/login");
          return;
        }
        
        // Fetch producer's yachts
        const yachtsRef = collection(db, "yacht_experiences");
        const q = query(yachtsRef, where("providerId", "==", user.uid));
        const yachtSnapshots = await getDocs(q);
        
        if (yachtSnapshots.empty) {
          setLoading(false);
          return;
        }
        
        const yachts: YachtExperience[] = [];
        const newSchedulesByYacht: ScheduleByYacht = {};
        
        // Process each yacht
        for (const yachtDoc of yachtSnapshots.docs) {
          const yacht = yachtDoc.data() as YachtExperience;
          yachts.push(yacht);
          
          // Fetch availability schedules for this yacht
          const schedulesRef = collection(db, "availability_schedules");
          const scheduleQuery = query(schedulesRef, where("assetId", "==", yacht.package_id));
          const scheduleSnapshots = await getDocs(scheduleQuery);
          
          const schedules: { [dateKey: string]: AvailabilitySchedule } = {};
          
          scheduleSnapshots.forEach(scheduleDoc => {
            const schedule = scheduleDoc.data() as AvailabilitySchedule;
            const dateKey = format(schedule.date.toDate(), 'yyyy-MM-dd');
            schedules[dateKey] = schedule;
          });
          
          newSchedulesByYacht[yacht.package_id] = {
            schedules,
            name: yacht.title,
            basePrice: yacht.pricing
          };
        }
        
        setProducerYachts(yachts);
        setSchedulesByYacht(newSchedulesByYacht);
        
        // Set first yacht as selected if none is selected
        if (yachts.length > 0 && !selectedYacht) {
          setSelectedYacht(yachts[0].package_id);
        }
      } catch (error) {
        console.error("Error fetching yachts and schedules:", error);
        toast({
          title: "Error",
          description: "Failed to load your yachts and availability schedules.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchYachtsAndSchedules();
  }, [setLocation, toast]);
  
  // Update selected date info when a date or yacht is selected
  useEffect(() => {
    if (!selectedDate || !selectedYacht) return;
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const yachtSchedules = schedulesByYacht[selectedYacht]?.schedules || {};
    
    if (dateKey in yachtSchedules) {
      // Existing schedule for this date
      const schedule = yachtSchedules[dateKey];
      setSelectedDateInfo({
        date: selectedDate,
        scheduleId: schedule.scheduleId,
        timeSlots: schedule.timeSlots,
        specialPricing: schedule.specialPricing,
        isFullyBooked: schedule.isFullyBooked,
        isDayOff: schedule.isDayOff
      });
    } else {
      // No schedule exists for this date, create default
      setSelectedDateInfo({
        date: selectedDate,
        timeSlots: generateDefaultTimeSlots(),
        isFullyBooked: false,
        isDayOff: false
      });
    }
    
    setEditMode(false);
  }, [selectedDate, selectedYacht, schedulesByYacht]);
  
  // Save the schedule for the selected date
  const saveSchedule = async () => {
    if (!selectedDateInfo || !selectedYacht || !auth.currentUser) return;
    
    setSaving(true);
    
    try {
      const dateKey = format(selectedDateInfo.date, 'yyyy-MM-dd');
      
      if (selectedDateInfo.scheduleId) {
        // Update existing schedule
        const scheduleRef = doc(db, "availability_schedules", selectedDateInfo.scheduleId);
        await updateDoc(scheduleRef, {
          timeSlots: selectedDateInfo.timeSlots,
          specialPricing: selectedDateInfo.specialPricing || null,
          isFullyBooked: selectedDateInfo.isFullyBooked,
          isDayOff: selectedDateInfo.isDayOff,
        });
      } else {
        // Create new schedule
        const newSchedule: AvailabilitySchedule = {
          scheduleId: `schedule-${Date.now()}`,
          assetId: selectedYacht,
          date: Timestamp.fromDate(selectedDateInfo.date),
          timeSlots: selectedDateInfo.timeSlots,
          specialPricing: selectedDateInfo.specialPricing,
          isFullyBooked: selectedDateInfo.isFullyBooked,
          isDayOff: selectedDateInfo.isDayOff
        };
        
        await addDoc(collection(db, "availability_schedules"), newSchedule);
        
        // Update local state with the new schedule ID
        setSelectedDateInfo({
          ...selectedDateInfo,
          scheduleId: newSchedule.scheduleId
        });
      }
      
      // Update local state
      setSchedulesByYacht({
        ...schedulesByYacht,
        [selectedYacht]: {
          ...schedulesByYacht[selectedYacht],
          schedules: {
            ...schedulesByYacht[selectedYacht].schedules,
            [dateKey]: {
              scheduleId: selectedDateInfo.scheduleId || `schedule-${Date.now()}`,
              assetId: selectedYacht,
              date: Timestamp.fromDate(selectedDateInfo.date),
              timeSlots: selectedDateInfo.timeSlots,
              specialPricing: selectedDateInfo.specialPricing,
              isFullyBooked: selectedDateInfo.isFullyBooked,
              isDayOff: selectedDateInfo.isDayOff
            }
          }
        }
      });
      
      toast({
        title: "Schedule Saved",
        description: `Availability settings for ${format(selectedDateInfo.date, 'MMMM d, yyyy')} have been saved.`,
      });
      
      setEditMode(false);
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save availability schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Handle time slot availability toggle
  const toggleTimeSlotAvailability = (slotId: string) => {
    if (!selectedDateInfo || !editMode) return;
    
    setSelectedDateInfo({
      ...selectedDateInfo,
      timeSlots: selectedDateInfo.timeSlots.map(slot => 
        slot.id === slotId ? { ...slot, available: !slot.available } : slot
      )
    });
  };
  
  // Handle time slot price change
  const updateTimeSlotPrice = (slotId: string, price: string) => {
    if (!selectedDateInfo || !editMode) return;
    
    const numPrice = parseFloat(price);
    
    setSelectedDateInfo({
      ...selectedDateInfo,
      timeSlots: selectedDateInfo.timeSlots.map(slot => 
        slot.id === slotId ? { ...slot, price: isNaN(numPrice) ? undefined : numPrice } : slot
      )
    });
  };
  
  // Toggle day off status
  const toggleDayOff = () => {
    if (!selectedDateInfo || !editMode) return;
    
    setSelectedDateInfo({
      ...selectedDateInfo,
      isDayOff: !selectedDateInfo.isDayOff,
      // If turning on day off, also mark as fully booked
      isFullyBooked: !selectedDateInfo.isDayOff ? true : selectedDateInfo.isFullyBooked
    });
  };
  
  // Toggle fully booked status
  const toggleFullyBooked = () => {
    if (!selectedDateInfo || !editMode) return;
    
    setSelectedDateInfo({
      ...selectedDateInfo,
      isFullyBooked: !selectedDateInfo.isFullyBooked
    });
  };
  
  // Update special pricing
  const updateSpecialPricing = (type: 'discount' | 'surge', percentage: number, reason?: string) => {
    if (!selectedDateInfo || !editMode) return;
    
    if (percentage === 0) {
      // Remove special pricing if percentage is 0
      const { specialPricing, ...rest } = selectedDateInfo;
      setSelectedDateInfo(rest);
    } else {
      setSelectedDateInfo({
        ...selectedDateInfo,
        specialPricing: {
          type,
          percentage,
          reason
        }
      });
    }
  };
  
  // Render date cell with availability info
  const renderDateCell = (date: Date) => {
    if (!selectedYacht) return null;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    const schedule = schedulesByYacht[selectedYacht]?.schedules?.[dateKey];
    
    let status = "available";
    let badge = null;
    
    if (schedule) {
      if (schedule.isDayOff) {
        status = "day-off";
        badge = <Badge variant="outline" className="bg-gray-100 text-gray-500 w-6 h-6 flex items-center justify-center p-0">OFF</Badge>;
      } else if (schedule.isFullyBooked) {
        status = "fully-booked";
        badge = <Badge variant="outline" className="bg-red-100 text-red-500 w-6 h-6 flex items-center justify-center p-0">FULL</Badge>;
      } else if (schedule.specialPricing) {
        status = schedule.specialPricing.type === 'discount' ? 'discount' : 'surge';
        const symbol = schedule.specialPricing.type === 'discount' ? '-' : '+';
        badge = (
          <Badge variant="outline" className={`${schedule.specialPricing.type === 'discount' ? 'bg-green-100 text-green-500' : 'bg-amber-100 text-amber-500'} w-6 h-6 flex items-center justify-center p-0`}>
            {symbol}{schedule.specialPricing.percentage}%
          </Badge>
        );
      } else {
        // Available but has custom settings
        const availableSlots = schedule.timeSlots.filter(slot => slot.available).length;
        if (availableSlots < schedule.timeSlots.length && availableSlots > 0) {
          status = "partial";
          badge = <Badge variant="outline" className="bg-blue-100 text-blue-500 w-6 h-6 flex items-center justify-center p-0">{availableSlots}</Badge>;
        }
      }
    }
    
    return (
      <div className="w-full h-full relative">
        <div className="absolute top-0 right-0">
          {badge}
        </div>
      </div>
    );
  };
  
  // Calculate pricing preview based on selected yacht and date
  const calculatePricePreview = () => {
    if (!selectedYacht || !selectedDateInfo) return null;
    
    const basePrice = schedulesByYacht[selectedYacht]?.basePrice || 0;
    
    // If day off, price is not available
    if (selectedDateInfo.isDayOff) {
      return "Not Available";
    }
    
    // If fully booked, show just the base price
    if (selectedDateInfo.isFullyBooked) {
      return `$${basePrice.toLocaleString()}`;
    }
    
    // Apply special pricing if available
    let adjustedPrice = basePrice;
    if (selectedDateInfo.specialPricing) {
      const adjustment = basePrice * (selectedDateInfo.specialPricing.percentage / 100);
      adjustedPrice = selectedDateInfo.specialPricing.type === 'discount' 
        ? basePrice - adjustment 
        : basePrice + adjustment;
    }
    
    // Check for slot specific pricing
    const hasCustomSlotPricing = selectedDateInfo.timeSlots.some(slot => slot.available && slot.price !== undefined);
    
    if (hasCustomSlotPricing) {
      const priceRange = selectedDateInfo.timeSlots
        .filter(slot => slot.available)
        .map(slot => slot.price !== undefined ? slot.price : adjustedPrice)
        .reduce(
          ([min, max], price) => [Math.min(min, price), Math.max(max, price)],
          [Infinity, -Infinity]
        );
      
      return priceRange[0] === priceRange[1]
        ? `$${priceRange[0].toLocaleString()}`
        : `$${priceRange[0].toLocaleString()} - $${priceRange[1].toLocaleString()}`;
    }
    
    return `$${adjustedPrice.toLocaleString()}`;
  };
  
  // Navigation functions
  const goToDashboard = () => setLocation("/dashboard/producer");
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 mb-4" 
            onClick={goToDashboard}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold">Availability & Pricing</h1>
          <p className="text-muted-foreground">
            Manage when your yachts are available and set custom pricing
          </p>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 h-96 bg-muted animate-pulse rounded-lg" />
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
        ) : producerYachts.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center justify-center py-10">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Yacht Profiles Found</h3>
              <p className="text-muted-foreground mb-6">
                You need to add a yacht before setting up availability and pricing.
              </p>
              <Button onClick={() => setLocation("/dashboard/producer/assets/new-yacht")}>
                Add Your First Yacht
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Availability Calendar</CardTitle>
                      <CardDescription>
                        Select a yacht and date to manage availability
                      </CardDescription>
                    </div>
                    {/* Yacht Selector */}
                    <div className="w-48">
                      <Select 
                        value={selectedYacht || undefined}
                        onValueChange={(value) => setSelectedYacht(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a yacht" />
                        </SelectTrigger>
                        <SelectContent>
                          {producerYachts.map(yacht => (
                            <SelectItem key={yacht.package_id} value={yacht.package_id}>
                              {yacht.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border w-full"
                    disabled={{ before: new Date() }}
                  />
                </CardContent>
                <CardFooter className="border-t px-6 py-4 flex justify-between">
                  <div className="flex items-center gap-x-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded-sm" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded-sm" />
                      <span>Partial</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-red-100 border border-red-300 rounded-sm" />
                      <span>Fully Booked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded-sm" />
                      <span>Day Off</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
            
            {/* Date Details */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDate 
                      ? format(selectedDate, 'MMMM d, yyyy')
                      : 'Select a Date'
                    }
                  </CardTitle>
                  <CardDescription>
                    {selectedYacht && selectedDate
                      ? `Manage availability for ${schedulesByYacht[selectedYacht]?.name}`
                      : 'Select a yacht and date to continue'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDate && selectedYacht && selectedDateInfo ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">Price Preview</h3>
                          <div className="text-2xl font-bold mt-1">
                            {calculatePricePreview()}
                          </div>
                        </div>
                        {editMode ? (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditMode(false)}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={saveSchedule}
                              disabled={saving}
                              className="flex items-center gap-1"
                            >
                              <Save className="h-4 w-4" />
                              Save Changes
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setEditMode(true)}
                            disabled={saving}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="day-off">Day Off</Label>
                          <Switch 
                            id="day-off" 
                            checked={selectedDateInfo.isDayOff}
                            onCheckedChange={toggleDayOff}
                            disabled={!editMode || saving}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="fully-booked">Mark as Fully Booked</Label>
                          <Switch 
                            id="fully-booked" 
                            checked={selectedDateInfo.isFullyBooked}
                            onCheckedChange={toggleFullyBooked}
                            disabled={!editMode || saving || selectedDateInfo.isDayOff}
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Special Pricing */}
                      <div className="space-y-3">
                        <h3 className="font-medium">Special Pricing</h3>
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <Select
                            disabled={!editMode || saving || selectedDateInfo.isDayOff}
                            value={selectedDateInfo.specialPricing?.type || "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                // Remove special pricing
                                updateSpecialPricing('discount', 0);
                              } else {
                                // Set or update special pricing
                                updateSpecialPricing(
                                  value as 'discount' | 'surge',
                                  selectedDateInfo.specialPricing?.percentage || 10,
                                  selectedDateInfo.specialPricing?.reason
                                );
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pricing Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Regular Price</SelectItem>
                              <SelectItem value="discount">Discount</SelectItem>
                              <SelectItem value="surge">Surge Pricing</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="0"
                              value={selectedDateInfo.specialPricing?.percentage || ""}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value) && value >= 0 && value <= 100) {
                                  updateSpecialPricing(
                                    selectedDateInfo.specialPricing?.type || 'discount',
                                    value,
                                    selectedDateInfo.specialPricing?.reason
                                  );
                                }
                              }}
                              min={0}
                              max={100}
                              disabled={!editMode || saving || selectedDateInfo.isDayOff || !selectedDateInfo.specialPricing}
                              className="w-full"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                        </div>
                        
                        <Input
                          placeholder="Reason for special pricing (e.g., Holiday, Event)"
                          value={selectedDateInfo.specialPricing?.reason || ""}
                          onChange={(e) => {
                            if (selectedDateInfo.specialPricing) {
                              updateSpecialPricing(
                                selectedDateInfo.specialPricing.type,
                                selectedDateInfo.specialPricing.percentage,
                                e.target.value
                              );
                            }
                          }}
                          disabled={!editMode || saving || selectedDateInfo.isDayOff || !selectedDateInfo.specialPricing}
                          className="w-full"
                        />
                      </div>
                      
                      <Separator />
                      
                      {/* Time Slots */}
                      <div className="space-y-3">
                        <h3 className="font-medium">Time Slots</h3>
                        {selectedDateInfo.isDayOff ? (
                          <div className="text-center py-4 text-muted-foreground">
                            Time slots not available for days off
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedDateInfo.timeSlots.map((slot) => (
                              <div key={slot.id} className="p-3 border rounded-lg flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${slot.available ? 'bg-green-500' : 'bg-gray-300'}`} />
                                  <div>
                                    <p className="font-medium">{slot.startTime} - {slot.endTime}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {DEFAULT_TIME_SLOTS.find(s => s.id === slot.id)?.label}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {editMode && !selectedDateInfo.isFullyBooked && (
                                    <div className="relative">
                                      <DollarSign className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                                      <Input
                                        type="number"
                                        placeholder="Custom"
                                        value={slot.price || ""}
                                        onChange={(e) => updateTimeSlotPrice(slot.id, e.target.value)}
                                        disabled={!slot.available || saving}
                                        className="w-24 pl-8"
                                      />
                                    </div>
                                  )}
                                  <Button
                                    variant={slot.available ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleTimeSlotAvailability(slot.id)}
                                    disabled={!editMode || saving || selectedDateInfo.isFullyBooked}
                                  >
                                    {slot.available ? (
                                      <Check className="h-4 w-4 mr-1" />
                                    ) : (
                                      <X className="h-4 w-4 mr-1" />
                                    )}
                                    {slot.available ? "Available" : "Unavailable"}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                      <h3 className="font-medium text-lg mb-1">No Date Selected</h3>
                      <p className="text-muted-foreground">
                        Select a date on the calendar to manage availability
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* Help Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Availability Management Tips</CardTitle>
            <CardDescription>
              Best practices for managing your yacht availability
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  Plan Ahead
                </h3>
                <p className="text-sm text-muted-foreground">
                  Update your availability calendar at least 3 months in advance to increase booking opportunities.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Seasonal Pricing
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use surge pricing during peak seasons and discounts during off-seasons to optimize occupancy.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Time Slot Management
                </h3>
                <p className="text-sm text-muted-foreground">
                  Customize time slots based on your crew's availability and consider turnaround time between bookings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}