import React from 'react';
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { 
  BarChart,
  CircleUserRound,
  Package,
  FileText,
  Calendar,
  DollarSign,
  Settings,
  HelpCircle,
  Briefcase,
  BadgePercent,
} from "lucide-react";

export function PartnerSidebar() {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    return location.startsWith(path) ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground";
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2">
        <Briefcase className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Partner Dashboard</h2>
      </div>
      <Separator className="my-2" />
      <div className="flex-1 px-2">
        <div className="space-y-1">
          <Link href="/dashboard/partner" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner')}`}>
            <BarChart className="h-4 w-4" />
            <span>Overview</span>
          </Link>
          <Link href="/dashboard/partner/add-ons" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner/add-ons')}`}>
            <Package className="h-4 w-4" />
            <span>Service Add-ons</span>
          </Link>
          <Link href="/dashboard/partner/bookings" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner/bookings')}`}>
            <Calendar className="h-4 w-4" />
            <span>Bookings</span>
          </Link>
          <Link href="/dashboard/partner/earnings" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner/earnings')}`}>
            <DollarSign className="h-4 w-4" />
            <span>Earnings & Payouts</span>
          </Link>
          <Link href="/dashboard/partner/promotions" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner/promotions')}`}>
            <BadgePercent className="h-4 w-4" />
            <span>Promotions</span>
          </Link>
          <Link href="/dashboard/partner/reviews" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner/reviews')}`}>
            <FileText className="h-4 w-4" />
            <span>Reviews</span>
          </Link>
          <Link href="/dashboard/partner/profile" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner/profile')}`}>
            <CircleUserRound className="h-4 w-4" />
            <span>Business Profile</span>
          </Link>
        </div>

        <Separator className="my-4" />
        
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-medium text-muted-foreground">Support</h3>
          <Link href="/dashboard/partner/help" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner/help')}`}>
            <HelpCircle className="h-4 w-4" />
            <span>Help Center</span>
          </Link>
        </div>
      </div>
      <div className="px-2 py-2">
        <Link href="/dashboard/partner/settings" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive('/dashboard/partner/settings')}`}>
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}