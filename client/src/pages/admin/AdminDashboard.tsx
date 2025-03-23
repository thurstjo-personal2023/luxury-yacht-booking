import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { 
  BarChart3, 
  LayoutDashboard, 
  LogOut, 
  Settings, 
  ShieldAlert, 
  Users,
  Menu,
  X,
  FileWarning,
  Image 
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SessionTimer } from '@/components/admin/SessionTimer';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';

// Sidebar link item
interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function SidebarLink({ icon, label, active = false, onClick }: SidebarLinkProps) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { adminUser, adminSignOut } = useAdminAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  // Check admin authentication
  useEffect(() => {
    // For now, we're just checking if adminUser exists
    // In the future, this will be handled by the useAdminAuth hook
    if (!adminUser && !localStorage.getItem('adminSessionActive')) {
      setLocation('/admin-login');
    }
  }, [adminUser, setLocation]);

  // Handle sidebar navigation
  const handleNavigation = (section: string) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    
    // For demonstration, just show a toast for sections other than dashboard
    if (section !== 'dashboard') {
      toast({
        title: 'Section Not Implemented',
        description: `The "${section}" section will be implemented in future updates.`,
      });
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await adminSignOut();
      setLocation('/admin-login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Sign Out Failed',
        description: 'There was an error signing out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Render main content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
      default:
        return (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Card className="flex-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/admin/media-validation')}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <FileWarning className="h-5 w-5 mr-2 text-primary" />
                    Media Validation Status
                  </CardTitle>
                  <CardDescription>Monitoring media integrity across all collections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-green-500">85%</div>
                      <div className="text-xs text-muted-foreground">Valid URLs</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-orange-500">10%</div>
                      <div className="text-xs text-muted-foreground">Format Issues</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-red-500">5%</div>
                      <div className="text-xs text-muted-foreground">Broken URLs</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-primary text-right font-medium">
                    View Media Validation →
                  </div>
                </CardContent>
              </Card>
              
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">System Status</CardTitle>
                  <CardDescription>Current service health and metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-green-500">Online</div>
                      <div className="text-xs text-muted-foreground">API Status</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">12ms</div>
                      <div className="text-xs text-muted-foreground">Avg. Response Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Admin actions and system events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-500 pl-4 py-1">
                      <div className="font-medium">Media Validation</div>
                      <div className="text-sm text-muted-foreground">
                        Completed full validation scan of 5 collections
                      </div>
                      <div className="text-xs text-muted-foreground">10 minutes ago</div>
                    </div>
                    <div className="border-l-4 border-green-500 pl-4 py-1">
                      <div className="font-medium">User Registration</div>
                      <div className="text-sm text-muted-foreground">
                        New producer account registered and verified
                      </div>
                      <div className="text-xs text-muted-foreground">1 hour ago</div>
                    </div>
                    <div className="border-l-4 border-orange-500 pl-4 py-1">
                      <div className="font-medium">System Update</div>
                      <div className="text-sm text-muted-foreground">
                        Security patches applied to authentication system
                      </div>
                      <div className="text-xs text-muted-foreground">Yesterday</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Security Status</CardTitle>
                  <CardDescription>Authentication and access controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">IP Whitelist</div>
                      <div className="text-sm font-medium text-green-500">Active</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">MFA Enforcement</div>
                      <div className="text-sm font-medium text-green-500">Enabled</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Session Timeout</div>
                      <div className="text-sm font-medium">15 minutes</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Last Security Audit</div>
                      <div className="text-sm font-medium">3 days ago</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile header */}
      <header className="sticky top-0 z-10 w-full bg-background border-b md:hidden">
        <div className="flex items-center justify-between p-4">
          <div className="font-semibold">Etoile Yachts Admin</div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1">
        {/* Sidebar - Desktop */}
        <aside className="w-64 border-r p-4 hidden md:block">
          <div className="flex items-center gap-2 font-bold text-xl mb-6">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span>Admin Portal</span>
          </div>
          
          <nav className="space-y-1 mb-8">
            <SidebarLink
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
              active={activeSection === 'dashboard'}
              onClick={() => handleNavigation('dashboard')}
            />
            <SidebarLink
              icon={<FileWarning className="h-5 w-5" />}
              label="Media Validation"
              active={activeSection === 'media-validation'}
              onClick={() => setLocation('/admin/media-validation')}
            />
            <SidebarLink
              icon={<BarChart3 className="h-5 w-5" />}
              label="Analytics"
              active={activeSection === 'analytics'}
              onClick={() => handleNavigation('analytics')}
            />
            <SidebarLink
              icon={<Users className="h-5 w-5" />}
              label="User Management"
              active={activeSection === 'users'}
              onClick={() => handleNavigation('users')}
            />
            <SidebarLink
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              active={activeSection === 'settings'}
              onClick={() => handleNavigation('settings')}
            />
          </nav>
          
          <Separator className="my-4" />
          
          <div className="mt-auto">
            <div className="mb-4">
              <SessionTimer />
            </div>
            
            <div className="mb-4">
              <div className="text-sm font-medium">Logged in as:</div>
              <div className="text-sm text-muted-foreground truncate">
                {adminUser?.email || 'Admin User'}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>
        
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-background z-20 md:hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 font-bold text-xl">
                  <ShieldAlert className="h-6 w-6 text-primary" />
                  <span>Admin Portal</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <nav className="space-y-2 mb-8">
                <SidebarLink
                  icon={<LayoutDashboard className="h-5 w-5" />}
                  label="Dashboard"
                  active={activeSection === 'dashboard'}
                  onClick={() => handleNavigation('dashboard')}
                />
                <SidebarLink
                  icon={<FileWarning className="h-5 w-5" />}
                  label="Media Validation"
                  active={activeSection === 'media-validation'}
                  onClick={() => {
                    setLocation('/admin/media-validation');
                    setMobileMenuOpen(false);
                  }}
                />
                <SidebarLink
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Analytics"
                  active={activeSection === 'analytics'}
                  onClick={() => handleNavigation('analytics')}
                />
                <SidebarLink
                  icon={<Users className="h-5 w-5" />}
                  label="User Management"
                  active={activeSection === 'users'}
                  onClick={() => handleNavigation('users')}
                />
                <SidebarLink
                  icon={<Settings className="h-5 w-5" />}
                  label="Settings"
                  active={activeSection === 'settings'}
                  onClick={() => handleNavigation('settings')}
                />
              </nav>
              
              <Separator className="my-4" />
              
              <div>
                <div className="mb-4">
                  <SessionTimer />
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-medium">Logged in as:</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {adminUser?.email || 'Admin User'}
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full flex items-center gap-2" 
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your Etoile Yachts platform</p>
            </div>
            
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}