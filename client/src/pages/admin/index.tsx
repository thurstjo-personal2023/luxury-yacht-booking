import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  Users, 
  Sailboat, 
  Mail, 
  CalendarClock, 
  Package, 
  TrendingUp, 
  Bell, 
  Wrench 
} from 'lucide-react';

export default function AdminDashboard() {
  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: <Users className="h-8 w-8 text-primary" />,
      href: '/admin/users',
    },
    {
      title: 'Yacht Listings',
      description: 'Manage yacht listings and availability',
      icon: <Sailboat className="h-8 w-8 text-primary" />,
      href: '/admin/yachts',
    },
    {
      title: 'Experience Packages',
      description: 'Manage experience packages and pricing',
      icon: <Package className="h-8 w-8 text-primary" />,
      href: '/admin/packages',
    },
    {
      title: 'Bookings',
      description: 'View and manage all bookings',
      icon: <CalendarClock className="h-8 w-8 text-primary" />,
      href: '/admin/bookings',
    },
    {
      title: 'Email System',
      description: 'Test and manage email notifications',
      icon: <Mail className="h-8 w-8 text-primary" />,
      href: '/admin/email-test',
    },
    {
      title: 'Reports & Analytics',
      description: 'View booking metrics and reports',
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      href: '/admin/reports',
    },
    {
      title: 'Notifications',
      description: 'Manage system notifications',
      icon: <Bell className="h-8 w-8 text-primary" />,
      href: '/admin/notifications',
    },
    {
      title: 'System Settings',
      description: 'Configure system preferences',
      icon: <Wrench className="h-8 w-8 text-primary" />,
      href: '/admin/settings',
    },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            <Button>View Website</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">87</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500">+12%</span> from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">23</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500">+3</span> new this week
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bookings This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">42</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500">+24%</span> from last month
              </p>
            </CardContent>
          </Card>
        </div>
        
        <h2 className="text-xl font-semibold mb-6">Admin Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminModules.map((module, index) => (
            <Link key={index} href={module.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    {module.icon}
                  </div>
                  <CardTitle className="text-lg mt-4">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="ghost" className="p-0 h-auto">
                    <span className="text-primary">Access module</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}