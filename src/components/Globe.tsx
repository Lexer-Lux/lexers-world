"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactGlobe, { GlobeMethods } from "react-globe.gl";
import { Color, MeshPhongMaterial, Vector3 } from "three";
import { KEY_LOCATIONS } from "@/lib/data";
import {
  DEFAULT_GLOBE_RUNTIME_SETTINGS,
  GlobeExperimentMode,
  GlobeRuntimeSettings,
} from "@/lib/globe-settings";
import type { LexerEvent } from "@/lib/types";

const SUN_DIRECTION = new Vector3(0.84, 0.28, 0.46).normalize();
const TITLE_MARKER_ID = "globe-title";
const TITLE_MARKER_LAT = 70;
const TITLE_MARKER_LNG = -40;
const EARTH_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-night.jpg";

type BoundaryTier = "country" | "admin1" | "admin2";

interface BoundaryArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  tier: BoundaryTier;
}

interface GlobeShaderUniforms {
  uSunDirection: { value: Vector3 };
  uHatchStrength: { value: number };
  uDetailStrength: { value: number };
  uWireStrength: { value: number };
}

interface PerformanceProfile {
  lowPower: boolean;
  maxPixelRatio: number;
  globeCurvatureResolution: number;
  pointResolution: number;
}

interface GlobeProps {
  events: LexerEvent[];
  onLocationClick: (locationName: string) => void;
  onEventClick: (event: LexerEvent) => void;
  runtimeSettings?: GlobeRuntimeSettings;
}

type GlobeHtmlElementData =
  | {
      id: typeof TITLE_MARKER_ID;
      lat: number;
      lng: number;
      kind: "title";
    }
  | {
      id: string;
      lat: number;
      lng: number;
      name: string;
      kind: "location";
    };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shaderFloat(value: number): string {
  if (!Number.isFinite(value)) {
    return "0.0";
  }

  const rounded = Math.round(value * 10000) / 10000;
  const stringValue = rounded.toString();
  return stringValue.includes(".") ? stringValue : `${stringValue}.0`;
}

function getPerformanceProfile(): PerformanceProfile {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      lowPower: false,
      maxPixelRatio: 1.5,
      globeCurvatureResolution: 4,
      pointResolution: 10,
    };
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const lowPower = prefersReducedMotion || deviceMemory <= 4 || cores <= 4;

  return {
    lowPower,
    maxPixelRatio: lowPower ? 1.15 : 1.75,
    globeCurvatureResolution: lowPower ? 8 : 4,
    pointResolution: lowPower ? 6 : 10,
  };
}

function getDetailStrength(lowPower: boolean): number {
  return lowPower ? 0.36 : 0.92;
}

function createBoundaryTier(gridStep: number, segmentStep: number, tier: BoundaryTier): BoundaryArc[] {
  const arcs: BoundaryArc[] = [];

  for (let lat = -67.5; lat <= 67.5; lat += gridStep) {
    for (let lng = -180; lng < 180; lng += segmentStep) {
      arcs.push({
        startLat: Number(lat.toFixed(2)),
        startLng: Number(lng.toFixed(2)),
        endLat: Number(lat.toFixed(2)),
        endLng: Number(Math.min(180, lng + segmentStep).toFixed(2)),
        tier,
      });
    }
  }

  for (let lng = -180; lng < 180; lng += gridStep) {
    for (let lat = -72; lat < 72; lat += segmentStep) {
      arcs.push({
        startLat: Number(lat.toFixed(2)),
        startLng: Number(lng.toFixed(2)),
        endLat: Number(Math.min(72, lat + segmentStep).toFixed(2)),
        endLng: Number(lng.toFixed(2)),
        tier,
      });
    }
  }

  return arcs;
}

const COUNTRY_BOUNDARY_ARCS = createBoundaryTier(45, 18, "country");
const ADMIN1_BOUNDARY_ARCS = createBoundaryTier(22.5, 12, "admin1");
const ADMIN2_BOUNDARY_ARCS = createBoundaryTier(11.25, 8, "admin2");

