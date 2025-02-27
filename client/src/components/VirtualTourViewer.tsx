import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Info } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Import Pannellum directly, not through react-pannellum
import "pannellum";
// We also need to import the CSS directly to ensure it's loaded
import "pannellum/build/pannellum.css";

// Use window.pannellum since the library attaches itself to the window object
declare global {
  interface Window {
    pannellum: any;
  }
}

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
  thumbnailUrl?: string;
  hotspots?: Hotspot[];
  initialViewParameters?: {
    pitch?: number;
    yaw?: number;
    hfov?: number;
  };
}

interface VirtualTourViewerProps {
  scenes: Scene[];
  initialSceneId?: string;
  height?: string;
  width?: string;
  className?: string;
}

// Add global CSS to ensure Pannellum viewer displays correctly
// We use useEffect to add these styles dynamically to avoid conflicts
const addPannellumStyles = () => {
  // Check if style already exists
  const styleId = 'pannellum-viewer-fixes';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    /* Fix for Pannellum viewer container */
    .pnlm-container {
      width: 100% !important;
      height: 100% !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
    }
    
    /* Ensure all Pannellum controls and UI elements have proper z-index */
    .pnlm-ui {
      z-index: 10 !important;
    }
  `;
  document.head.appendChild(style);
};

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
  const panoramaRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<any>(null); // Use ref instead of state for the viewer instance

  // Add Pannellum CSS fixes on component mount
  useEffect(() => {
    addPannellumStyles();
  }, []);
  
  // Set initial scene if provided
  useEffect(() => {
    if (initialSceneId && scenes.length > 0) {
      const sceneIndex = scenes.findIndex(scene => scene.id === initialSceneId);
      if (sceneIndex !== -1) {
        setCurrentSceneIndex(sceneIndex);
      }
    }
  }, [initialSceneId, scenes]);

  // Initialize Pannellum viewer
  useEffect(() => {
    if (!panoramaRef.current || scenes.length === 0) return;

    setIsLoading(true);

    // Clear previous panorama if it exists
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.destroy();
      viewerInstanceRef.current = null;
    }

    const currentScene = scenes[currentSceneIndex];

    // Format hotspots for Pannellum
    const formattedHotspots = currentScene.hotspots?.map(hotspot => ({
      id: hotspot.id,
      pitch: hotspot.pitch,
      yaw: hotspot.yaw,
      text: hotspot.text,
      type: hotspot.type,
      sceneId: hotspot.sceneId,
      clickHandlerFunc: (evt: any) => {
        if (hotspot.type === "scene" && hotspot.sceneId) {
          const nextSceneIndex = scenes.findIndex(scene => scene.id === hotspot.sceneId);
          if (nextSceneIndex !== -1) {
            setCurrentSceneIndex(nextSceneIndex);
          }
        }
      }
    })) || [];

    try {
      // Configure and initialize the viewer
      const viewer = window.pannellum.viewer(panoramaRef.current, {
        type: "equirectangular",
        panorama: currentScene.imageUrl,
        autoLoad: true,
        showZoomCtrl: true,
        showFullscreenCtrl: false,
        hotSpots: formattedHotspots,
        compass: true,
        hfov: 120,
        minHfov: 50,
        maxHfov: 150,
        hotSpotDebug: false,
        ...(currentScene.initialViewParameters || {}),

        // Event handlers
        onLoad: () => {
          setIsLoading(false);
        },

        // Handle errors
        onerror: (err: any) => {
          console.error('Pannellum error:', err);
          setIsLoading(false);
        }
      });

      viewerInstanceRef.current = viewer;
    } catch (error) {
      console.error("Error initializing Pannellum viewer:", error);
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.destroy();
        viewerInstanceRef.current = null;
      }
    };
  }, [currentSceneIndex, scenes]);

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

  const currentScene = scenes[currentSceneIndex];

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
        <div 
          ref={panoramaRef} 
          className="w-full h-full"
          style={{ 
            background: "#000",
            position: "relative",
            overflow: "hidden"
          }}
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