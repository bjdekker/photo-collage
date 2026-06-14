export interface Photo {
  id: string;
  url: string;
  name: string;
}

export interface CollageSettings {
  width: number;
  height: number;
  margin: number;
  gap: number;
}

export interface Placement {
  photo: Photo;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270 (degrees clockwise)
}

export interface LayoutResult {
  placements: Placement[];
  unplaced: Photo[];
}

export interface PhotoOffset { x: number; y: number }
export interface PhotoNatSize { w: number; h: number }

export interface DefaultLayoutFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DefaultLayout {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  frames: DefaultLayoutFrame[];
}