function getBoundaryColor(mode: GlobeExperimentMode, tier: BoundaryTier): string {
  if (mode === "wargames") {
    if (tier === "country") return "rgba(144, 255, 211, 0.9)";
    if (tier === "admin1") return "rgba(109, 245, 188, 0.75)";
    return "rgba(86, 226, 168, 0.6)";
  }

  if (mode === "paper") {
    if (tier === "country") return "rgba(105, 76, 47, 0.86)";
    if (tier === "admin1") return "rgba(121, 89, 58, 0.68)";
    return "rgba(142, 107, 73, 0.52)";
  }

  if (tier === "country") return "rgba(194, 231, 255, 0.92)";
  if (tier === "admin1") return "rgba(147, 207, 255, 0.76)";
  return "rgba(114, 187, 255, 0.58)";
}

function scaleRgbaAlpha(color: string, alphaScale: number): string {
  const match = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/i);
  if (!match) {
    return color;
  }

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  const alpha = Number(match[4]);
  const scaledAlpha = clamp(alpha * alphaScale, 0, 1);

  return `rgba(${red}, ${green}, ${blue}, ${scaledAlpha.toFixed(3)})`;
}

function getMarkerPalette(mode: GlobeExperimentMode): { fill: string; stroke: string } {
  if (mode === "wargames") {
    return { fill: "#ff2d75", stroke: "#ff95b7" };
  }

  if (mode === "paper") {
    return { fill: "#ff2d75", stroke: "#ffd0e0" };
  }

  return { fill: "#ff1744", stroke: "#ff8aa5" };
}

function getPointColor(mode: GlobeExperimentMode): string {
  if (mode === "wargames") {
    return "#74ffc3";
  }

  if (mode === "paper") {
    return "#8a402b";
  }

  return "#ff2d75";
}

function getAtmosphereColor(mode: GlobeExperimentMode): string {
  if (mode === "wargames") {
    return "#2ad790";
  }

  if (mode === "paper") {
    return "#b99c77";
  }

  return "#4f72ff";
}

function getAtmosphereAltitude(mode: GlobeExperimentMode, lowPower: boolean): number {
  if (mode === "wargames") {
    return lowPower ? 0.06 : 0.085;
  }

  if (mode === "paper") {
    return lowPower ? 0.08 : 0.1;
  }

  return lowPower ? 0.1 : 0.13;
}

function getMaterialPalette(mode: GlobeExperimentMode): {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  specular: string;
  shininess: number;
} {
  if (mode === "wargames") {
    return {
      color: "#0a1912",
      emissive: "#04150d",
      emissiveIntensity: 0.88,
      specular: "#8dffc9",
      shininess: 28,
    };
  }

  if (mode === "paper") {
    return {
      color: "#d6c7ab",
      emissive: "#21180f",
      emissiveIntensity: 0.22,
      specular: "#e7d9bf",
      shininess: 8,
    };
  }

  return {
    color: "#1f66ff",
    emissive: "#040916",
    emissiveIntensity: 0.62,
    specular: "#71e8ff",
    shininess: 18,
  };
}

