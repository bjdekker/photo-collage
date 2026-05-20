# Photo Collage Generator

A modern, interactive web-based tool for creating beautiful photo collages with randomized layouts, dynamic photo arrangement, and multiple export formats.

## Overview

The Photo Collage Generator is a React-based application that transforms a collection of photos into aesthetically pleasing collages using an intelligent recursive partitioning algorithm. Every pixel of the canvas is utilized (except for margins and gaps), creating seamless, edge-to-edge layouts with no wasted space.

**Key Features:**
- 🎨 **Algorithm-driven layouts** using recursive binary space partitioning
- 🔄 **Interactive photo management** — pan/zoom images, swap positions, remove selections
- ⚙️ **Fully customizable canvas** — adjust dimensions, margins, and gaps
- 💾 **Multiple export formats** — JPEG, PNG, and SVG
- 💾 **Settings persistence** — automatically saves your preferences
- 📱 **Responsive design** — adapts to your screen size

---

## How It Works

### Layout Algorithm

The collage generator uses a **recursive binary space partitioning** algorithm to distribute photos across the canvas:

1. **Canvas Preparation**: The collage canvas (minus margins) is prepared as a single region.
2. **Recursive Splitting**: The region is recursively split into smaller regions, with one region per photo.
   - Each split can be **vertical** (divides left/right) or **horizontal** (divides top/bottom)
   - Split direction is chosen intelligently to respect aspect ratio constraints (max 3.5:1 ratio)
   - Split position is randomized around the midpoint with spatial jitter for organic layouts
3. **Photo Assignment**: Photos are assigned to regions in shuffled order, ensuring variety on each regenerate.
4. **Coverage**: The entire canvas is filled (minus margins and gaps) — no empty regions, no overlap.

### Smart Aspect Ratio Control

To avoid unnaturally wide or tall frames, the algorithm:
- Evaluates both horizontal and vertical split options
- Prioritizes splits that maintain frame aspect ratios ≤ 3.5:1
- If both directions are safe, uses the original heuristic (cut along the longer axis)
- Gracefully handles extreme settings where no aspect-ratio-safe split exists

### Photo Display with Object-Fit: Cover

Each photo is displayed using the CSS `object-fit: cover` property:
- Images scale to fill their frame (maintaining aspect ratio)
- Excess parts are cropped automatically
- **Interactive panning**: You can drag to pan/crop the visible area within each frame

---

## User Interface

### Control Panel

Located at the top of the application, the **Control Panel** contains all settings and actions:

#### Canvas Settings
- **Width (px)**: Sets the collage canvas width (default: 900)
- **Height (px)**: Sets the collage canvas height (default: 700)
- **Margin (px)**: Outer border around the entire collage (default: 20)
- **Gap (px)**: Space between individual photo frames (default: 8)

#### Action Buttons
- **Add Photos**: Opens a file picker to add one or more images (JPG, PNG, GIF, WebP)
- **↻ Regenerate**: Creates a new random layout with the same photos (disabled if no photos added)
- **Clear All**: Removes all photos and resets the canvas
- **Export**: Download the collage in your choice of format:
  - **JPG**: Lossless JPEG at maximum quality
  - **PNG**: Lossless PNG with full transparency support
  - **SVG**: Inkscape-compatible vector format (requires image files in same directory)

#### Status Indicator
- Displays total photo count
- Shows warning if not all photos fit (increase canvas size or reduce photo count)

### Canvas Display

The interactive collage canvas shows:
- **White background** with collected photos arranged in frames
- **Pan hints** (arrows ◀ ▶ ▲ ▼) visible on hover, indicating which directions you can pan
- **Selection overlay** (blue border) when you click a photo to select it
- **Drag affordance** (cursor changes to ✋ grab or 🖐️ grabbing) when hovering over pannable images

#### Interactive Features

**Photo Panning**:
- Click and drag within a frame to pan the image (see more of it)
- Constraints prevent dragging beyond the image bounds
- Real-time feedback with semi-transparent ghost rendering during drag

**Photo Selection & Swapping**:
- **Single click** (no drag): Cycles through selection states
  - Click once: Select (blue highlight shown)
  - Click another photo while one is selected: Swap their positions
  - Click the selected photo again: Deselect
- **Keyboard-free** workflow — all interactions are mouse-based

**Photo Removal**:
- Click the **×** button in the top-right corner of any frame to remove that photo
- Layout automatically regenerates with remaining photos

---

## Functionality & Features

### Photo Import
- **Drag & drop**: Drop image files directly onto the canvas
- **File picker**: Click "Add Photos" to browse and select images
- **Multiple formats**: Supports JPG, PNG, GIF, WebP, and other standard image formats
- **Multiple selection**: Add multiple photos at once
- **Non-destructive**: Original files are not modified; blob URLs are used internally

