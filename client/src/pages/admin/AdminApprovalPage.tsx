import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import axios from 'axios';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  User, 
  UserCheck,
  UserX,
  Info,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthService } from '@/services/auth/use-auth-service';

/**
 * Approval Request Interface
 */
interface ApprovalRequest {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  adminDepartment: string;
  adminPosition: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin Approval Page Component
 * 
 * This component allows super admins to review and process admin approval requests
 */
const AdminApprovalPage: React.FC = () => {
  // State
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [processedApprovals, setProcessedApprovals] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  
  // Get toast from hook
  const { toast } = useToast();
  
  // Get auth from service
  const { user, profileData } = useAuthService();
  
  // Determine admin status from profile data
  const isAdmin = profileData?.harmonizedUser?.isAdmin && (
    profileData?.harmonizedUser?.adminRole === 'ADMIN' || 
    profileData?.harmonizedUser?.adminRole === 'SUPER_ADMIN'
  );
  const isSuperAdmin = profileData?.harmonizedUser?.isAdmin && 
    profileData?.harmonizedUser?.adminRole === 'SUPER_ADMIN';
  
  // Fetch approval requests on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Verify super admin status
    if (!isSuperAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only super administrators can access the approval dashboard',
        variant: 'destructive',
      });
      navigate('/admin-dashboard');
      return;
    }
    
    fetchApprovalRequests();
  }, [user, isSuperAdmin, navigate, toast]);
  
  // Fetch approval requests
  const fetchApprovalRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch pending approvals
      const pendingResponse = await axios.get('/api/admin/pending-approvals');
      setPendingApprovals(pendingResponse.data);
      
      // Fetch processed approvals (both approved and rejected)
      const processedResponse = await axios.get('/api/admin/processed-approvals');
      setProcessedApprovals(processedResponse.data);
    } catch (err: any) {
      console.error('Error fetching approval requests:', err);
      setError(err.message || 'Failed to fetch approval requests');
      
      toast({
        title: 'Error',
        description: 'Failed to load approval requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Open approve dialog
  const openApproveDialog = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setIsApproveDialogOpen(true);
  };
  
  // Open reject dialog
  const openRejectDialog = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };
  
  // Process approval
  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setProcessingRequest(true);
    
    try {
      await axios.post('/api/admin/process-approval', {
        approvalId: selectedRequest.id,
        decision: 'approved',
      });
      
      toast({
        title: 'Administrator Approved',
        description: `${selectedRequest.adminName} has been approved successfully`,
      });
      
      // Refresh the approval lists
      fetchApprovalRequests();
    } catch (err: any) {
      console.error('Error approving administrator:', err);
      
      toast({
        title: 'Approval Failed',
        description: err.message || 'Failed to approve administrator',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(false);
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
    }
  };
  
  // Process rejection
  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessingRequest(true);
    
    try {
      await axios.post('/api/admin/process-approval', {
        approvalId: selectedRequest.id,
        decision: 'rejected',
        notes: rejectionReason,
      });
      
      toast({
        title: 'Administrator Rejected',
        description: `${selectedRequest.adminName} has been rejected`,
      });
      
      // Refresh the approval lists
      fetchApprovalRequests();
    } catch (err: any) {
      console.error('Error rejecting administrator:', err);
      
      toast({
        title: 'Rejection Failed',
        description: err.message || 'Failed to reject administrator',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(false);
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  // Calculate time elapsed since request
  const getTimeElapsed = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    
    const start = new Date(dateString).getTime();
    const now = new Date().getTime();
    const elapsed = Math.floor((now - start) / (1000 * 60)); // minutes
    
    if (elapsed < 60) {
      return `${elapsed} minute${elapsed === 1 ? '' : 's'} ago`;
    } else if (elapsed < 1440) { // less than a day
      const hours = Math.floor(elapsed / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(elapsed / 1440);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  };
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-700">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Render approval request card
  const renderRequestCard = (request: ApprovalRequest) => (
    <Card key={request.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{request.adminName}</CardTitle>
            <CardDescription>{request.adminEmail}</CardDescription>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="text-muted-foreground">Department:</p>
          <p>{request.adminDepartment}</p>
          
          <p className="text-muted-foreground">Position:</p>
          <p>{request.adminPosition}</p>
          
          <p className="text-muted-foreground">Requested:</p>
          <p>{formatDate(request.requestedAt)}</p>
          
          <p className="text-muted-foreground">Time Elapsed:</p>
          <p>{getTimeElapsed(request.requestedAt)}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2">
        {request.status === 'pending' && (
          <>
            <Button 
              size="sm" 
              onClick={() => openRejectDialog(request)}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="mr-1 h-4 w-4" />
              Reject
            </Button>
            <Button 
              size="sm" 
              onClick={() => openApproveDialog(request)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Approve
            </Button>
          </>
        )}
        {request.status !== 'pending' && (
          <div className="text-sm text-muted-foreground">
            {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.reviewedBy || 'System'} on {formatDate(request.reviewedAt)}
          </div>
        )}
      </CardFooter>
    </Card>
  );
  
  // Render processed approval in table row
  const renderProcessedRequestRow = (request: ApprovalRequest) => (
    <TableRow key={request.id}>
      <TableCell>{request.adminName}</TableCell>
      <TableCell>{request.adminEmail}</TableCell>
      <TableCell>{request.adminDepartment}</TableCell>
      <TableCell>
        <StatusBadge status={request.status} />
      </TableCell>
      <TableCell>{formatDate(request.requestedAt)}</TableCell>
      <TableCell>{formatDate(request.reviewedAt)}</TableCell>
      <TableCell>{request.reviewNotes || 'N/A'}</TableCell>
    </TableRow>
  );
  
  // Handle returning to dashboard
  const handleReturnToDashboard = () => {
    navigate('/admin-dashboard');
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading approval requests...</p>
        </div>
      </div>
    );
  }
  
  // Not authenticated or not a super admin
  if (!user || !isSuperAdmin) {
    return (
      <div className="container max-w-xl mx-auto py-10">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
            <CardDescription>
              You must be a Super Administrator to access this page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This page is restricted to Super Administrators only
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleReturnToDashboard}>
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Administrator Approval Dashboard</h1>
        <p className="text-muted-foreground">
          Review and process pending administrator approval requests
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Pending
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed" className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4" />
            Processed
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <div className="rounded-full bg-primary/10 p-3 mx-auto w-fit mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">No Pending Approvals</h3>
              <p className="text-muted-foreground">
                All administrator approval requests have been processed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map(renderRequestCard)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="processed">
          {processedApprovals.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <div className="rounded-full bg-primary/10 p-3 mx-auto w-fit mb-4">
                <Info className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">No Processed Requests</h3>
              <p className="text-muted-foreground">
                No administrator approval requests have been processed yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>List of processed administrator approval requests</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedApprovals.map(renderProcessedRequestRow)}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Administrator</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedRequest?.adminName}?
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-fit">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">Name:</p>
                <p>{selectedRequest.adminName}</p>
                
                <p className="text-muted-foreground">Email:</p>
                <p>{selectedRequest.adminEmail}</p>
                
                <p className="text-muted-foreground">Department:</p>
                <p>{selectedRequest.adminDepartment}</p>
                
                <p className="text-muted-foreground">Position:</p>
                <p>{selectedRequest.adminPosition}</p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  After approval, the administrator will need to set up Multi-Factor Authentication (MFA) before accessing the system.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={processingRequest}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processingRequest}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingRequest ? <Spinner className="mr-2" size="sm" /> : null}
              {processingRequest ? 'Processing...' : 'Approve Administrator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Administrator</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedRequest?.adminName}?
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-full bg-red-100 p-3 mx-auto w-fit">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">Name:</p>
                <p>{selectedRequest.adminName}</p>
                
                <p className="text-muted-foreground">Email:</p>
                <p>{selectedRequest.adminEmail}</p>
                
                <p className="text-muted-foreground">Department:</p>
                <p>{selectedRequest.adminDepartment}</p>
                
                <p className="text-muted-foreground">Position:</p>
                <p>{selectedRequest.adminPosition}</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="rejectionReason" className="text-sm font-medium">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Please provide a reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be visible to the administrator and will help them understand why their request was rejected.
                </p>
              </div>
              
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This action cannot be undone. The administrator will be notified of the rejection.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={processingRequest}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={processingRequest}
              variant="destructive"
            >
              {processingRequest ? <Spinner className="mr-2" size="sm" /> : null}
              {processingRequest ? 'Processing...' : 'Reject Administrator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminApprovalPage;