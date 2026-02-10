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
  nebulaOpacity: 0.7,
  nebulaBlurPx: 34,
  nebulaDriftSeconds: 14,
  showGridOverlay: true,
  gridOpacity: 0.26,
  gridAngleDeg: 112,
  gridSpacingPx: 11,
  gridDriftSeconds: 18,
  showHorizonFade: true,
  horizonOpacity: 1,
  showMotionLines: true,
  motionLinesOpacity: 0.03,
  motionLinesSpeedSeconds: 3,
  showEdgeStreaks: true,
  edgeStreaksOpacity: 0.06,
  edgeStreaksSpeedSeconds: 9,
  showBurstOverlay: true,
  burstOverlayOpacity: 0.09,
  burstOverlayPulseSeconds: 5.5,
  showComicCaptions: true,
  comicCaptionRotationDeg: -5,
  bendayOpacity: 0.7,
  panelBlurPx: 14,
  glitchEnabled: true,
  glitchSpeedSeconds: 2.2,
};
