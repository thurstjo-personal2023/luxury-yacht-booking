import React from 'react';
import { Link } from 'wouter';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

import {
  LayoutDashboardIcon,
  UsersIcon,
  ImageIcon,
  BarChartIcon,
  AlertTriangleIcon,
  SettingsIcon,
  HomeIcon,
  LogOutIcon,
  FileWarningIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboardIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Media Management', href: '/admin/media', icon: ImageIcon },
    { name: 'Media Validation', href: '/admin/media-validation', icon: FileWarningIcon },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChartIcon },
    { name: 'Issues', href: '/admin/issues', icon: AlertTriangleIcon },
    { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
  ];
  
  const handleLogout = () => {
    // Navigate to logout page
    window.location.href = '/logout';
  };
  
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold">Etoile Yachts</span>
            <span className="ml-2 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
              Admin
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <HomeIcon className="mr-2 h-4 w-4" />
                Back to Site
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'Admin'} />
                    <AvatarFallback>{user?.displayName?.[0] || 'A'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.displayName || 'Admin User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-16 z-30 -ml-2 hidden h-[calc(100vh-4rem)] w-full shrink-0 md:sticky md:block">
          <div className="h-full py-6 pr-6 lg:py-8">
            <nav className="flex flex-col space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="justify-start"
                    asChild
                  >
                    <Link href={item.href}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  </Button>
                );
              })}
            </nav>
            <Separator className="my-4" />
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold">Admin Tools</p>
              <nav className="flex flex-col space-y-1">
                <Button variant="ghost" className="justify-start" asChild>
                  <Link href="/admin/database">
                    <AlertTriangleIcon className="mr-2 h-4 w-4" />
                    Database Repair
                  </Link>
                </Button>
              </nav>
            </div>
          </div>
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}