function buildDefaultFragmentBody(settings: GlobeRuntimeSettings, lowPower: boolean): string {
  const crosshatchDensity = shaderFloat(
    clamp(settings.crosshatchDensity, 0.4, 2.2) * (lowPower ? 0.82 : 1)
  );
  const crosshatchThreshold = clamp(settings.crosshatchThreshold, 0.82, 0.98);
  const thresholdA = shaderFloat(crosshatchThreshold);
  const thresholdB = shaderFloat(clamp(crosshatchThreshold + 0.02, 0.82, 0.995));
  const thresholdC = shaderFloat(clamp(crosshatchThreshold + 0.04, 0.84, 0.998));

  return `vec3 worldNormal = normalize(vWorldNormal);
float sunDot = dot(worldNormal, normalize(uSunDirection));

float dayMix = smoothstep(-0.22, 0.45, sunDot);
float nightMix = 1.0 - dayMix;

vec3 dayColor = vec3(0.08, 0.53, 1.0);
vec3 twilightColor = vec3(0.64, 0.21, 0.76);
vec3 nightColor = vec3(0.015, 0.028, 0.08);

vec3 ink = mix(nightColor, dayColor, dayMix);
ink = mix(ink, twilightColor, smoothstep(-0.08, 0.08, sunDot) * 0.44);
diffuseColor.rgb = mix(diffuseColor.rgb, ink, 0.58);

float terminatorNoise = sin(vWorldPosition.x * 0.07 + vWorldPosition.y * 0.11 + vWorldPosition.z * 0.09) * 0.5 + 0.5;
float terminatorBand = (1.0 - smoothstep(0.0, 0.06, abs(sunDot))) * mix(0.78, 1.22, terminatorNoise);
vec3 terminatorColor = vec3(1.0, 0.57, 0.18);
diffuseColor.rgb += terminatorColor * terminatorBand * (0.62 + uDetailStrength * 0.32);

float lon = atan(worldNormal.z, worldNormal.x);
float lat = asin(clamp(worldNormal.y, -1.0, 1.0));
float lonLine = 1.0 - smoothstep(0.88, 0.99, abs(sin(lon * 11.0)));
float latLine = 1.0 - smoothstep(0.9, 0.995, abs(sin(lat * 10.0)));
float wireMask = max(lonLine, latLine) * uWireStrength * (0.4 + uDetailStrength * 0.6);
vec3 wireColor = mix(vec3(0.16, 0.84, 1.0), vec3(0.73, 0.92, 1.0), smoothstep(-0.2, 0.5, sunDot));
diffuseColor.rgb = mix(diffuseColor.rgb, wireColor, clamp(wireMask, 0.0, 1.0));

float hatchA = abs(sin((vWorldPosition.x + vWorldPosition.y) * (0.2 * ${crosshatchDensity})));
float hatchB = abs(sin((vWorldPosition.x - vWorldPosition.z) * (0.24 * ${crosshatchDensity})));
float hatchC = abs(sin((vWorldPosition.y + vWorldPosition.z) * (0.17 * ${crosshatchDensity})));
float hatchMask = clamp(step(${thresholdA}, hatchA) * 0.45 + step(${thresholdB}, hatchB) * 0.35 + step(${thresholdC}, hatchC) * 0.2, 0.0, 1.0);
float hatchAmount = nightMix * uHatchStrength * (0.35 + uDetailStrength * 0.45);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.3, hatchMask * hatchAmount);

float rim = pow(1.0 - max(dot(worldNormal, normalize(cameraPosition - vWorldPosition)), 0.0), 2.1);
diffuseColor.rgb += vec3(0.0, 0.7, 1.0) * rim * 0.2;

#include <dithering_fragment>`;
}

function buildWarGamesFragmentBody(settings: GlobeRuntimeSettings, lowPower: boolean): string {
  const lineDensity = shaderFloat(
    clamp(settings.warGamesLineDensity, 6, 24) * (lowPower ? 0.92 : 1)
  );
  const glowStrength = shaderFloat(clamp(settings.warGamesGlowStrength, 0, 2));
  const sweepStrength = shaderFloat(clamp(settings.warGamesSweepStrength, 0, 2));

  return `vec3 worldNormal = normalize(vWorldNormal);
float sunDot = dot(worldNormal, normalize(uSunDirection));
float lon = atan(worldNormal.z, worldNormal.x);
float lat = asin(clamp(worldNormal.y, -1.0, 1.0));

float majorLon = 1.0 - smoothstep(0.9, 0.995, abs(sin(lon * ${lineDensity})));
float majorLat = 1.0 - smoothstep(0.9, 0.995, abs(sin(lat * ${lineDensity} * 0.92)));
float minorLon = 1.0 - smoothstep(0.962, 0.999, abs(sin(lon * ${lineDensity} * 2.6)));
float minorLat = 1.0 - smoothstep(0.962, 0.999, abs(sin(lat * ${lineDensity} * 2.35)));

float wireMask = clamp(max(majorLon, majorLat) * (0.7 + uWireStrength * 0.6) + max(minorLon, minorLat) * 0.35 * uWireStrength, 0.0, 1.0);
float dayMix = smoothstep(-0.14, 0.55, sunDot);
float nightMix = 1.0 - dayMix;

vec3 baseColor = vec3(0.01, 0.04, 0.03);
vec3 lineColor = vec3(0.24, 1.0, 0.69);
vec3 glowColor = vec3(0.53, 1.0, 0.8);

float sweepPattern = 1.0 - smoothstep(0.85, 0.998, abs(sin(vWorldPosition.y * 0.11 + vWorldPosition.x * 0.13)));
float sweep = sweepPattern * ${sweepStrength};
float horizonBand = 1.0 - smoothstep(0.0, 0.075, abs(sunDot));

diffuseColor.rgb = baseColor + lineColor * wireMask;
diffuseColor.rgb += lineColor * sweep * 0.24;
diffuseColor.rgb += glowColor * horizonBand * (0.22 + ${glowStrength} * 0.35);
diffuseColor.rgb += lineColor * nightMix * 0.08 * ${glowStrength};

float starNoise = fract(sin(dot(vWorldPosition.xy + vec2(vWorldPosition.z), vec2(12.9898, 78.233))) * 43758.5453);
diffuseColor.rgb += step(0.997, starNoise) * glowColor * 0.35 * ${glowStrength};
diffuseColor.rgb = clamp(diffuseColor.rgb, 0.0, 1.0);

#include <dithering_fragment>`;
}

