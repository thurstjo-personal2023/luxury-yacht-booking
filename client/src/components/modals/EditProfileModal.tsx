import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    id?: string;
    userId?: string;
    name?: string; 
    phoneNumber?: string; 
    address?: string; 
    email?: string;
    preferences?: string[];
    [key: string]: any;
  };
  onSave: (updatedProfile: any) => Promise<void>;
}

export function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    address: "",
    preferences: [] as string[],
    newPreference: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Populate form with profile data when opened
  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        name: profile.name || "",
        phoneNumber: profile.phoneNumber || "",
        address: profile.address || "",
        preferences: profile.preferences || [],
        newPreference: ""
      });
    }
  }, [profile, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddPreference = () => {
    if (formData.newPreference.trim() && !formData.preferences.includes(formData.newPreference.trim())) {
      setFormData(prev => ({
        ...prev,
        preferences: [...prev.preferences, prev.newPreference.trim()],
        newPreference: ""
      }));
    }
  };

  const handleRemovePreference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.filter((_, i) => i !== index)
    }));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPreference();
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Build the updated profile object
      const updatedProfile = {
        ...profile,
        // Core fields
        name: formData.name,
        // Profile specific fields
        preferences: formData.preferences,
        lastUpdated: new Date()
      };

      // Add optional fields if they exist
      if (formData.phoneNumber) {
        updatedProfile.phoneNumber = formData.phoneNumber;
      }
      
      if (formData.address) {
        updatedProfile.address = formData.address;
      }
      
      await onSave(updatedProfile);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your personal information and preferences.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input 
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Your contact number"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea 
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Your address"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Preferences</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.preferences.length > 0 ? (
                  formData.preferences.map((pref, index) => (
                    <Badge key={index} className="flex items-center gap-1">
                      {pref}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemovePreference(index)}
                      />
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No preferences added</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  name="newPreference"
                  value={formData.newPreference}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a preference (e.g. Sailing, Luxury)"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddPreference}
                  disabled={!formData.newPreference.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}