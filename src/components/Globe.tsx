"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactGlobe, { GlobeMethods } from "react-globe.gl";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  MeshPhongMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import { KEY_LOCATIONS } from "@/lib/data";
import {
  DEFAULT_GLOBE_RUNTIME_SETTINGS,
  GlobeRuntimeSettings,
} from "@/lib/globe-settings";
import type { KeyLocation, LexerEvent } from "@/lib/types";

const SUN_DIRECTION = new Vector3(0.84, 0.28, 0.46).normalize();
const EARTH_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const COUNTRIES_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const ADMIN1_LINES_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces_lines.geojson";
const ADMIN2_COUNTIES_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_2_counties.geojson";

type BoundaryTier = "country" | "admin1" | "admin2";

interface BoundaryArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  tier: BoundaryTier;
}

interface GeoFeature {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
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
  onAltitudeChange?: (altitude: number) => void;
}

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

function readLngLatPair(point: unknown): [number, number] | null {
  if (!Array.isArray(point) || point.length < 2) {
    return null;
  }

  const lng = Number(point[0]);
  const lat = Number(point[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lng, lat];
}

function addLineArcsFromCoordinatePath(
  path: unknown,
  tier: BoundaryTier,
  stride: number,
  maxArcs: number,
  output: BoundaryArc[]
) {
  if (!Array.isArray(path)) {
    return;
  }

  const coordinates = path as unknown[];
  if (coordinates.length < 2) {
    return;
  }

  const step = Math.max(1, Math.round(stride));

  for (let index = 0; index < coordinates.length - 1 && output.length < maxArcs; index += step) {
    const start = readLngLatPair(coordinates[index]);
    const end = readLngLatPair(coordinates[Math.min(index + step, coordinates.length - 1)]);

    if (!start || !end) {
      continue;
    }

    output.push({
      startLat: start[1],
      startLng: start[0],
      endLat: end[1],
      endLng: end[0],
      tier,
    });
  }
}

function geoJsonFeaturesToBoundaryArcs(
  features: GeoFeature[],
  tier: BoundaryTier,
  stride: number,
  maxArcs: number
): BoundaryArc[] {
  const arcs: BoundaryArc[] = [];

  for (const feature of features) {
    if (arcs.length >= maxArcs) {
      break;
    }

    const geometry = feature.geometry;
    const type = geometry?.type;
    const coordinates = geometry?.coordinates;

    if (!type || !coordinates) {
      continue;
    }

    if (type === "LineString") {
      addLineArcsFromCoordinatePath(coordinates, tier, stride, maxArcs, arcs);
      continue;
    }

    if (type === "MultiLineString") {
      if (Array.isArray(coordinates)) {
        for (const line of coordinates) {
          if (arcs.length >= maxArcs) {
            break;
          }
          addLineArcsFromCoordinatePath(line, tier, stride, maxArcs, arcs);
        }
      }
      continue;
    }

    if (type === "Polygon") {
      if (Array.isArray(coordinates)) {
        for (const ring of coordinates) {
          if (arcs.length >= maxArcs) {
            break;
          }
          addLineArcsFromCoordinatePath(ring, tier, stride, maxArcs, arcs);
        }
      }
      continue;
    }

    if (type === "MultiPolygon" && Array.isArray(coordinates)) {
      for (const polygon of coordinates) {
        if (!Array.isArray(polygon)) {
          continue;
        }

        for (const ring of polygon) {
          if (arcs.length >= maxArcs) {
            break;
          }
          addLineArcsFromCoordinatePath(ring, tier, stride, maxArcs, arcs);
        }

        if (arcs.length >= maxArcs) {
          break;
        }
      }
    }
  }

  return arcs;
}

async function fetchGeoJsonFeatures(url: string): Promise<GeoFeature[]> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { features?: GeoFeature[] };
  return Array.isArray(payload.features) ? payload.features : [];
}

