import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductAddOn } from "./AddOnSelector";

// Props for the AddOnCard component
export interface AddOnCardProps {
  addOn: ProductAddOn & { isProducerOwned?: boolean };
  isIncluded: boolean;
  isOptional: boolean;
  onInclude: () => void;
  onMakeOptional: () => void;
  onRemove: () => void;
  commissionRate: number;
  onCommissionChange: (rate: number) => void;
  isProducerOwned: boolean;
  producerId: string;
  disabled?: boolean;
}

/**
 * AddOnCard Component
 * 
 * Displays a card for an add-on (service or product) that can be bundled with a yacht experience.
 * Handles both producer-owned and partner add-ons with different visual treatments.
 */
export function AddOnCard({
  addOn,
  isIncluded,
  isOptional,
  onInclude,
  onMakeOptional,
  onRemove,
  commissionRate,
  onCommissionChange,
  isProducerOwned,
  producerId,
  disabled = false
}: AddOnCardProps) {
  // Get image URL for the add-on
  const imageUrl = addOn.mainImage || 
    (addOn.media && addOn.media.length > 0 ? addOn.media[0].url : undefined);
  
  // Determine the selection status
  const isSelected = isIncluded || isOptional;
  
  return (
    <Card className={isSelected ? "border-primary/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center">
              {addOn.name}
              {isProducerOwned ? (
                <Badge variant="default" className="ml-2 text-xs">Your Add-on</Badge>
              ) : (
                <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
                  Partner Add-on
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {addOn.description}
            </CardDescription>
          </div>
          <Avatar className="h-10 w-10">
            <AvatarImage src={imageUrl} alt={addOn.name} />
            <AvatarFallback>{addOn.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2 pt-0">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">{addOn.category || "Uncategorized"}</Badge>
          <Badge variant="outline" className="text-xs">${addOn.pricing.toFixed(2)}</Badge>
          {addOn.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
        
        {/* Commission rate input for partner add-ons */}
        {!isProducerOwned && isSelected && (
          <div className="mt-4 border rounded-md p-3 bg-blue-50/30">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor={`commission-${addOn.productId}`} className="text-xs font-medium">
                Partner Commission
              </Label>
              <Badge variant="outline" className="bg-blue-100">{commissionRate}%</Badge>
            </div>
            
            <Input
              id={`commission-${addOn.productId}`}
              type="range"
              min="5"
              max="30"
              step="1"
              value={commissionRate}
              onChange={(e) => onCommissionChange(Number(e.target.value))}
              className="mt-1"
              disabled={disabled}
            />
            
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5%</span>
              <span>30%</span>
            </div>
            
            {/* Commission breakdown */}
            <div className="mt-3 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span>Base Price:</span>
                <span className="font-medium">${addOn.pricing.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-blue-600">
                <span>Partner Receives:</span>
                <span className="font-medium">${(addOn.pricing * commissionRate / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-green-600">
                <span>Your Revenue:</span>
                <span className="font-medium">${(addOn.pricing * (100 - commissionRate) / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <div className="flex space-x-2 w-full">
          {isSelected ? (
            <>
              <div className="flex items-center space-x-1 flex-1">
                <Switch
                  id={`required-${addOn.productId}`}
                  checked={isIncluded}
                  onCheckedChange={(checked) => checked ? onInclude() : onMakeOptional()}
                  disabled={disabled}
                />
                <Label htmlFor={`required-${addOn.productId}`} className="text-xs">Required</Label>
              </div>
              <Button variant="destructive" size="sm" onClick={onRemove} disabled={disabled}>
                Remove
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="flex-1" onClick={onInclude} disabled={disabled}>
                Add as Required
              </Button>
              <Button variant="default" size="sm" className="flex-1" onClick={onMakeOptional} disabled={disabled}>
                Add as Optional
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default AddOnCard;