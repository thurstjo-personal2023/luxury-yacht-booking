import { useState, useEffect, useRef } from "react";
import { Pannellum } from "react-pannellum";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Info } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define a module declaration for react-pannellum
declare module 'react-pannellum';

interface Hotspot {
  id: string;
  pitch: number;
  yaw: number;
  text: string;
  type: "info" | "scene";
  sceneId?: string;
}

interface Scene {
  id: string;
  title: string;
  imageUrl: string;
  hotspots?: Hotspot[];
}

interface VirtualTourViewerProps {
  scenes: Scene[];
  initialSceneId?: string;
  height?: string;
  width?: string;
  className?: string;
}

export function VirtualTourViewer({
  scenes,
  initialSceneId,
  height = "400px",
  width = "100%",
  className = "",
}: VirtualTourViewerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Set initial scene if provided
  useEffect(() => {
    if (initialSceneId && scenes.length > 0) {
      const sceneIndex = scenes.findIndex(scene => scene.id === initialSceneId);
      if (sceneIndex !== -1) {
        setCurrentSceneIndex(sceneIndex);
      }
    }
  }, [initialSceneId, scenes]);

  const currentScene = scenes[currentSceneIndex];

  const config = {
    autoLoad: true,
    showZoomCtrl: true,
    showFullscreenCtrl: false, // We'll handle fullscreen ourselves
    showControls: true,
    hotSpots: currentScene?.hotspots || [],
    hotSpotDebug: false,
    compass: true,
    mouseZoom: true,
    hfov: 120,
    minHfov: 50,
    maxHfov: 150,
  };

  const handleSceneChange = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentSceneIndex((prev) => (prev > 0 ? prev - 1 : scenes.length - 1));
    } else {
      setCurrentSceneIndex((prev) => (prev < scenes.length - 1 ? prev + 1 : 0));
    }
    setIsLoading(true);
  };

  const toggleFullscreen = () => {
    if (viewerRef.current) {
      if (!isFullscreen) {
        if (viewerRef.current.requestFullscreen) {
          viewerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle hotspot clicks
  const handleHotspotClick = (evt: any, hotSpotDiv: any, hotSpot: any) => {
    console.log("Hotspot clicked:", hotSpot);

    // Check if it's a scene navigation hotspot
    if (hotSpot.type === "scene" && hotSpot.sceneId) {
      const sceneIndex = scenes.findIndex(scene => scene.id === hotSpot.sceneId);
      if (sceneIndex !== -1) {
        setCurrentSceneIndex(sceneIndex);
        setIsLoading(true);
      }
    }
  };

  return (
    <div 
      className={`relative ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}
      ref={viewerRef}
      style={{
        height: isFullscreen ? "100vh" : height,
        width: isFullscreen ? "100vw" : width,
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {scenes.length > 0 ? (
        <Pannellum
          width="100%"
          height="100%"
          image={currentScene.imageUrl}
          pitch={0}
          yaw={0}
          // Remove duplicate hfov and autoLoad props that are already in config
          onLoad={() => setIsLoading(false)}
          onError={(err: any) => console.error("Pannellum error:", err)}
          {...config}
          onScenechange={handleHotspotClick}
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-muted">
          <p className="text-muted-foreground">No 360° tour available for this yacht</p>
        </div>
      )}

      {/* Tour Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-20">
        <Card>
          <CardContent className="p-2 flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleSceneChange("prev")}
              disabled={scenes.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {scenes.length > 1 && (
              <Badge variant="outline" className="px-2 py-1">
                {currentSceneIndex + 1} / {scenes.length}
              </Badge>
            )}

            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleSceneChange("next")}
              disabled={scenes.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Scene Title */}
      {currentScene && (
        <div className="absolute top-4 left-4 z-20">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {currentScene.title}
          </Badge>
        </div>
      )}

      {/* Help Dialog */}
      <div className="absolute top-4 right-4 z-20">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Virtual Tour Controls</h3>
              <div className="space-y-2">
                <p>• Click and drag to look around</p>
                <p>• Use mouse wheel to zoom in/out</p>
                <p>• Click on hotspots to view details</p>
                <p>• Use navigation buttons to move between areas</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}