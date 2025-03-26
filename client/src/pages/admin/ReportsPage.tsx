import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileBarChart, 
  FileCog, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  Download, 
  Calendar 
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { adminApiRequestWithRetry } from '@/lib/adminApiUtils';
import withAdminLayout from '@/components/layouts/withAdminLayout';

// Define the types for reports
export interface Report {
  id: string;
  title: string;
  description: string;
  type: 'analytics' | 'financial' | 'system' | 'user';
  createdAt: string;
  format: 'pdf' | 'csv' | 'xlsx' | 'json';
  size: string;
  url: string;
  tags: string[];
}

function useReports(type?: string) {
  return useQuery({
    queryKey: ['/api/admin/reports', type],
    queryFn: async () => {
      try {
        const url = type ? `/api/admin/reports?type=${type}` : '/api/admin/reports';
        const response = await adminApiRequestWithRetry(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
        }
        
        return await response.json() as Report[];
      } catch (error) {
        console.error('Error fetching reports:', error);
        // Return empty array to prevent UI crashes
        return [];
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function ReportCard({ report }: { report: Report }) {
  const getIcon = () => {
    switch (report.format) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'csv':
        return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
      case 'xlsx':
        return <FileSpreadsheet className="h-6 w-6 text-blue-500" />;
      case 'json':
        return <FileCog className="h-6 w-6 text-amber-500" />;
      default:
        return <FileText className="h-6 w-6" />;
    }
  };

  const getTypeIcon = () => {
    switch (report.type) {
      case 'analytics':
        return <FileBarChart className="h-4 w-4" />;
      case 'financial':
        return <FileText className="h-4 w-4" />;
      case 'system':
        return <FileCog className="h-4 w-4" />;
      case 'user':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = () => {
    switch (report.type) {
      case 'analytics':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Analytics</Badge>;
      case 'financial':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Financial</Badge>;
      case 'system':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">System</Badge>;
      case 'user':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">User</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{report.title}</CardTitle>
            <CardDescription>{report.description}</CardDescription>
          </div>
          {getIcon()}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {getTypeBadge()}
          <Badge variant="outline" className="uppercase">{report.format}</Badge>
          {report.tags.map((tag, index) => (
            <Badge key={index} variant="secondary">{tag}</Badge>
          ))}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-1" />
          {formatDate(report.createdAt)}
          <div className="mx-2">•</div>
          <div>{report.size}</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => window.open(report.url, '_blank')}
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}

function ReportsTableView({ reports }: { reports: Report[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Format</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Size</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell className="font-medium">{report.title}</TableCell>
            <TableCell>
              <Badge 
                variant="outline" 
                className={
                  report.type === 'analytics' ? 'bg-purple-50 text-purple-700' :
                  report.type === 'financial' ? 'bg-green-50 text-green-700' :
                  report.type === 'system' ? 'bg-blue-50 text-blue-700' :
                  'bg-amber-50 text-amber-700'
                }
              >
                {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
              </Badge>
            </TableCell>
            <TableCell className="uppercase">{report.format}</TableCell>
            <TableCell>{format(new Date(report.createdAt), 'MMM d, yyyy')}</TableCell>
            <TableCell>{report.size}</TableCell>
            <TableCell className="text-right">
              <Button 
                size="sm" 
                variant="ghost" 
                className="gap-1"
                onClick={() => window.open(report.url, '_blank')}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const ReportsPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'grid' | 'table'>('grid');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: reports, isLoading, isError } = useReports(selectedType);

  const filteredReports = reports?.filter(report => 
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Access and download platform reports and analytics
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
          <Select
            value={selectedType}
            onValueChange={setSelectedType}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All report types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All report types</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-auto">
            <Input
              placeholder="Search reports..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">View</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveView('grid')}>Grid view</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('table')}>Table view</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        activeView === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="p-6">
                <Skeleton className="h-10 w-full mb-4" />
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full mb-2" />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileBarChart className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load reports</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the reports. Please try again later.
            </p>
            <Button>Retry</Button>
          </CardContent>
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No reports found</h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? `No reports matching "${searchQuery}" were found.` 
                : selectedType 
                  ? `No ${selectedType} reports are available.` 
                  : 'No reports are available.'}
            </p>
          </CardContent>
        </Card>
      ) : activeView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ReportsTableView reports={filteredReports} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default withAdminLayout(ReportsPage);