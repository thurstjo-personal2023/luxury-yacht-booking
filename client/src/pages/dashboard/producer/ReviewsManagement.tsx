import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle,
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  MessageSquare, 
  RefreshCw, 
  Save, 
  Search, 
  Star, 
  ThumbsDown, 
  ThumbsUp, 
  User 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  Timestamp,
  orderBy
} from "firebase/firestore";
import { 
  Review, 
  ReviewResponse, 
  YachtExperience 
} from "@shared/firestore-schema";
import { format } from "date-fns";

export default function ReviewsManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [reviews, setReviews] = useState<(Review & { 
    customerName?: string;
    productName?: string;
    responseText?: string;
    responseDate?: Timestamp;
    responseId?: string;
    responseStatus?: 'published' | 'draft' | 'archived';
  })[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState<'published' | 'draft'>('draft');
  const [expandedReviews, setExpandedReviews] = useState<string[]>([]);
  const [producerYachts, setProducerYachts] = useState<{[key: string]: YachtExperience}>({});
  
  // Fetch reviews and product data on mount
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLocation("/login");
          return;
        }
        
        // First, fetch all producer's yachts/experiences
        const yachtsRef = collection(db, "yacht_experiences");
        const q = query(yachtsRef, where("providerId", "==", user.uid));
        const yachtSnapshots = await getDocs(q);
        
        const yachtsById: {[key: string]: YachtExperience} = {};
        const yachtIds: string[] = [];
        
        yachtSnapshots.forEach(doc => {
          const yacht = doc.data() as YachtExperience;
          yachtsById[yacht.package_id] = yacht;
          yachtIds.push(yacht.package_id);
        });
        
        setProducerYachts(yachtsById);
        
        // Then fetch reviews for all producer's yachts
        const reviewsRef = collection(db, "reviews_and_feedback");
        const reviewQuery = query(
          reviewsRef, 
          where("relatedContentId", "in", yachtIds.length > 0 ? yachtIds : ["none"]),
          orderBy("createdDate", "desc")
        );
        
        const reviewSnapshots = await getDocs(reviewQuery);
        const reviewData: (Review & { 
          customerName?: string;
          productName?: string;
          responseText?: string;
          responseDate?: Timestamp;
          responseId?: string;
          responseStatus?: 'published' | 'draft' | 'archived';
        })[] = [];
        
        // Process each review
        for (const reviewDoc of reviewSnapshots.docs) {
          const review = reviewDoc.data() as Review;
          
          // Get customer name
          let customerName = "Anonymous Customer";
          try {
            const customerRef = doc(db, "user_profiles_tourist", review.reviewerId);
            const customerDoc = await getDoc(customerRef);
            if (customerDoc.exists()) {
              customerName = customerDoc.data().name;
            }
          } catch (error) {
            console.error("Error fetching customer profile:", error);
          }
          
          // Get product name
          const productName = yachtsById[review.relatedContentId]?.title || "Unknown Product";
          
          // Check if there's a response to this review
          const responsesRef = collection(db, "review_responses");
          const responseQuery = query(responsesRef, where("reviewId", "==", review.reviewId));
          const responseSnapshot = await getDocs(responseQuery);
          
          let responseText, responseDate, responseId, responseStatus;
          
          if (!responseSnapshot.empty) {
            const responseData = responseSnapshot.docs[0].data() as ReviewResponse;
            responseText = responseData.responseText;
            responseDate = responseData.responseDate;
            responseId = responseData.responseId;
            responseStatus = responseData.status;
          }
          
          reviewData.push({
            ...review,
            customerName,
            productName,
            responseText,
            responseDate,
            responseId,
            responseStatus
          });
        }
        
        setReviews(reviewData);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        toast({
          title: "Error",
          description: "Failed to load reviews. Please try again.",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchReviews();
  }, [setLocation, toast]);
  
  // Toggle review expansion
  const toggleReviewExpansion = (reviewId: string) => {
    if (expandedReviews.includes(reviewId)) {
      setExpandedReviews(expandedReviews.filter(id => id !== reviewId));
    } else {
      setExpandedReviews([...expandedReviews, reviewId]);
    }
  };
  
  // Handle rating filter toggle
  const toggleRatingFilter = (rating: number) => {
    if (selectedRatings.includes(rating)) {
      setSelectedRatings(selectedRatings.filter(r => r !== rating));
    } else {
      setSelectedRatings([...selectedRatings, rating]);
    }
  };
  
  // Open response dialog
  const openResponseDialog = (review: Review) => {
    setSelectedReview(review);
    const existingReview = reviews.find(r => r.reviewId === review.reviewId);
    setResponseText(existingReview?.responseText || "");
    setResponseStatus(existingReview?.responseStatus === 'published' ? 'published' : 'draft');
    setResponseDialogOpen(true);
  };
  
  // Submit response handler
  const handleSubmitResponse = async () => {
    if (!auth.currentUser || !selectedReview) return;
    
    setLoading(true);
    
    try {
      const now = Timestamp.now();
      
      // Check if there's an existing response to update
      const existingReview = reviews.find(r => r.reviewId === selectedReview.reviewId);
      
      if (existingReview?.responseId) {
        // Update existing response
        const responseRef = doc(db, "review_responses", existingReview.responseId);
        await updateDoc(responseRef, {
          responseText,
          responseDate: now,
          status: responseStatus,
        });
      } else {
        // Create new response
        const responseData: ReviewResponse = {
          responseId: `resp-${Date.now()}`,
          reviewId: selectedReview.reviewId,
          responderId: auth.currentUser.uid,
          responseText,
          responseDate: now,
          isPublic: true,
          status: responseStatus,
        };
        
        const responsesCollection = collection(db, "review_responses");
        await addDoc(responsesCollection, responseData);
      }
      
      // Update local state
      const updatedReviews = reviews.map(review => {
        if (review.reviewId === selectedReview.reviewId) {
          return {
            ...review,
            responseText,
            responseDate: now,
            responseStatus
          };
        }
        return review;
      });
      
      setReviews(updatedReviews);
      setResponseDialogOpen(false);
      
      toast({
        title: "Response Saved",
        description: responseStatus === 'published' 
          ? "Your response has been published and is now visible to customers."
          : "Your response has been saved as a draft.",
      });
    } catch (error) {
      console.error("Error saving response:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Filter reviews based on search, ratings, and tab
  const filteredReviews = reviews.filter(review => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      review.reviewText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.productName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by rating
    const matchesRating = selectedRatings.length === 0 || selectedRatings.includes(review.rating);
    
    // Filter by tab
    let matchesTab = true;
    if (activeTab === "unanswered") {
      matchesTab = !review.responseText;
    } else if (activeTab === "answered") {
      matchesTab = !!review.responseText;
    } else if (activeTab === "negative") {
      matchesTab = review.rating <= 3;
    } else if (activeTab === "positive") {
      matchesTab = review.rating > 3;
    }
    
    return matchesSearch && matchesRating && matchesTab;
  });
  
  // Calculate stats
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "0.0";
    
  const positiveReviews = reviews.filter(review => review.rating > 3).length;
  const negativeReviews = reviews.filter(review => review.rating <= 3).length;
  const unansweredReviews = reviews.filter(review => !review.responseText).length;
  
  // Helper to render star rating
  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            className={`h-4 w-4 ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            }`} 
          />
        ))}
      </div>
    );
  };
  
  // Navigation
  const goToDashboard = () => setLocation("/dashboard/producer");
  
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
          
          <h1 className="text-3xl font-bold">Customer Reviews</h1>
          <p className="text-muted-foreground">
            View and respond to customer feedback
          </p>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Average Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{averageRating}</p>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
              <div className="flex">
                {renderStarRating(parseFloat(averageRating))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Total Reviews</p>
                <p className="text-2xl font-bold">{reviews.length}</p>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Positive Reviews</p>
                <p className="text-2xl font-bold">{positiveReviews}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <ThumbsUp className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Waiting Response</p>
                <p className="text-2xl font-bold">{unansweredReviews}</p>
              </div>
              <div className="bg-amber-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Reviews Management */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Customer Reviews</CardTitle>
                <CardDescription>
                  Manage and respond to customer feedback
                </CardDescription>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search reviews..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-1 flex-wrap">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <Button
                      key={rating}
                      variant={selectedRatings.includes(rating) ? "default" : "outline"}
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => toggleRatingFilter(rating)}
                    >
                      {rating}
                      <Star className={`h-3.5 w-3.5 ${
                        selectedRatings.includes(rating) ? 'fill-primary-foreground' : 'fill-yellow-400'
                      }`} />
                    </Button>
                  ))}
                  
                  {selectedRatings.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRatings([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <TabsTrigger value="all">All Reviews</TabsTrigger>
                <TabsTrigger value="unanswered">
                  Unanswered
                  {unansweredReviews > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {unansweredReviews}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="answered">Answered</TabsTrigger>
                <TabsTrigger value="positive">Positive</TabsTrigger>
                <TabsTrigger value="negative">Negative</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            {initialLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                <h3 className="text-lg font-medium mb-1">No Reviews Found</h3>
                <p className="text-muted-foreground mb-6">
                  {reviews.length > 0 
                    ? "No reviews match your current filters."
                    : "You don't have any customer reviews yet."
                  }
                </p>
                {reviews.length > 0 && selectedRatings.length > 0 && (
                  <Button onClick={() => setSelectedRatings([])}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredReviews.map(review => {
                  const isExpanded = expandedReviews.includes(review.reviewId);
                  const hasResponse = !!review.responseText;
                  
                  return (
                    <div
                      key={review.reviewId}
                      className={`border rounded-lg overflow-hidden ${
                        !hasResponse ? 'border-amber-200' : 'border-gray-200'
                      }`}
                    >
                      {/* Review Header */}
                      <div className="flex justify-between items-start p-4 bg-muted/20">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="" />
                            <AvatarFallback>
                              {review.customerName?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{review.customerName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {format(review.createdDate.toDate(), "MMMM d, yyyy")}
                              </span>
                              <span>•</span>
                              {renderStarRating(review.rating)}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => toggleReviewExpansion(review.reviewId)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {isExpanded ? "Less" : "More"}
                        </Button>
                      </div>
                      
                      {/* Review Content */}
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <p className={`${isExpanded ? '' : 'line-clamp-2'}`}>
                            {review.reviewText}
                          </p>
                        </div>
                        
                        {review.photos && review.photos.length > 0 && isExpanded && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {review.photos.map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Review photo ${index + 1}`}
                                className="h-20 w-20 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                        
                        {isExpanded && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <p>About: <span className="font-medium">{review.productName}</span></p>
                          </div>
                        )}
                      </div>
                      
                      {/* Response Section */}
                      {hasResponse && isExpanded && (
                        <div className="p-4 border-t bg-muted/10">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-1.5 rounded-full">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <p className="font-medium">Your Response</p>
                                <Badge variant={review.responseStatus === 'published' ? 'default' : 'outline'}>
                                  {review.responseStatus === 'published' ? 'Published' : 'Draft'}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm">
                                {review.responseText}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {review.responseDate && format(review.responseDate.toDate(), "MMMM d, yyyy • h:mm a")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="p-4 border-t flex justify-end">
                        <Button
                          variant={hasResponse ? "outline" : "default"}
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => openResponseDialog(review)}
                        >
                          {hasResponse ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5" />
                              Update Response
                            </>
                          ) : (
                            <>
                              <MessageSquare className="h-3.5 w-3.5" />
                              Respond
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between border-t p-6">
            <div className="text-sm text-muted-foreground">
              {filteredReviews.length > 0 && (
                <p>Showing {filteredReviews.length} of {reviews.length} reviews</p>
              )}
            </div>
          </CardFooter>
        </Card>
        
        {/* Response Dialog */}
        <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Respond to Review</DialogTitle>
              <DialogDescription>
                Create a professional and thoughtful response to the customer's feedback
              </DialogDescription>
            </DialogHeader>
            
            {selectedReview && (
              <div className="py-4">
                {/* Original Review */}
                <div className="mb-6 p-4 border rounded-md bg-muted/10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium">
                      {reviews.find(r => r.reviewId === selectedReview.reviewId)?.customerName || "Customer"}
                    </p>
                    {renderStarRating(selectedReview.rating)}
                  </div>
                  <p className="text-sm">{selectedReview.reviewText}</p>
                </div>
                
                {/* Response Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Response</label>
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Thank you for your feedback..."
                      className="min-h-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Responses should be professional, helpful, and address the customer's specific feedback
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Publishing Status</label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="draft"
                          checked={responseStatus === 'draft'}
                          onChange={() => setResponseStatus('draft')}
                          className="rounded-full"
                        />
                        <label htmlFor="draft" className="text-sm">Save as Draft</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="published"
                          checked={responseStatus === 'published'}
                          onChange={() => setResponseStatus('published')}
                          className="rounded-full"
                        />
                        <label htmlFor="published" className="text-sm">Publish Now</label>
                      </div>
                    </div>
                  </div>
                  
                  {responseStatus === 'draft' && (
                    <Alert className="bg-muted/50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Draft Mode</AlertTitle>
                      <AlertDescription>
                        This response will be saved but not visible to customers until published.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setResponseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitResponse}
                disabled={loading || !responseText.trim()}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                {responseStatus === 'published' ? 'Publish Response' : 'Save Draft'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Tips Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tips for Responding to Reviews</CardTitle>
            <CardDescription>
              Best practices for professional review management
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  Positive Reviews
                </h3>
                <p className="text-sm text-muted-foreground">
                  Thank the customer for their feedback, highlight what they enjoyed, and invite them to return.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  Negative Reviews
                </h3>
                <p className="text-sm text-muted-foreground">
                  Apologize for any issues, explain steps taken to address concerns, and offer a solution when appropriate.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Response Time
                </h3>
                <p className="text-sm text-muted-foreground">
                  Aim to respond to all reviews within 24-48 hours for the best customer experience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}