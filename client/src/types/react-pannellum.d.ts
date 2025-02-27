declare module 'react-pannellum' {
  import { ComponentType, ReactNode } from 'react';

  interface PannellumProps {
    width: string;
    height: string;
    image: string;
    pitch?: number;
    yaw?: number;
    hfov?: number;
    autoLoad?: boolean;
    showZoomCtrl?: boolean;
    showFullscreenCtrl?: boolean;
    showControls?: boolean;
    hotSpots?: Array<{
      id: string;
      pitch: number;
      yaw: number;
      text: string;
      type: string;
      sceneId?: string;
    }>;
    hotSpotDebug?: boolean;
    compass?: boolean;
    mouseZoom?: boolean;
    minHfov?: number;
    maxHfov?: number;
    onLoad?: () => void;
    onError?: (err: any) => void;
    onScenechange?: (evt: any, hotSpotDiv: any, hotSpot: any) => void;
    onMousedown?: (evt: any) => void;
    onMouseup?: (evt: any) => void;
    onTouchstart?: (evt: any) => void;
    onTouchend?: (evt: any) => void;
    [key: string]: any;
  }

  export const Pannellum: ComponentType<PannellumProps>;
}
