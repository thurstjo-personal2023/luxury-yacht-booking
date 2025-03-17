import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PartnerSidebar } from "@/components/layout/PartnerSidebar";
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  AlertCircle 
} from "lucide-react";
import { usePartnerAddons } from "@/hooks/partner/usePartnerQueries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { PartnerAddon } from "@/types/partner";

export default function AddOns() {
  const [, navigate] = useLocation();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: addons, isLoading, isError } = usePartnerAddons();

  // Role verification - redirect if not a partner
  useEffect(() => {
    if (user && userRole !== "partner") {
      toast({
        title: "Access Restricted",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [user, userRole, navigate, toast]);

  // Filter add-ons based on search term
  const filteredAddons = addons?.filter(addon => 
    addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    addon.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    addon.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Format price as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden md:block w-64 border-r bg-background">
          <PartnerSidebar />
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold">Service Add-ons</h1>
                  <p className="text-muted-foreground">
                    Manage your services offered to yacht customers
                  </p>
                </div>
                <Link href="/dashboard/partner/add-ons/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Service
                  </Button>
                </Link>
              </div>

              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle>Services Overview</CardTitle>
                  <CardDescription>
                    All your available services that can be added to yacht bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search services..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {addons?.filter(addon => addon.availability !== false)?.length || 0} Active
                      </Badge>
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                        {addons?.filter(addon => addon.availability === false)?.length || 0} Inactive
                      </Badge>
                    </div>
                  </div>

                  {isLoading && (
                    <div className="py-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading services...</p>
                    </div>
                  )}

                  {isError && (
                    <div className="py-8 text-center">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-destructive font-medium">Failed to load services</p>
                      <p className="text-muted-foreground">Please try again later</p>
                    </div>
                  )}

                  {!isLoading && !isError && addons?.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                      <h3 className="text-lg font-medium">No services yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first service add-on to get started
                      </p>
                      <Link href="/dashboard/partner/add-ons/create">
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Add New Service
                        </Button>
                      </Link>
                    </div>
                  )}

                  {!isLoading && !isError && addons && addons.length > 0 && (
                    <>
                      {filteredAddons.length === 0 ? (
                        <div className="text-center py-8">
                          <Search className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-2" />
                          <p className="text-muted-foreground">No services match your search</p>
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Service</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredAddons.map((addon) => (
                                <TableRow key={addon.id}>
                                  <TableCell>
                                    <div className="flex items-center">
                                      {addon.media && addon.media[0] ? (
                                        <div className="w-10 h-10 rounded bg-muted mr-3 overflow-hidden">
                                          <img 
                                            src={addon.media[0].url} 
                                            alt={addon.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-10 h-10 rounded bg-primary/10 mr-3 flex items-center justify-center">
                                          <Package className="h-5 w-5 text-primary" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium">{addon.name}</p>
                                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                                          {addon.description.substring(0, 60)}
                                          {addon.description.length > 60 ? "..." : ""}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{addon.category}</TableCell>
                                  <TableCell>
                                    <span className="font-medium">
                                      {formatCurrency(addon.pricing)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={addon.availability !== false ? "outline" : "secondary"}
                                      className={addon.availability !== false ? "bg-green-50 text-green-700 border-green-200" : ""}
                                    >
                                      {addon.availability !== false ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="ghost" size="icon">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}