function buildPaperFragmentBody(settings: GlobeRuntimeSettings, lowPower: boolean): string {
  const grainStrength = shaderFloat(
    clamp(settings.paperGrainStrength, 0, 1.6) * (lowPower ? 0.7 : 1)
  );
  const halftoneStrength = shaderFloat(
    clamp(settings.paperHalftoneStrength, 0, 1.6) * (lowPower ? 0.7 : 1)
  );
  const inkStrength = shaderFloat(clamp(settings.paperInkStrength, 0, 1.6));
  const crosshatchDensity = shaderFloat(
    clamp(settings.crosshatchDensity, 0.4, 2.2) * (lowPower ? 0.82 : 1)
  );
  const crosshatchThreshold = shaderFloat(clamp(settings.crosshatchThreshold, 0.82, 0.98));

  return `vec3 worldNormal = normalize(vWorldNormal);
float sunDot = dot(worldNormal, normalize(uSunDirection));
float dayMix = smoothstep(-0.2, 0.46, sunDot);
float nightMix = 1.0 - dayMix;

vec3 paperDay = vec3(0.91, 0.85, 0.71);
vec3 paperNight = vec3(0.57, 0.61, 0.63);
vec3 inkColor = vec3(0.08, 0.09, 0.13);

float grainNoise = fract(sin(dot(vWorldPosition.xy * 0.95 + vec2(vWorldPosition.z * 0.41), vec2(127.1, 311.7))) * 43758.5453);
float grainCentered = (grainNoise - 0.5) * ${grainStrength};

float lon = atan(worldNormal.z, worldNormal.x);
float lat = asin(clamp(worldNormal.y, -1.0, 1.0));
float contour = max(
  1.0 - smoothstep(0.93, 0.995, abs(sin(lon * 8.8))),
  1.0 - smoothstep(0.93, 0.995, abs(sin(lat * 8.2)))
) * (0.25 + uWireStrength * 0.75);

float dots = abs(sin((vWorldPosition.x + vWorldPosition.y) * 0.22) * sin((vWorldPosition.y - vWorldPosition.z) * 0.19));
float halftone = step(0.68, dots) * nightMix * ${halftoneStrength};
float hatchA = abs(sin((vWorldPosition.x + vWorldPosition.y) * (0.17 * ${crosshatchDensity})));
float hatchB = abs(sin((vWorldPosition.x - vWorldPosition.z) * (0.2 * ${crosshatchDensity})));
float hatchC = abs(sin((vWorldPosition.y + vWorldPosition.z) * (0.16 * ${crosshatchDensity})));
float hatchMask = clamp(step(${crosshatchThreshold}, hatchA) * 0.5 + step(${crosshatchThreshold}, hatchB) * 0.35 + step(${crosshatchThreshold}, hatchC) * 0.15, 0.0, 1.0);
float terminatorBand = 1.0 - smoothstep(0.0, 0.09, abs(sunDot));

vec3 colorized = mix(paperNight, paperDay, dayMix);
colorized += vec3(grainCentered);
colorized = mix(colorized, colorized * 0.74, halftone * 0.5);
colorized = mix(colorized, colorized * 0.65, hatchMask * nightMix * uHatchStrength * 0.42);
colorized = mix(colorized, inkColor, contour * ${inkStrength} * 0.65);
colorized = mix(colorized, vec3(0.84, 0.42, 0.21), terminatorBand * 0.2);

diffuseColor.rgb = mix(diffuseColor.rgb, colorized, 0.97);
diffuseColor.rgb = clamp(diffuseColor.rgb, 0.0, 1.0);

#include <dithering_fragment>`;
}

