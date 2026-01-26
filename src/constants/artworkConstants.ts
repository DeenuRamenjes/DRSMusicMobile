export type CanvasStyleType = 'gradient' | 'geometric' | 'waves' | 'minimal' | 'neon' | 'vintage';

export interface CanvasStyle {
    id: CanvasStyleType;
    name: string;
    icon: string;
}

export const CANVAS_STYLES: CanvasStyle[] = [
    { id: 'gradient', name: 'Gradient', icon: 'sun' },
    { id: 'geometric', name: 'Geometric', icon: 'octagon' },
    { id: 'waves', name: 'Waves', icon: 'activity' },
    { id: 'minimal', name: 'Minimal', icon: 'square' },
    { id: 'neon', name: 'Neon', icon: 'zap' },
    { id: 'vintage', name: 'Vintage', icon: 'disc' },
];

export interface ArtworkData {
    title: string;
    artist: string;
    style: CanvasStyleType;
    baseHue: number;
    primaryColor?: string; // Optional user override
    accentColor?: string;  // Optional user override
}
