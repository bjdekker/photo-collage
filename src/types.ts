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
}

export interface LayoutResult {
  placements: Placement[];
  unplaced: Photo[];
}

export interface PhotoOffset { x: number; y: number }
export interface PhotoNatSize { w: number; h: number }
