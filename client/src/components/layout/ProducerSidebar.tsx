import React from 'react';
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { 
  BarChart,
  CircleUserRound,
  ShipIcon,
  FileText,
  CalendarIcon,
  Clock,
  Settings,
  Lock,
  Wrench,
} from "lucide-react";

export function ProducerSidebar() {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    return location.startsWith(path) ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground";
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2">
        <ShipIcon className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Producer Dashboard</h2>
      </div>
      <Separator className="my-2" />
      <div className="flex-1 px-2">
        <div className="space-y-1">
          <Link href="/dashboard/producer" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer')}`}>
            <BarChart className="h-4 w-4" />
            <span>Overview</span>
          </Link>
          <Link href="/dashboard/producer/assets" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer/assets')}`}>
            <ShipIcon className="h-4 w-4" />
            <span>Asset Management</span>
          </Link>
          <Link href="/dashboard/producer/availability" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer/availability')}`}>
            <CalendarIcon className="h-4 w-4" />
            <span>Availability & Pricing</span>
          </Link>
          <Link href="/dashboard/producer/bookings" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer/bookings')}`}>
            <Clock className="h-4 w-4" />
            <span>Bookings</span>
          </Link>
          <Link href="/dashboard/producer/reviews" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer/reviews')}`}>
            <FileText className="h-4 w-4" />
            <span>Reviews</span>
          </Link>
          <Link href="/dashboard/producer/compliance" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer/compliance')}`}>
            <Lock className="h-4 w-4" />
            <span>Compliance</span>
          </Link>
          <Link href="/dashboard/producer/profile" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer/profile')}`}>
            <CircleUserRound className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        </div>

        <Separator className="my-4" />
        
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-medium text-muted-foreground">Admin Tools</h3>
          <Link href="/dashboard/producer/admin" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer/admin')}`}>
            <Wrench className="h-4 w-4" />
            <span>Admin Utilities</span>
          </Link>
        </div>
      </div>
      <div className="px-2 py-2">
        <Link href="/dashboard/producer/settings" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/producer/settings')}`}>
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}