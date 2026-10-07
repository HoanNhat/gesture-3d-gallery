/**
 * Ethan Vale - I See Through the Wild
 * 3D Gallery Configuration & Curated Archival Artwork Collection
 * High-end editorial photography portfolio metadata and 3D scene parameters.
 */

export const GALLERY_CONFIG = {
  // Orbital Cloud Geometry
  radius: 5.8,                  // Radius of the orbital spherical cloud
  radiusVariance: 0.5,          // Organic depth staggering
  cardWidth: 2.15,              // Width of 3D archival photographic planes
  cardHeight: 1.5,              // Height of 3D image planes
  cardSegments: 16,             // Geometry curvature segments
  cardCurvature: 0.02,          // Subtle cylindrical curvature per plate
  verticalSpread: 1.8,          // Vertical staggering amplitude

  // Rotation Physics & Smoothing
  rotationDamping: 0.065,       // Smooth rotational damping (lerp factor: 0 < val <= 1)
  rotationSpeed: 0.0042,        // Mouse/touch drag rotation sensitivity
  swipeInertia: 0.91,           // Momentum decay factor after swipe release

  // Camera Zoom & Distance
  minZoom: 5.5,                 // Closest camera distance (inspect view)
  maxZoom: 13.0,                // Farthest camera distance (overview)
  defaultZoom: 13,             // Default camera distance - set to minimum zoom level (inspect view)
  zoomDamping: 0.075,           // Zoom interpolation damping factor
  cameraFov: 48,                // Camera Field of View in degrees
  cameraHeight: 0.2,            // Subtle vertical camera height offset

  // Visual Atmosphere & Archival Shading
  cardRoughness: 0.28,          // Photographic paper / glass finish
  cardMetalness: 0.08,          // Subtle specular reflection
  particleCount: 280,           // Floating atmospheric dust motes
  particleSpread: 26,           // Spatial particle distribution boundary
  particleSpeed: 0.0004,        // Atmospheric drift animation rate

  // Floor
  floorSize: 36,                // Floor boundary
  floorY: -2.4                  // Vertical position of floor plane below cards
};

export const GESTURE_CONFIG = {
  // Swipe Detection
  swipeThresholdVelocity: 0.65, // Minimum normalized hand velocity to trigger swipe
  swipeMinDistance: 0.12,       // Minimum horizontal distance travelled (0 to 1 scale)
  swipeCooldownMs: 400,         // Cooldown between swipe actions

  // Pinch Zoom Detection
  pinchCloseThreshold: 0.055,   // Distance between thumb and index tip for pinch close
  pinchOpenThreshold: 0.14,     // Distance for pinch open
  pinchSensitivity: 0.04,       // Camera zoom step per pinch tick

  // Palm Orbit / Free Navigation
  palmMoveDeadzone: 0.025,      // Deadzone around center to avoid jitter
  palmSensitivity: 1.85,        // Multiplier for palm displacement to rotational velocity

  // Stability & Smoothing
  smoothingFactor: 0.25,        // Exponential moving average factor for landmark coordinates
  minHandDetectionConfidence: 0.65
};

export const DEMO_ITEMS = [
  {
    id: 1,
    title: 'The Ghost of Svalbard',
    subtitle: 'Arctic Apex Predator',
    author: 'Ethan Vale',
    date: 'November 12, 2025',
    location: 'Svalbard Archipelago, Norway',
    camera: 'Leica SL2 · Summicron 90mm f/2.0 · 1/1250s · ISO 100',
    accentColor: '#d6cdb7',
    image: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?auto=format&fit=crop&w=1400&q=85',
    description: 'A lone male polar bear traversing pack ice under the pale polar twilight. Observed for three days from drift ice at 79° North, moving in utter silence through sub-zero vapor with unmatched predatory grace.'
  },
  {
    id: 2,
    title: 'Echoes of Serengeti',
    subtitle: 'Matriarch Vigil at Dusk',
    author: 'Ethan Vale',
    date: 'August 04, 2025',
    location: 'Serengeti National Park, Tanzania',
    camera: 'Hasselblad X2D 100C · XCD 55mm f/2.5 · 1/800s · ISO 64',
    accentColor: '#d4a373',
    image: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=1400&q=85',
    description: 'At twilight along the Mara riverbank, the matriarch pauses before leading her herd across open savannah. Dust suspended in amber light reveals the ancient geography of their generational migratory path.'
  },
 {
    id: 3,
    title: 'The Great Migration',
    subtitle: 'Thundering Hooves',
    author: 'Ethan Vale',
    date: 'September 02, 2025',
    location: 'Masai Mara National Reserve, Kenya',
    camera: 'Leica SL2 · Vario-Elmarit 24-90mm f/2.8-4 · 1/1000s · ISO 250',
    accentColor: '#c2a585',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=85',
    description: 'Thousands of zebras and wildebeest surging down steep red mud embankments into swirling currents, driven by instinct older than the Great Rift Valley itself.'
  },
];

/**
 * Creates a high-end archival editorial fallback canvas texture if an image fails to load.
 * @param {string} title Artwork title
 * @param {string} subtitle Artwork subtitle
 * @param {string} accentColor Hex or CSS color string
 * @returns {HTMLCanvasElement}
 */
export function createProceduralArtworkCanvas(title, subtitle = 'Archival Plate', accentColor = '#d4af37') {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 840;
  const ctx = canvas.getContext('2d');

  // Deep obsidian background
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 840);
  bgGrad.addColorStop(0, '#101014');
  bgGrad.addColorStop(1, '#060608');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 840);

  // Subtle vignette
  const radial = ctx.createRadialGradient(600, 420, 100, 600, 420, 600);
  radial.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
  radial.addColorStop(0.8, 'rgba(0, 0, 0, 0.4)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 1200, 840);

  // Archival matting border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 60, 1080, 720);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.strokeRect(76, 76, 1048, 688);

  // Top Archive Stamp
  ctx.fillStyle = 'rgba(244, 243, 239, 0.55)';
  ctx.font = '500 16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '4px';
  ctx.fillText('ETHAN VALE · ARCHIVE EXPEDITION', 600, 130);

  // Subtle separator line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(520, 155);
  ctx.lineTo(680, 155);
  ctx.stroke();

  // Artwork Title (Editorial Serif look)
  ctx.fillStyle = '#f4f3ef';
  ctx.font = 'italic 46px "Playfair Display", "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 600, 410);

  // Subtitle
  ctx.fillStyle = 'rgba(244, 243, 239, 0.65)';
  ctx.font = '300 20px Inter, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(subtitle.toUpperCase(), 600, 470);

  // Bottom Metadata
  ctx.fillStyle = 'rgba(244, 243, 239, 0.4)';
  ctx.font = '14px Inter, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('FIELD NOTES 2026 · NATURAL LIGHT WITHOUT INTERVENTION', 600, 710);

  return canvas;
}