### Layout Generation & Customization

**Automatic Regeneration**:
- Layout is automatically recalculated when you:
  - Add or remove photos
  - Change canvas dimensions
  - Modify margins or gaps
  - Click the "Regenerate" button

**Randomization**:
- Each layout is unique — exact same photos with same settings will produce different arrangements
- Regenerate button creates new variations without changing photos or settings

**Aspect Ratio Smart Selection**:
- Algorithm avoids creating frames with extremely wide (>3.5:1) or tall (1:3.5) aspect ratios
- Maintains visual balance and prevents awkward frame shapes
- Gracefully degrades for extreme canvas dimensions

### Interactive Photo Arrangement

**Within-Frame Panning**:
- Hover over a pannable image to see direction hints (arrows)
- Click and drag to pan/crop the visible portion
- Panning changes are preserved when exporting
- Useful for hiding unwanted parts of photos (e.g., cropping out distractions)

**Photo Position Swapping**:
- Select a photo (click once)
- Click another photo to swap their positions
- Layout structure remains unchanged; only photo assignments swap
- Useful for fine-tuning arrangement without full regeneration

**Photo Removal**:
- Small **×** button on each frame removes that photo instantly
- Remaining photos flow to fill the space intelligently
- Undo not available, but you can re-add the same file

### Data Persistence

**Settings Storage**:
- Canvas width, height, margin, and gap are saved to browser localStorage
- Settings persist across browser sessions
- Restore defaults by resetting width/height to 900×700 and margin/gap to 20/8

**Note**: Photos are not saved between sessions (stored as temporary blob URLs).

### Export Options

Export your collage in multiple formats with full fidelity:

#### JPEG Export
- **Format**: JPEG (.jpg)
- **Quality**: Lossless at maximum quality (Q=100)
- **Use case**: Sharing online, email, general-purpose use
- **File size**: Moderate (smaller than PNG, larger than SVG)

#### PNG Export
- **Format**: PNG (.png)
- **Quality**: Lossless with full color support
- **Use case**: Archival, sharing via messaging apps, graphic design
- **File size**: Larger than JPEG, smaller than rendering as vector

#### SVG Export
- **Format**: SVG (.svg) — Inkscape-compatible
- **Quality**: Vector format; supports scaling to any size without quality loss
- **Important**: Image references are relative filenames (e.g., `photo.jpg`)
  - **Requirement**: Save SVG and all photo files in the same directory
  - Open SVG in Inkscape or other editors for further editing
- **Use case**: Vector editing, lossless scaling, integrating with design workflows
- **File size**: Smallest (XML text + image references)

#### Export Process
- All exports include panning/cropping adjustments you made via interactive dragging
- Rounded corners (3px radius) are applied to all frames
- Background is white (no transparency in JPEG/PNG; SVG references images directly)
- File downloads automatically; no server upload required (client-side only)

---

## Settings & Customization

### Canvas Dimensions
- **Width**: 1–5000 pixels (default: 900)
- **Height**: 1–5000 pixels (default: 700)
- **Validation**: Out-of-range values are rejected; previous value is retained
- **Aspect Ratio**: No restriction; portrait, landscape, or square all supported

### Margins & Gaps
- **Margin**: 0–5000 pixels (default: 20)
  - Outer border around the entire collage
  - Prevents photos from touching canvas edges
- **Gap**: 0–5000 pixels (default: 8)
  - Space between individual photo frames
  - Set to 0 for seamless, edge-to-edge photos
- **Validation**: Negative values are clamped to their previous setting

### Display Scaling
- Canvas automatically scales to fit your screen
- Respects a minimum width of 600px and minimum height of 400px
- Maintains aspect ratio for all display scales
- Responsive to window resize events

---

## Technical Details

### Architecture

```
App.tsx              (Main component, state management, layout orchestration)
├── ControlPanel → Settings input, photo import, export triggers
└── CollageCanvas → Interactive canvas, drag-to-pan, selection/swap, photo removal
    └── layoutAlgorithm.ts → Recursive binary space partitioning
        └── exportCollage.ts → JPEG, PNG, SVG rendering engines
```

### Key Components

**App.tsx**
- Manages global state: photos, placements, settings, display scale
- Orchestrates layout generation and regeneration
- Handles photo import, removal, and swapping
- Manages export operations

**CollageCanvas.tsx**
- Renders interactive photo frames
- Handles mouse interactions:
  - Pan dragging within frames
  - Selection/swap clicking
  - Photo removal via × button
- Drag & drop file import
- Exposes interface for reading current pan offsets and image natural sizes

**ControlPanel.tsx**
- Provides settings inputs (width, height, margin, gap)
- Exposes action buttons (Add, Regenerate, Clear, Export)
- Displays photo count and "didn't fit" warnings

