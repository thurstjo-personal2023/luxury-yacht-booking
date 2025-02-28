import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  AlertCircle,
  ArrowLeft, 
  CalendarIcon, 
  Check, 
  Download, 
  File, 
  FileText, 
  Plus, 
  Trash2, 
  Upload, 
  XCircle 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { auth, db, storage } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  Timestamp, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { ComplianceDocument, ServiceProviderProfile } from "@shared/firestore-schema";

// Document type options
const documentTypes = [
  { value: "business_license", label: "Business License" },
  { value: "safety_certification", label: "Safety Certification" },
  { value: "liability_insurance", label: "Liability Insurance" },
  { value: "other", label: "Other" }
];

export default function ComplianceDocuments() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [profile, setProfile] = useState<ServiceProviderProfile | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ComplianceDocument | null>(null);
  
  // New document form state
  const [newDocument, setNewDocument] = useState({
    documentType: "business_license" as ComplianceDocument["documentType"],
    documentTitle: "",
    file: null as File | null,
    issueDate: new Date(),
    expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Default to 1 year from now
    notes: ""
  });
  
  // Load producer profile and documents on mount
  useEffect(() => {
    const fetchProducerProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLocation("/login");
          return;
        }
        
        const profileDocRef = doc(db, "user_profiles_service_provider", user.uid);
        const profileDoc = await getDoc(profileDocRef);
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as ServiceProviderProfile;
          setProfile(profileData);
          setDocuments(profileData.complianceDocuments || []);
        }
      } catch (error) {
        console.error("Error fetching producer profile:", error);
        toast({
          title: "Error",
          description: "Failed to load your documents. Please try again.",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchProducerProfile();
  }, [setLocation, toast]);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewDocument({
        ...newDocument,
        file: e.target.files[0]
      });
    }
  };
  
  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewDocument({
      ...newDocument,
      [name]: value
    });
  };
  
  // Handle date selections
  const handleIssueDateChange = (date: Date | undefined) => {
    if (date) {
      setNewDocument({
        ...newDocument,
        issueDate: date
      });
    }
  };
  
  const handleExpirationDateChange = (date: Date | undefined) => {
    if (date) {
      setNewDocument({
        ...newDocument,
        expirationDate: date
      });
    }
  };
  
  // Upload document handler
  const handleUploadDocument = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload documents.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newDocument.file) {
      toast({
        title: "File Required",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newDocument.documentTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for your document.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Upload file to storage
      const storageRef = ref(
        storage, 
        `compliance_documents/${auth.currentUser.uid}/${Date.now()}_${newDocument.file.name}`
      );
      
      await uploadBytes(storageRef, newDocument.file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Create document object
      const documentId = `doc-${Date.now()}`;
      const newDocObject: ComplianceDocument = {
        documentId,
        documentType: newDocument.documentType,
        documentTitle: newDocument.documentTitle.trim(),
        fileUrl: downloadURL,
        mimeType: newDocument.file.type,
        issueDate: Timestamp.fromDate(newDocument.issueDate),
        expirationDate: Timestamp.fromDate(newDocument.expirationDate),
        status: determineDocumentStatus(newDocument.expirationDate),
        uploadDate: Timestamp.now(),
        notes: newDocument.notes
      };
      
      // Add to Firestore
      const profileDocRef = doc(db, "user_profiles_service_provider", auth.currentUser.uid);
      
      if (profile?.complianceDocuments) {
        // Add to existing array
        await updateDoc(profileDocRef, {
          complianceDocuments: arrayUnion(newDocObject)
        });
      } else {
        // Create new array
        await updateDoc(profileDocRef, {
          complianceDocuments: [newDocObject]
        });
      }
      
      // Update local state
      setDocuments([...documents, newDocObject]);
      
      // Reset form
      setNewDocument({
        documentType: "business_license",
        documentTitle: "",
        file: null,
        issueDate: new Date(),
        expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        notes: ""
      });
      
      // Close dialog
      setUploadDialogOpen(false);
      
      toast({
        title: "Document Uploaded",
        description: "Your document has been successfully uploaded.",
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Delete document handler
  const handleDeleteDocument = async (document: ComplianceDocument) => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    
    try {
      // Remove from Firestore
      const profileDocRef = doc(db, "user_profiles_service_provider", auth.currentUser.uid);
      await updateDoc(profileDocRef, {
        complianceDocuments: arrayRemove(document)
      });
      
      // Try to delete from storage (this may fail if the file no longer exists)
      try {
        const storageRef = ref(storage, document.fileUrl);
        await deleteObject(storageRef);
      } catch (storageError) {
        console.error("Could not delete from storage:", storageError);
        // We continue even if storage deletion fails
      }
      
      // Update local state
      setDocuments(documents.filter(doc => doc.documentId !== document.documentId));
      
      toast({
        title: "Document Deleted",
        description: "The document has been successfully deleted.",
      });
      
      // Close dialog
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to determine document status based on expiration date
  const determineDocumentStatus = (expirationDate: Date): ComplianceDocument["status"] => {
    const now = new Date();
    const expiresInDays = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (expiresInDays <= 0) {
      return "expired";
    } else if (expiresInDays <= 30) {
      return "pending_review";
    } else {
      return "valid";
    }
  };
  
  // Get status badge for document
  const getStatusBadge = (status: ComplianceDocument["status"]) => {
    switch (status) {
      case "valid":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
            <Check className="mr-1 h-3 w-3" />
            Valid
          </Badge>
        );
      case "pending_review":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
            <AlertCircle className="mr-1 h-3 w-3" />
            Expiring Soon
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Unknown
          </Badge>
        );
    }
  };
  
  // Get document type icon
  const getDocumentTypeIcon = (type: ComplianceDocument["documentType"]) => {
    switch (type) {
      case "business_license":
        return <FileText className="h-5 w-5 text-blue-600" />;
      case "safety_certification":
        return <FileText className="h-5 w-5 text-green-600" />;
      case "liability_insurance":
        return <FileText className="h-5 w-5 text-amber-600" />;
      default:
        return <File className="h-5 w-5 text-gray-600" />;
    }
  };
  
  // Get document type label
  const getDocumentTypeLabel = (type: ComplianceDocument["documentType"]) => {
    return documentTypes.find(doc => doc.value === type)?.label || "Document";
  };
  
  // Format date helper
  const formatDate = (timestamp: Timestamp) => {
    return format(timestamp.toDate(), "MMMM d, yyyy");
  };
  
  // Navigation
  const goToDashboard = () => setLocation("/dashboard/producer");
  
  // Calculate document status counts
  const validDocuments = documents.filter(doc => doc.status === "valid").length;
  const expiringDocuments = documents.filter(doc => doc.status === "pending_review").length;
  const expiredDocuments = documents.filter(doc => doc.status === "expired").length;
  
  // Sort documents by status (expired first, then expiring, then valid)
  const sortedDocuments = [...documents].sort((a, b) => {
    const statusOrder = { expired: 0, pending_review: 1, valid: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
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
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Compliance Documents</h1>
              <p className="text-muted-foreground">
                Manage your business licenses, certifications, and insurance documents
              </p>
            </div>
            
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Upload Compliance Document</DialogTitle>
                  <DialogDescription>
                    Upload official licenses, certifications, and insurance documents
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="documentType" className="text-sm font-medium">Document Type</label>
                    <select
                      id="documentType"
                      name="documentType"
                      value={newDocument.documentType}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {documentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="documentTitle" className="text-sm font-medium">Document Title</label>
                    <Input
                      id="documentTitle"
                      name="documentTitle"
                      placeholder="e.g. Business License 2025"
                      value={newDocument.documentTitle}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Issue Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(newDocument.issueDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newDocument.issueDate}
                            onSelect={handleIssueDateChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Expiration Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(newDocument.expirationDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newDocument.expirationDate}
                            onSelect={handleExpirationDateChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="file" className="text-sm font-medium">Document File</label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileChange}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload PDF, JPG, or PNG files (max 10MB)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
                    <textarea
                      id="notes"
                      name="notes"
                      placeholder="Additional information about this document"
                      value={newDocument.notes}
                      onChange={handleInputChange}
                      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setUploadDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUploadDocument}
                    disabled={loading || !newDocument.file || !newDocument.documentTitle.trim()}
                  >
                    {loading ? "Uploading..." : "Upload Document"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Document Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Valid Documents</p>
                <p className="text-2xl font-bold">{validDocuments}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringDocuments}</p>
              </div>
              <div className="bg-amber-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Expired Documents</p>
                <p className="text-2xl font-bold">{expiredDocuments}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Document List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Documents</CardTitle>
            <CardDescription>
              Manage your compliance and regulatory documentation
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {initialLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : sortedDocuments.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                <h3 className="text-lg font-medium mb-1">No Documents</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't uploaded any compliance documents yet
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  Upload Your First Document
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Expired Documents */}
                {expiredDocuments > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                      You have {expiredDocuments} expired document(s) that need to be renewed.
                    </AlertDescription>
                  </Alert>
                )}
                
                {sortedDocuments.map(document => (
                  <div 
                    key={document.documentId} 
                    className={`border rounded-lg p-4 ${
                      document.status === 'expired' 
                        ? 'border-red-200 bg-red-50' 
                        : document.status === 'pending_review'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="flex items-center gap-3 flex-1">
                        {getDocumentTypeIcon(document.documentType)}
                        <div>
                          <h3 className="font-medium">{document.documentTitle}</h3>
                          <p className="text-sm text-muted-foreground">
                            {getDocumentTypeLabel(document.documentType)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-3 md:items-center">
                        <div className="text-sm">
                          <p className="text-muted-foreground">Valid Until</p>
                          <p className={`font-medium ${
                            document.status === 'expired' 
                              ? 'text-red-600' 
                              : document.status === 'pending_review'
                                ? 'text-amber-600'
                                : ''
                          }`}>
                            {formatDate(document.expirationDate)}
                          </p>
                        </div>
                        
                        <div>
                          {getStatusBadge(document.status)}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => window.open(document.fileUrl, '_blank')}
                          >
                            <Download className="h-3.5 w-3.5" />
                            View
                          </Button>
                          
                          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1 text-destructive hover:text-destructive"
                                onClick={() => setSelectedDocument(document)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{selectedDocument?.documentTitle}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => selectedDocument && handleDeleteDocument(selectedDocument)}
                                  disabled={loading}
                                >
                                  {loading ? "Deleting..." : "Delete Document"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                    
                    {document.notes && (
                      <div className="mt-3 pt-3 border-t text-sm">
                        <p className="text-muted-foreground">{document.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between border-t p-6">
            <div className="text-sm text-muted-foreground">
              {sortedDocuments.length > 0 && (
                <p>Showing {sortedDocuments.length} document(s)</p>
              )}
            </div>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Document
            </Button>
          </CardFooter>
        </Card>
        
        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Document Requirements</CardTitle>
            <CardDescription>
              Guidelines for compliance documentation
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium">Business License</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your valid business license or permit that authorizes your maritime operations.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Safety Certifications</h3>
                <p className="text-sm text-muted-foreground">
                  Include all relevant safety certifications such as vessel safety inspections and crew certifications.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Liability Insurance</h3>
                <p className="text-sm text-muted-foreground">
                  Provide proof of liability insurance covering your yacht rental operations and customers.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h3 className="font-medium">Document Renewal</h3>
              <p className="text-sm text-muted-foreground">
                Documents should be kept up to date at all times. You'll receive notifications 30 days before your documents expire.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}