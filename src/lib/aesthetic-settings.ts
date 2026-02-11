export interface AestheticRuntimeSettings {
  showNebula: boolean;
  nebulaOpacity: number;
  nebulaBlurPx: number;
  nebulaDriftSeconds: number;
  showGridOverlay: boolean;
  gridOpacity: number;
  gridAngleDeg: number;
  gridSpacingPx: number;
  gridDriftSeconds: number;
  showHorizonFade: boolean;
  horizonOpacity: number;
  showMotionLines: boolean;
  motionLinesOpacity: number;
  motionLinesSpeedSeconds: number;
  showEdgeStreaks: boolean;
  edgeStreaksOpacity: number;
  edgeStreaksSpeedSeconds: number;
  showBurstOverlay: boolean;
  burstOverlayOpacity: number;
  burstOverlayPulseSeconds: number;
  showComicCaptions: boolean;
  comicCaptionRotationDeg: number;
  bendayOpacity: number;
  panelBlurPx: number;
  glitchEnabled: boolean;
  glitchSpeedSeconds: number;
}

export const DEFAULT_AESTHETIC_RUNTIME_SETTINGS: AestheticRuntimeSettings = {
  showNebula: true,
  nebulaOpacity: 0.32,
  nebulaBlurPx: 26,
  nebulaDriftSeconds: 14,
  showGridOverlay: true,
  gridOpacity: 0.12,
  gridAngleDeg: 112,
  gridSpacingPx: 11,
  gridDriftSeconds: 18,
  showHorizonFade: true,
  horizonOpacity: 0.72,
  showMotionLines: true,
  motionLinesOpacity: 0.015,
  motionLinesSpeedSeconds: 3,
  showEdgeStreaks: true,
  edgeStreaksOpacity: 0.025,
  edgeStreaksSpeedSeconds: 9,
  showBurstOverlay: false,
  burstOverlayOpacity: 0.04,
  burstOverlayPulseSeconds: 5.5,
  showComicCaptions: true,
  comicCaptionRotationDeg: -5,
  bendayOpacity: 0.45,
  panelBlurPx: 10,
  glitchEnabled: true,
  glitchSpeedSeconds: 2.2,
};
