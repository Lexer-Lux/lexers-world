export type GlobeExperimentMode = "default" | "wargames" | "paper";

export interface GlobeRuntimeSettings {
  zoomThreshold: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  wireStrength: number;
  hatchStrength: number;
  crosshatchDensity: number;
  crosshatchThreshold: number;
  showAtmosphere: boolean;
  atmosphereColor: string;
  atmosphereAltitude: number;
  pointRadius: number;
  pointAltitude: number;
  markerScale: number;
  boundaryOpacity: number;
  showBoundaryTiers: boolean;
  showCurvedTitle: boolean;
  globeExperimentMode: GlobeExperimentMode;
  warGamesLineDensity: number;
  warGamesGlowStrength: number;
  warGamesSweepStrength: number;
  paperGrainStrength: number;
  paperHalftoneStrength: number;
  paperInkStrength: number;
}

export const DEFAULT_GLOBE_RUNTIME_SETTINGS: GlobeRuntimeSettings = {
  zoomThreshold: 1.8,
  autoRotate: true,
  autoRotateSpeed: 0.4,
  wireStrength: 1,
  hatchStrength: 1,
  crosshatchDensity: 1,
  crosshatchThreshold: 0.92,
  showAtmosphere: true,
  atmosphereColor: "#4f72ff",
  atmosphereAltitude: 0.13,
  pointRadius: 0.4,
  pointAltitude: 0.01,
  markerScale: 1,
  boundaryOpacity: 1,
  showBoundaryTiers: true,
  showCurvedTitle: true,
  globeExperimentMode: "default",
  warGamesLineDensity: 11,
  warGamesGlowStrength: 1,
  warGamesSweepStrength: 0.9,
  paperGrainStrength: 0.75,
  paperHalftoneStrength: 0.8,
  paperInkStrength: 0.9,
};