function getBoundaryColor(paperEnabled: boolean, tier: BoundaryTier): string {
  if (paperEnabled) {
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

function getMarkerPalette(paperEnabled: boolean): { fill: string; stroke: string } {
  if (paperEnabled) {
    return { fill: "#ff2d75", stroke: "#ff95b7" };
  }

  return { fill: "#ff1744", stroke: "#ff8aa5" };
}

function getPointColor(paperEnabled: boolean): string {
  if (paperEnabled) {
    return "#8a402b";
  }

  return "#ff2d75";
}

function getAtmosphereColor(paperEnabled: boolean): string {
  if (paperEnabled) {
    return "#b99c77";
  }

  return "#4f72ff";
}

function getAtmosphereAltitude(paperEnabled: boolean, lowPower: boolean): number {
  if (paperEnabled) {
    return lowPower ? 0.08 : 0.1;
  }

  return lowPower ? 0.1 : 0.13;
}

function getMaterialPalette(paperEnabled: boolean): {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  specular: string;
  shininess: number;
} {
  if (paperEnabled) {
    return {
      color: "#ffffff",
      emissive: "#21180f",
      emissiveIntensity: 0.22,
      specular: "#e7d9bf",
      shininess: 8,
    };
  }

  return {
    color: "#ffffff",
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
  const crosshatchThreshold = clamp(settings.crosshatchThreshold, 0.55, 0.98);
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
vec3 lightingTint = mix(vec3(0.3, 0.35, 0.56), vec3(1.12, 1.08, 0.98), dayMix);
diffuseColor.rgb *= lightingTint;
diffuseColor.rgb = mix(diffuseColor.rgb, ink, 0.26);

float terminatorNoise = sin(vWorldPosition.x * 0.07 + vWorldPosition.y * 0.11 + vWorldPosition.z * 0.09) * 0.5 + 0.5;
float terminatorBand = (1.0 - smoothstep(0.0, 0.06, abs(sunDot))) * mix(0.78, 1.22, terminatorNoise);
vec3 terminatorColor = vec3(1.0, 0.57, 0.18);
diffuseColor.rgb += terminatorColor * terminatorBand * (0.82 + uDetailStrength * 0.4);

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
float hatchAmount = (0.08 + nightMix * 0.78) * uHatchStrength * (0.35 + uDetailStrength * 0.45);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.3, hatchMask * hatchAmount);

float rim = pow(1.0 - max(dot(worldNormal, normalize(cameraPosition - vWorldPosition)), 0.0), 2.1);
diffuseColor.rgb += vec3(0.0, 0.7, 1.0) * rim * 0.2;

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
  const crosshatchThreshold = shaderFloat(clamp(settings.crosshatchThreshold, 0.55, 0.98));

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
  if (settings.enablePaperEffect) {
    return buildPaperFragmentBody(settings, lowPower);
  }

  return buildDefaultFragmentBody(settings, lowPower);
}

export default function Globe({
  events,
  onLocationClick,
  onEventClick,
  runtimeSettings,
  onAltitudeChange,
}: GlobeProps) {
  const settings = runtimeSettings ?? DEFAULT_GLOBE_RUNTIME_SETTINGS;
  const paperEnabled = settings.enablePaperEffect;
  const useStylizedShader = true;
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const onLocationClickRef = useRef(onLocationClick);
  const onAltitudeChangeRef = useRef(onAltitudeChange);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [altitude, setAltitude] = useState(2.5);
  const [countryBoundaryArcs, setCountryBoundaryArcs] = useState<BoundaryArc[]>([]);
  const [admin1BoundaryArcs, setAdmin1BoundaryArcs] = useState<BoundaryArc[]>([]);
  const [admin2BoundaryArcs, setAdmin2BoundaryArcs] = useState<BoundaryArc[]>([]);
  const performanceProfile = useMemo(() => getPerformanceProfile(), []);

  const earthTexture = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const texture = new TextureLoader().load(EARTH_TEXTURE_URL);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);

  useEffect(
    () => () => {
      earthTexture?.dispose();
    },
    [earthTexture]
  );

  useEffect(() => {
    onLocationClickRef.current = onLocationClick;
  }, [onLocationClick]);

  useEffect(() => {
    onAltitudeChangeRef.current = onAltitudeChange;
  }, [onAltitudeChange]);

  const globeMaterial = useMemo(() => {
    if (!useStylizedShader) {
      return null;
    }

    const detailStrength = getDetailStrength(performanceProfile.lowPower);
    const wireStrength = clamp(settings.wireStrength, 0, 1.6);
    const hatchStrength = clamp(settings.hatchStrength, 0, 1.6);
    const palette = getMaterialPalette(paperEnabled);

    const material = new MeshPhongMaterial({
      color: new Color(palette.color),
      emissive: new Color(palette.emissive),
      emissiveIntensity: palette.emissiveIntensity,
      specular: new Color(palette.specular),
      shininess: palette.shininess,
      map: earthTexture ?? undefined,
    });
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;

    const uniforms: GlobeShaderUniforms = {
      uSunDirection: { value: SUN_DIRECTION },
      uHatchStrength: {
        value: performanceProfile.lowPower ? 0 : detailStrength * hatchStrength * 1.25,
      },
      uDetailStrength: { value: detailStrength },
      uWireStrength: {
        value: (performanceProfile.lowPower ? 0.45 : 1.15) * wireStrength,
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
        settings.enablePaperEffect ? "paper-on" : "paper-off",
        settings.wireStrength,
        settings.hatchStrength,
        settings.crosshatchDensity,
        settings.crosshatchThreshold,
        settings.paperGrainStrength,
        settings.paperHalftoneStrength,
        settings.paperInkStrength,
      ].join("|");

    return material;
  }, [
    paperEnabled,
    useStylizedShader,
    earthTexture,
    performanceProfile.lowPower,
    settings,
  ]);

  const isZoomedOut = altitude >= settings.zoomThreshold;

  const boundaryArcs = useMemo(() => {
    const arcs: BoundaryArc[] = [];

    if (settings.showInternationalBorders && countryBoundaryArcs.length > 0) {
      arcs.push(...countryBoundaryArcs);
    }

    if (settings.showAdmin1Divisions && admin1BoundaryArcs.length > 0) {
      arcs.push(...admin1BoundaryArcs);
    }

    if (settings.showAdmin2Divisions && admin2BoundaryArcs.length > 0) {
      arcs.push(...admin2BoundaryArcs);
    }

    return arcs;
  }, [
    admin1BoundaryArcs,
    admin2BoundaryArcs,
    countryBoundaryArcs,
    settings.showAdmin1Divisions,
    settings.showAdmin2Divisions,
    settings.showInternationalBorders,
  ]);

  const atmosphereColor = useMemo(() => {
    const fallback = getAtmosphereColor(paperEnabled);
    const configured = settings.atmosphereColor?.trim();
    if (!configured) {
      return fallback;
    }

    return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(configured) ? configured : fallback;
  }, [paperEnabled, settings.atmosphereColor]);

  const atmosphereAltitude = useMemo(() => {
    const fallback = getAtmosphereAltitude(paperEnabled, performanceProfile.lowPower);
    return clamp(settings.atmosphereAltitude || fallback, 0.03, 0.28);
  }, [paperEnabled, performanceProfile.lowPower, settings.atmosphereAltitude]);

  const pointRadius = useMemo(() => clamp(settings.pointRadius, 0.05, 2.4), [settings.pointRadius]);
  const pointAltitude = useMemo(() => clamp(settings.pointAltitude, 0, 0.12), [settings.pointAltitude]);
  const markerScale = useMemo(() => clamp(settings.markerScale, 0.35, 3.2), [settings.markerScale]);
  const boundaryOpacity = useMemo(
    () => clamp(settings.boundaryOpacity, 0, 2.4),
    [settings.boundaryOpacity]
  );
  const internationalBorderThickness = useMemo(
    () => clamp(settings.internationalBorderThickness, 0.2, 2.5),
    [settings.internationalBorderThickness]
  );
  const admin1Thickness = useMemo(() => clamp(settings.admin1Thickness, 0.1, 2), [settings.admin1Thickness]);
  const admin1DashLength = useMemo(
    () => clamp(settings.admin1DashLength, 0.05, 0.95),
    [settings.admin1DashLength]
  );
  const admin1DashGap = useMemo(() => clamp(settings.admin1DashGap, 0.05, 0.95), [settings.admin1DashGap]);
  const admin2DotSize = useMemo(() => clamp(settings.admin2DotSize, 0.02, 0.8), [settings.admin2DotSize]);
  const admin2DotGap = useMemo(() => clamp(settings.admin2DotGap, 0.04, 0.98), [settings.admin2DotGap]);

  useEffect(() => {
    let cancelled = false;

    const loadAdministrativeBoundaries = async () => {
      try {
        const [countryFeatures, admin1Features, admin2Features] = await Promise.all([
          fetchGeoJsonFeatures(COUNTRIES_GEOJSON_URL),
          fetchGeoJsonFeatures(ADMIN1_LINES_GEOJSON_URL),
          fetchGeoJsonFeatures(ADMIN2_COUNTIES_GEOJSON_URL),
        ]);

        if (cancelled) {
          return;
        }

        setCountryBoundaryArcs(
          geoJsonFeaturesToBoundaryArcs(countryFeatures, "country", 1, 18000)
        );
        setAdmin1BoundaryArcs(geoJsonFeaturesToBoundaryArcs(admin1Features, "admin1", 1, 22000));
        setAdmin2BoundaryArcs(geoJsonFeaturesToBoundaryArcs(admin2Features, "admin2", 3, 28000));
      } catch {
        // graceful fallback when remote boundary data is unavailable
      }
    };

    loadAdministrativeBoundaries();

    return () => {
      cancelled = true;
    };
  }, []);

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

    const ambientIntensity = useStylizedShader ? 0.22 : 0.05;
    const sunIntensity = useStylizedShader ? 1.12 : 1.58;

    const ambientLight = new AmbientLight(0xffffff, ambientIntensity);
    const sunLight = new DirectionalLight(0xffffff, sunIntensity);
    const nightFill = new DirectionalLight(0x355d9f, useStylizedShader ? 0.1 : 0.04);
    sunLight.position.copy(SUN_DIRECTION.clone().multiplyScalar(300));
    nightFill.position.copy(SUN_DIRECTION.clone().multiplyScalar(-280));
    scene.add(ambientLight);
    scene.add(sunLight);
    scene.add(nightFill);

    globe.pointOfView({ lat: 35, lng: -40, altitude: 2.5 }, 0);

    const renderer = globe.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, performanceProfile.maxPixelRatio));

    const controls = globe.controls();

    const handleControlsChange = () => {
      const pov = globe.pointOfView();
      setAltitude(pov.altitude);
      onAltitudeChangeRef.current?.(pov.altitude);
    };

    handleControlsChange();
    controls.addEventListener("change", handleControlsChange);

    return () => {
      controls.removeEventListener("change", handleControlsChange);
      scene.remove(ambientLight);
      scene.remove(sunLight);
      scene.remove(nightFill);
    };
  }, [performanceProfile.maxPixelRatio, useStylizedShader]);

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
      globeMaterial?.dispose();
    },
    [globeMaterial]
  );

  const markerHtml = useCallback(
    (data: KeyLocation) => {
      const location = data;
      if (!isZoomedOut) {
        return "";
      }

      const palette = getMarkerPalette(paperEnabled);
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
    [isZoomedOut, markerScale, paperEnabled]
  );

  return (
    <ReactGlobe
      ref={globeRef}
      width={dimensions.width}
      height={dimensions.height}
      backgroundColor="rgba(0,0,0,0)"
      backgroundImageUrl={null}
      globeImageUrl={EARTH_TEXTURE_URL}
      globeMaterial={useStylizedShader ? globeMaterial ?? undefined : undefined}
      showGraticules={!paperEnabled}
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
        scaleRgbaAlpha(
          getBoundaryColor(paperEnabled, (data as BoundaryArc).tier),
          boundaryOpacity *
            ((data as BoundaryArc).tier === "country"
              ? 1
              : (data as BoundaryArc).tier === "admin1"
                ? 0.9
                : 0.78)
        )
      }
      arcAltitude={(data: object) => {
        const tier = (data as BoundaryArc).tier;
        if (tier === "country") return 0.016;
        if (tier === "admin1") return 0.012;
        return 0.008;
      }}
      arcStroke={(data: object) => {
        const tier = (data as BoundaryArc).tier;
        if (tier === "country") return internationalBorderThickness;
        if (tier === "admin1") return admin1Thickness;
        return 0.36;
      }}
      arcDashLength={(data: object) => {
        const tier = (data as BoundaryArc).tier;
        if (tier === "country") return 1;
        if (tier === "admin1") return admin1DashLength;
        return admin2DotSize;
      }}
      arcDashGap={(data: object) => {
        const tier = (data as BoundaryArc).tier;
        if (tier === "country") return 0;
        if (tier === "admin1") return admin1DashGap;
        return admin2DotGap;
      }}
      arcDashAnimateTime={0}
      arcsTransitionDuration={0}
      htmlElementsData={isZoomedOut ? KEY_LOCATIONS : []}
      htmlLat={(data) => (data as KeyLocation).lat}
      htmlLng={(data) => (data as KeyLocation).lng}
      htmlElement={(data) => {
        const location = data as KeyLocation;
        const element = document.createElement("div");
        element.innerHTML = markerHtml(location);
        element.style.pointerEvents = "auto";
        element.style.cursor = "pointer";
        element.onclick = (event) => {
          event.stopPropagation();
          onLocationClickRef.current(location.name);
        };

        return element;
      }}
      htmlAltitude={0}
      htmlTransitionDuration={0}
      pointsData={isZoomedOut ? [] : events}
      pointLat={(data) => (data as LexerEvent).lat}
      pointLng={(data) => (data as LexerEvent).lng}
      pointColor={() => getPointColor(paperEnabled)}
      pointRadius={pointRadius}
      pointAltitude={pointAltitude}
      pointResolution={performanceProfile.pointResolution}
      onPointClick={(point) => onEventClick(point as LexerEvent)}
    />
  );
}