**layoutAlgorithm.ts**
- `generateLayout()`: Main entry point for layout generation
- `partition()`: Recursive function that splits canvas and assigns photos
- Aspect ratio validation and smart cut direction selection

**exportCollage.ts**
- `buildCanvas()`: Renders collage to HTML canvas (shared by JPEG/PNG)
- `exportAsJpeg()`: Exports canvas as JPEG
- `exportAsPng()`: Exports canvas as PNG
- `exportAsSvg()`: Generates Inkscape-compatible SVG with clip paths

**types.ts**
- TypeScript interfaces for type safety:
  - `Photo`: ID, URL, name
  - `Placement`: Photo + x, y, width, height
  - `CollageSettings`: Canvas dimensions, margin, gap
  - `PhotoOffset`: Pan offset (x, y)
  - `PhotoNatSize`: Image natural width & height

### Technologies

- **React 18**: UI framework with hooks for state management
- **TypeScript 5.4**: Type-safe development
- **Vite 5**: Build tool and dev server
- **Canvas API**: Hardware-accelerated JPEG/PNG rendering
- **SVG**: Vector export with clip paths
- **localStorage**: Client-side settings persistence
- **CSS**: Responsive layout and styling

### Browser Compatibility

- Modern browsers with ES2020+ support
- Requires:
  - Canvas 2D context
  - Blob API
  - File API
  - localStorage
  - SVG support

---

## Getting Started

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd collage
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`

4. **Build for production**:
   ```bash
   npm run build
   ```
   Outputs to `dist/` directory

5. **Preview production build**:
   ```bash
   npm run preview
   ```

### Quick Start

1. Open the application in your browser
2. Click **"Add Photos"** and select images from your computer
3. Watch the collage appear with a randomized layout
4. Click **"↻ Regenerate"** to create a new layout with the same photos
5. Click and drag within photos to pan/crop
6. Click photos to select, then click another to swap positions
7. Click the **×** button to remove a photo
8. Use **"Export"** buttons to download your collage as JPG, PNG, or SVG

---

## Workflow Examples

### Example 1: Creating a Family Photo Collage
1. Add 8–12 family photos via "Add Photos"
2. Adjust canvas dimensions if desired (e.g., 1200×800 for widescreen)
3. Click "Regenerate" until happy with the layout
4. Pan photos as needed (drag within frames to position faces better)
5. Export as PNG and share with family

### Example 2: Social Media Post
1. Add 4–6 product photos
2. Set canvas to 1080×1080 (Instagram square)
3. Regenerate once or twice until layout looks balanced
4. Export as JPG for quick sharing or PNG for rich editing later

### Example 3: Vector Design Project (Inkscape)
1. Create collage with desired photos
2. Pan/crop each photo precisely
3. Export as **SVG**
4. Save SVG and all image files in the same directory
5. Open SVG in Inkscape
6. Continue editing vectors, text, or layouts

---

## Frequently Asked Questions

**Q: Can I undo a photo removal?**
- A: No built-in undo, but you can re-add the same photo file by clicking "Add Photos" again.

**Q: Why did "Unplaced count" increase?**
- A: Not all photos fit in the current canvas at this margin/gap setting. Increase canvas size, reduce margin/gap, or remove some photos.

**Q: What formats do you support?**
- A: JPG (lossy), PNG (lossless), and Inkscape SVG (vector with embedded image references).

**Q: Does the SVG export include embedded images?**
- A: No, SVG references images as filenames. Keep SVG and images in the same folder. This approach keeps file size small and allows offline editing.

**Q: Can I edit the collage in Photoshop after export?**
- A: Yes! Export as PNG, then open in Photoshop. PNG preserves full color fidelity.

**Q: Will my settings be saved?**
- A: Yes, canvas width/height/margin/gap are saved to browser localStorage and restored on next visit.

**Q: How are photos stored?**
- A: Photos are stored as browser blob URLs (temporary). They exist only during your current session and are not saved between page reloads.

**Q: What happens if I open two browser tabs?**
- A: Each tab has its own independent state and photos. Closing one tab doesn't affect the other.

---

## Performance Notes

- **Layout generation** is instant, even for 50+ photos
- **Interactive panning** is smooth (60 FPS)
- **Export rendering** may take 1–2 seconds for very large canvases or high photo counts
- **Memory**: Photo blobs exist in memory until cleared or the page is closed

---

## License

[Add license info here if applicable]

---

## Credits & Contributing

Built with React, TypeScript, and Vite. Contributions welcome!

---

## Changelog

### v0.0.0 (Initial Release)
- Recursive binary space partitioning layout algorithm
- Interactive photo panning and swapping
- JPEG, PNG, SVG export with clip paths
- Settings persistence
- Responsive design
- Aspect ratio constraint (max 3.5:1) to avoid extreme frame shapes