function buildFragmentBody(settings: GlobeRuntimeSettings, lowPower: boolean): string {
  if (settings.globeExperimentMode === "wargames") {
    return buildWarGamesFragmentBody(settings, lowPower);
  }

  if (settings.globeExperimentMode === "paper") {
    return buildPaperFragmentBody(settings, lowPower);
  }

  return buildDefaultFragmentBody(settings, lowPower);
}

export default function Globe({
  events,
  onLocationClick,
  onEventClick,
  runtimeSettings,
}: GlobeProps) {
  const settings = runtimeSettings ?? DEFAULT_GLOBE_RUNTIME_SETTINGS;
  const mode = settings.globeExperimentMode;
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const onLocationClickRef = useRef(onLocationClick);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [altitude, setAltitude] = useState(2.5);
  const performanceProfile = useMemo(() => getPerformanceProfile(), []);

  useEffect(() => {
    onLocationClickRef.current = onLocationClick;
  }, [onLocationClick]);

  const globeMaterial = useMemo(() => {
    const detailStrength = getDetailStrength(performanceProfile.lowPower);
    const wireStrength = clamp(settings.wireStrength, 0, 1.6);
    const hatchStrength = clamp(settings.hatchStrength, 0, 1.6);
    const palette = getMaterialPalette(mode);

    const material = new MeshPhongMaterial({
      color: new Color(palette.color),
      emissive: new Color(palette.emissive),
      emissiveIntensity: palette.emissiveIntensity,
      specular: new Color(palette.specular),
      shininess: palette.shininess,
    });

    const uniforms: GlobeShaderUniforms = {
      uSunDirection: { value: SUN_DIRECTION },
      uHatchStrength: {
        value: performanceProfile.lowPower ? 0 : detailStrength * hatchStrength,
      },
      uDetailStrength: { value: detailStrength },
      uWireStrength: {
        value: (performanceProfile.lowPower ? 0.36 : 0.76) * wireStrength,
      },
    };

    const fragmentBody = buildFragmentBody(settings, performanceProfile.lowPower);

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDirection = uniforms.uSunDirection;
      shader.uniforms.uHatchStrength = uniforms.uHatchStrength;
      shader.uniforms.uDetailStrength = uniforms.uDetailStrength;
      shader.uniforms.uWireStrength = uniforms.uWireStrength;

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;`
        )
        .replace(
          "#include <worldpos_vertex>",
          `#include <worldpos_vertex>
vWorldNormal = normalize(mat3(modelMatrix) * normal);
vWorldPosition = worldPosition.xyz;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
uniform vec3 uSunDirection;
uniform float uHatchStrength;
uniform float uDetailStrength;
uniform float uWireStrength;`
        )
        .replace("#include <dithering_fragment>", fragmentBody);
    };

    material.customProgramCacheKey = () =>
      [
        "stylized-globe",
        performanceProfile.lowPower ? "low" : "full",
        settings.globeExperimentMode,
        settings.wireStrength,
        settings.hatchStrength,
        settings.crosshatchDensity,
        settings.crosshatchThreshold,
        settings.warGamesLineDensity,
        settings.warGamesGlowStrength,
        settings.warGamesSweepStrength,
        settings.paperGrainStrength,
        settings.paperHalftoneStrength,
        settings.paperInkStrength,
      ].join("|");

    return material;
  }, [
    mode,
    performanceProfile.lowPower,
    settings,
  ]);

  const isZoomedOut = altitude >= settings.zoomThreshold;

  const boundaryArcs = useMemo(() => {
    if (!settings.showBoundaryTiers) {
      return [];
    }

    const showCountry = altitude <= 2.95;
    const showAdmin1 = altitude <= Math.max(2.2, settings.zoomThreshold + 0.5);
    const showAdmin2 = !performanceProfile.lowPower && altitude <= settings.zoomThreshold + 0.1;

    const arcs: BoundaryArc[] = [];

    if (showCountry) {
      arcs.push(...COUNTRY_BOUNDARY_ARCS);
    }

    if (showAdmin1) {
      arcs.push(...ADMIN1_BOUNDARY_ARCS);
    }

    if (showAdmin2) {
      arcs.push(...ADMIN2_BOUNDARY_ARCS);
    }

    return arcs;
  }, [altitude, performanceProfile.lowPower, settings.showBoundaryTiers, settings.zoomThreshold]);

  const atmosphereColor = useMemo(() => {
    const fallback = getAtmosphereColor(mode);
    const configured = settings.atmosphereColor?.trim();
    if (!configured) {
      return fallback;
    }

    return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(configured) ? configured : fallback;
  }, [mode, settings.atmosphereColor]);

  const atmosphereAltitude = useMemo(() => {
    const fallback = getAtmosphereAltitude(mode, performanceProfile.lowPower);
    return clamp(settings.atmosphereAltitude || fallback, 0.03, 0.28);
  }, [mode, performanceProfile.lowPower, settings.atmosphereAltitude]);

  const pointRadius = useMemo(() => clamp(settings.pointRadius, 0.12, 1.2), [settings.pointRadius]);
  const pointAltitude = useMemo(() => clamp(settings.pointAltitude, 0, 0.05), [settings.pointAltitude]);
  const markerScale = useMemo(() => clamp(settings.markerScale, 0.6, 2), [settings.markerScale]);
  const boundaryOpacity = useMemo(
    () => clamp(settings.boundaryOpacity, 0, 1.6),
    [settings.boundaryOpacity]
  );

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) {
      return;
    }

    const scene = globe.scene();
    scene.background = null;

    globe.pointOfView({ lat: 35, lng: -40, altitude: 2.5 }, 0);

    const renderer = globe.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, performanceProfile.maxPixelRatio));

    const controls = globe.controls();

    const handleControlsChange = () => {
      const pov = globe.pointOfView();
      setAltitude(pov.altitude);
    };

    handleControlsChange();
    controls.addEventListener("change", handleControlsChange);

    return () => {
      controls.removeEventListener("change", handleControlsChange);
    };
  }, [performanceProfile.maxPixelRatio]);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) {
      return;
    }

    controls.autoRotate = settings.autoRotate;
    controls.autoRotateSpeed = settings.autoRotateSpeed;
    controls.rotateSpeed = settings.dragRotateSpeed;
    controls.enableDamping = settings.useInertia;
    controls.dampingFactor = settings.useInertia ? settings.inertiaDamping : 0;
  }, [
    settings.autoRotate,
    settings.autoRotateSpeed,
    settings.dragRotateSpeed,
    settings.inertiaDamping,
    settings.useInertia,
  ]);

  useEffect(
    () => () => {
      globeMaterial.dispose();
    },
    [globeMaterial]
  );

  const markerHtml = useCallback(
    (data: GlobeHtmlElementData) => {
      if (data.kind === "title") {
        return `
          <div style="
            transform: translate(-50%, -50%);
            pointer-events: none;
            width: 280px;
            opacity: 0.95;
          ">
            <svg viewBox="0 0 560 170" role="presentation" focusable="false" style="width: 100%; height: auto; overflow: visible;">
              <defs>
                <path id="lexer-title-arc" d="M 54 148 A 226 226 0 0 1 506 148" />
              </defs>
              <text fill="#ff2d75" font-size="38" font-weight="800" letter-spacing="0.2em" style="font-family:monospace;filter: drop-shadow(0 0 8px rgba(255,45,117,0.55));">
                <textPath href="#lexer-title-arc" startOffset="50%" text-anchor="middle">LEXER'S WORLD</textPath>
              </text>
            </svg>
          </div>
        `;
      }

      const location = data;
      if (!isZoomedOut) {
        return "";
      }

      const palette = getMarkerPalette(mode);
      const markerSize = Math.max(14, Math.round(24 * markerScale));
      const labelFontSize = Math.max(9, Math.round(11 * markerScale));
      const labelMarginTop = Math.max(2, Math.round(2 * markerScale));
      const strokeWidth = Math.max(0.4, 0.6 * markerScale).toFixed(2);

      return `
        <div style="position:relative;width:${markerSize}px;height:${markerSize}px;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;">
          <svg width="${markerSize}" height="${markerSize}" viewBox="0 0 24 24" fill="${palette.fill}" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z"
              stroke="${palette.stroke}" stroke-width="${strokeWidth}"/>
          </svg>
          <div style="
            position:absolute;
            top:100%;
            left:50%;
            transform:translateX(-50%);
            margin-top:${labelMarginTop}px;
            color:${palette.fill};
            font-size:${labelFontSize}px;
            font-weight:700;
            text-shadow:0 0 6px rgba(255,255,255,0.18);
            white-space:nowrap;
            line-height:1;
            letter-spacing:0.4px;
            font-family:monospace;
          ">${location.name}</div>
        </div>
      `;
    },
    [isZoomedOut, markerScale, mode]
  );

  const htmlElementsData = useMemo<GlobeHtmlElementData[]>(() => {
    const data: GlobeHtmlElementData[] = [];

    if (settings.showCurvedTitle) {
      data.push({
        id: TITLE_MARKER_ID,
        lat: TITLE_MARKER_LAT,
        lng: TITLE_MARKER_LNG,
        kind: "title",
      });
    }

    if (isZoomedOut) {
      data.push(
        ...KEY_LOCATIONS.map((location) => ({
          ...location,
          kind: "location" as const,
        }))
      );
    }

    return data;
  }, [isZoomedOut, settings.showCurvedTitle]);

  return (
    <ReactGlobe
      ref={globeRef}
      width={dimensions.width}
      height={dimensions.height}
      backgroundColor="rgba(0,0,0,0)"
      backgroundImageUrl={null}
      globeImageUrl={EARTH_TEXTURE_URL}
      globeMaterial={globeMaterial}
      showGraticules={mode === "default"}
      showAtmosphere={settings.showAtmosphere}
      atmosphereColor={atmosphereColor}
      atmosphereAltitude={atmosphereAltitude}
      globeCurvatureResolution={performanceProfile.globeCurvatureResolution}
      arcsData={boundaryArcs}
      arcStartLat={(data) => (data as BoundaryArc).startLat}
      arcStartLng={(data) => (data as BoundaryArc).startLng}
      arcEndLat={(data) => (data as BoundaryArc).endLat}
      arcEndLng={(data) => (data as BoundaryArc).endLng}
      arcColor={(data: object) =>
        scaleRgbaAlpha(getBoundaryColor(mode, (data as BoundaryArc).tier), boundaryOpacity)
      }
      arcAltitude={(data: object) => {
        const tier = (data as BoundaryArc).tier;
        if (tier === "country") return 0.016;
        if (tier === "admin1") return 0.012;
        return 0.008;
      }}
      arcStroke={(data: object) => {
        const tier = (data as BoundaryArc).tier;
        if (tier === "country") return 0.98;
        if (tier === "admin1") return 0.64;
        return 0.36;
      }}
      arcDashLength={(data: object) => {
        const tier = (data as BoundaryArc).tier;
        if (tier === "country") return 1;
        if (tier === "admin1") return 0.35;
        return 0.1;
      }}
      arcDashGap={(data: object) => {
        const tier = (data as BoundaryArc).tier;
        if (tier === "country") return 0;
        if (tier === "admin1") return 0.35;
        return 0.22;
      }}
      arcDashAnimateTime={0}
      arcsTransitionDuration={0}
      htmlElementsData={htmlElementsData}
      htmlLat={(data) => (data as GlobeHtmlElementData).lat}
      htmlLng={(data) => (data as GlobeHtmlElementData).lng}
      htmlElement={(data) => {
        const htmlData = data as GlobeHtmlElementData;
        const element = document.createElement("div");
        element.innerHTML = markerHtml(htmlData);

        if (htmlData.kind === "location") {
          element.style.pointerEvents = "auto";
          element.style.cursor = "pointer";
          element.onclick = (event) => {
            event.stopPropagation();
            onLocationClickRef.current(htmlData.name);
          };
        } else {
          element.style.pointerEvents = "none";
        }

        return element;
      }}
      htmlAltitude={(data) => ((data as GlobeHtmlElementData).kind === "title" ? 0.2 : 0)}
      htmlTransitionDuration={0}
      pointsData={isZoomedOut ? [] : events}
      pointLat={(data) => (data as LexerEvent).lat}
      pointLng={(data) => (data as LexerEvent).lng}
      pointColor={() => getPointColor(mode)}
      pointRadius={pointRadius}
      pointAltitude={pointAltitude}
      pointResolution={performanceProfile.pointResolution}
      onPointClick={(point) => onEventClick(point as LexerEvent)}
    />
  );
}
