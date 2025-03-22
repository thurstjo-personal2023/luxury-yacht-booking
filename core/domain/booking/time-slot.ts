/**
 * Time Slot Value Object
 * 
 * Represents a time slot for booking
 */

/**
 * Time slot types
 */
export enum TimeSlotType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  CUSTOM = 'custom'
}

/**
 * Time Slot value object
 */
export class TimeSlot {
  private _id: string;
  private _type: TimeSlotType;
  private _startTime: string;
  private _endTime: string;
  private _label: string;
  
  constructor(
    id: string,
    type: TimeSlotType,
    startTime: string,
    endTime: string,
    label?: string
  ) {
    this._id = id;
    this._type = type;
    this._startTime = startTime;
    this._endTime = endTime;
    this._label = label || this.generateDefaultLabel();
    
    this.validate();
  }
  
  // Getters
  get id(): string { return this._id; }
  get type(): TimeSlotType { return this._type; }
  get startTime(): string { return this._startTime; }
  get endTime(): string { return this._endTime; }
  get label(): string { return this._label; }
  
  /**
   * Validate time slot
   */
  private validate(): void {
    if (!this._id) {
      throw new Error('Time slot ID is required');
    }
    
    if (!this._startTime) {
      throw new Error('Start time is required');
    }
    
    if (!this._endTime) {
      throw new Error('End time is required');
    }
    
    // Validate time format (HH:MM)
    const timeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeFormat.test(this._startTime)) {
      throw new Error('Start time must be in the format HH:MM');
    }
    
    if (!timeFormat.test(this._endTime)) {
      throw new Error('End time must be in the format HH:MM');
    }
    
    // Validate that end time is after start time
    const [startHours, startMinutes] = this._startTime.split(':').map(Number);
    const [endHours, endMinutes] = this._endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    if (endTotalMinutes <= startTotalMinutes) {
      throw new Error('End time must be after start time');
    }
  }
  
  /**
   * Generate a default human-readable label for the time slot
   */
  private generateDefaultLabel(): string {
    // Format time for display (e.g., "9:00 AM - 1:00 PM")
    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };
    
    // Handle predefined slot types
    switch (this._type) {
      case TimeSlotType.MORNING:
        return `Morning (${formatTime(this._startTime)} - ${formatTime(this._endTime)})`;
      case TimeSlotType.AFTERNOON:
        return `Afternoon (${formatTime(this._startTime)} - ${formatTime(this._endTime)})`;
      case TimeSlotType.EVENING:
        return `Evening (${formatTime(this._startTime)} - ${formatTime(this._endTime)})`;
      default:
        return `${formatTime(this._startTime)} - ${formatTime(this._endTime)}`;
    }
  }
  
  /**
   * Get the duration of the time slot in hours
   */
  getDurationHours(): number {
    const [startHours, startMinutes] = this._startTime.split(':').map(Number);
    const [endHours, endMinutes] = this._endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    // Return duration in hours (rounded to 2 decimal places)
    return parseFloat(((endTotalMinutes - startTotalMinutes) / 60).toFixed(2));
  }
  
  /**
   * Create a plain object representation for persistence
   */
  toObject(): Record<string, any> {
    return {
      id: this._id,
      type: this._type,
      startTime: this._startTime,
      endTime: this._endTime,
      label: this._label
    };
  }
  
  /**
   * Create a TimeSlot from a plain object
   */
  static fromObject(data: Record<string, any>): TimeSlot {
    return new TimeSlot(
      data.id,
      data.type,
      data.startTime,
      data.endTime,
      data.label
    );
  }
  
  /**
   * Create a standard morning time slot
   */
  static createMorningSlot(duration: number = 4): TimeSlot {
    // Duration in hours, default to 4 hours
    const startTime = '09:00';
    const endHour = 9 + duration;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    
    return new TimeSlot(
      TimeSlotType.MORNING,
      TimeSlotType.MORNING,
      startTime,
      endTime
    );
  }
  
  /**
   * Create a standard afternoon time slot
   */
  static createAfternoonSlot(duration: number = 4): TimeSlot {
    // Duration in hours, default to 4 hours
    const startTime = '14:00';
    const endHour = 14 + duration;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    
    return new TimeSlot(
      TimeSlotType.AFTERNOON,
      TimeSlotType.AFTERNOON,
      startTime,
      endTime
    );
  }
  
  /**
   * Create a standard evening time slot
   */
  static createEveningSlot(duration: number = 4): TimeSlot {
    // Duration in hours, default to 4 hours (but cap at 6 for evening)
    const actualDuration = Math.min(duration, 6);
    const startTime = '18:00';
    const endHour = 18 + actualDuration;
    // Handle passing midnight
    const adjustedEndHour = endHour >= 24 ? endHour - 24 : endHour;
    const endTime = `${adjustedEndHour.toString().padStart(2, '0')}:00`;
    
    return new TimeSlot(
      TimeSlotType.EVENING,
      TimeSlotType.EVENING,
      startTime,
      endTime
    );
  }
}