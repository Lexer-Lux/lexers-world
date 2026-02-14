"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactGlobe, { GlobeMethods } from "react-globe.gl";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  MeshPhongMaterial,
  NormalBlending,
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
const EARTH_TEXTURE_URL = "/earth-blue-marble.jpg";
const COUNTRIES_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_boundary_lines_land.geojson";
const COASTLINE_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson";
const ADMIN1_LINES_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces_lines.geojson";
const ADMIN2_COUNTIES_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_2_counties.geojson";

type BoundaryTier = "country" | "coast" | "admin1" | "admin2";

interface BoundaryPoint {
  lat: number;
  lng: number;
  alt?: number;
}

interface BoundaryPath {
  points: BoundaryPoint[];
  tier: BoundaryTier;
  centerLat: number;
  centerLng: number;
  centerVector: [number, number, number];
  sampleVectors: Array<[number, number, number]>;
  angularSpanDeg: number;
  pathLengthDeg: number;
  complexity: number;
}

interface BorderDotPoint {
  lat: number;
  lng: number;
  pointType: "admin2-dot";
}

type GlobePointDatum = LexerEvent | BorderDotPoint;

interface GeoFeature {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
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
        pointResolution: 8,
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
    pointResolution: lowPower ? 5 : 8,
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

function latLngToUnitVector(lat: number, lng: number): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return [cosLat * Math.cos(lngRad), Math.sin(latRad), cosLat * Math.sin(lngRad)];
}

function dotUnitVector(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function angularDistanceDeg(latA: number, lngA: number, latB: number, lngB: number): number {
  const latARad = (latA * Math.PI) / 180;
  const latBRad = (latB * Math.PI) / 180;
  const dLat = latBRad - latARad;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const a =
    sinHalfLat * sinHalfLat + Math.cos(latARad) * Math.cos(latBRad) * sinHalfLng * sinHalfLng;
  const clamped = Math.min(1, Math.max(0, a));
  return (2 * Math.asin(Math.sqrt(clamped)) * 180) / Math.PI;
}

function estimateProjectedPixels(angularSpanDeg: number, altitude: number, viewportMin: number): number {
  const normalizedSpan = clamp(angularSpanDeg / 180, 0, 1);
  const distanceFactor = 2.2 / Math.max(1 + altitude, 1.05);
  return normalizedSpan * viewportMin * distanceFactor;
}

function buildBoundaryPointsFromCoordinatePath(
  path: unknown,
  coordinateStride: number,
  maxPointsPerPath: number
): BoundaryPoint[] {
  if (!Array.isArray(path)) {
    return [];
  }

  const coordinates = path as unknown[];
  if (coordinates.length < 2) {
    return [];
  }

  const points: BoundaryPoint[] = [];
  const step = Math.max(1, Math.round(coordinateStride));
  let consumedLastIndex = -1;

  for (let index = 0; index < coordinates.length; index += step) {
    const pair = readLngLatPair(coordinates[index]);
    if (!pair) {
      continue;
    }

    consumedLastIndex = index;
    const lng = pair[0];
    const lat = pair[1];
    const previous = points[points.length - 1];

    if (previous && previous.lat === lat && previous.lng === lng) {
      continue;
    }

    points.push({ lat, lng });
  }

  if (consumedLastIndex !== coordinates.length - 1) {
    const pair = readLngLatPair(coordinates[coordinates.length - 1]);
    if (pair) {
      const lng = pair[0];
      const lat = pair[1];
      const previous = points[points.length - 1];
      if (!previous || previous.lat !== lat || previous.lng !== lng) {
        points.push({ lat, lng });
      }
    }
  }

  if (points.length < 2) {
    return [];
  }

  if (points.length <= maxPointsPerPath) {
    return points;
  }

  const reduced: BoundaryPoint[] = [];
  const reduceStep = Math.max(1, Math.ceil(points.length / maxPointsPerPath));
  for (let index = 0; index < points.length; index += reduceStep) {
    reduced.push(points[index]);
  }

  const finalPoint = points[points.length - 1];
  const reducedLast = reduced[reduced.length - 1];
  if (!reducedLast || reducedLast.lat !== finalPoint.lat || reducedLast.lng !== finalPoint.lng) {
    reduced.push(finalPoint);
  }

  return reduced;
}

function samplePathVectors(points: BoundaryPoint[]): Array<[number, number, number]> {
  if (points.length === 0) {
    return [];
  }

  const sampleIndexes = new Set<number>();
  sampleIndexes.add(0);
  sampleIndexes.add(points.length - 1);
  sampleIndexes.add(Math.floor(points.length / 2));
  sampleIndexes.add(Math.floor((points.length - 1) * 0.33));
  sampleIndexes.add(Math.floor((points.length - 1) * 0.66));

  const sampled: Array<[number, number, number]> = [];
  for (const index of sampleIndexes) {
    const point = points[Math.max(0, Math.min(points.length - 1, index))];
    sampled.push(latLngToUnitVector(point.lat, point.lng));
  }

  return sampled;
}

function createBoundaryPath(points: BoundaryPoint[], tier: BoundaryTier): BoundaryPath {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  let latSum = 0;
  let lngSum = 0;
  let pathLengthDeg = 0;
  let previousPoint: BoundaryPoint | null = null;

  for (const point of points) {
    if (previousPoint) {
      pathLengthDeg += angularDistanceDeg(previousPoint.lat, previousPoint.lng, point.lat, point.lng);
    }

    previousPoint = point;
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
    latSum += point.lat;
    lngSum += point.lng;
  }

  const centerLat = latSum / points.length;
  const centerLng = lngSum / points.length;
  const lngSpanRaw = maxLng - minLng;
  const lngSpan = lngSpanRaw > 180 ? 360 - lngSpanRaw : lngSpanRaw;
  const latSpan = maxLat - minLat;
  const angularSpanDeg = Math.max(latSpan, lngSpan * Math.cos((centerLat * Math.PI) / 180));

  return {
    points,
    tier,
    centerLat,
    centerLng,
    centerVector: latLngToUnitVector(centerLat, centerLng),
    sampleVectors: samplePathVectors(points),
    angularSpanDeg,
    pathLengthDeg,
    complexity: Math.min(1, points.length / 220),
  };
}

function getDashPatternByPathLength(pathLengthDeg: number, dashControl: number, gapControl: number): {
  dash: number;
  gap: number;
} {
  const safeLength = Math.max(pathLengthDeg, 0.05);
  const desiredDashDeg = 0.08 + clamp(dashControl, 0.01, 0.99) * 3.2;
  const desiredGapDeg = 0.05 + clamp(gapControl, 0.01, 0.99) * 2.0;
  let dash = desiredDashDeg / safeLength;
  let gap = desiredGapDeg / safeLength;

  const total = dash + gap;
  if (total > 0.95) {
    const scale = 0.95 / total;
    dash *= scale;
    gap *= scale;
  }

  return {
    dash: clamp(dash, 0.002, 0.94),
    gap: clamp(gap, 0.001, 0.94),
  };
}

function dedupeBoundaryPaths(paths: BoundaryPath[], precision = 4): BoundaryPath[] {
  const quantize = (value: number) => Math.round(value * 10 ** precision);
  const seen = new Set<string>();
  const deduped: BoundaryPath[] = [];

  for (const path of paths) {
    if (!path.points.length) {
      continue;
    }

    const first = path.points[0];
    const mid = path.points[Math.floor(path.points.length / 2)];
    const last = path.points[path.points.length - 1];
    const forward = `${quantize(first.lat)}:${quantize(first.lng)}|${quantize(mid.lat)}:${quantize(mid.lng)}|${quantize(last.lat)}:${quantize(last.lng)}|${path.points.length}`;
    const backward = `${quantize(last.lat)}:${quantize(last.lng)}|${quantize(mid.lat)}:${quantize(mid.lng)}|${quantize(first.lat)}:${quantize(first.lng)}|${path.points.length}`;
    const key = `${path.tier}|${forward < backward ? forward : backward}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(path);
  }

  return deduped;
}

function filterFeaturesByMinZoom(features: GeoFeature[], maxMinZoom: number): GeoFeature[] {
  return features.filter((feature) => {
    const rawValue = feature.properties?.MIN_ZOOM;
    if (typeof rawValue !== "number") {
      return true;
    }

    return rawValue <= maxMinZoom;
  });
}

function isBorderDotPoint(data: GlobePointDatum): data is BorderDotPoint {
  return (data as BorderDotPoint).pointType === "admin2-dot";
}

// Stable accessor functions — hoisted to module scope so react-globe.gl
// never sees a new function reference and never re-processes unchanged data.
const pathPointsAccessor = (data: object) => (data as BoundaryPath).points;
const pathPointLatAccessor = (point: object) => (point as BoundaryPoint).lat;
const pathPointLngAccessor = (point: object) => (point as BoundaryPoint).lng;
const pathPointAltAccessor = (point: object) => (point as BoundaryPoint).alt ?? 0;
const pointLatAccessor = (data: object) => (data as GlobePointDatum).lat;
const pointLngAccessor = (data: object) => (data as GlobePointDatum).lng;
const htmlLatAccessor = (data: object) => (data as KeyLocation).lat;
const htmlLngAccessor = (data: object) => (data as KeyLocation).lng;

function buildAdmin2DotPoints(
  paths: BoundaryPath[],
  dotSize: number,
  dotGap: number,
  maxDots: number
): BorderDotPoint[] {
  if (!paths.length || maxDots <= 0) {
    return [];
  }

  const points: BorderDotPoint[] = [];
  const seen = new Set<string>();
  const baseStride = Math.max(2, Math.round(2 + dotGap * 20 + (1 - dotSize) * 9));
  const quantizeScale = Math.round(360 + dotGap * 620);

  const pushPoint = (lat: number, lng: number) => {
    const key = `${Math.round(lat * quantizeScale)}:${Math.round(lng * quantizeScale)}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    points.push({ lat, lng, pointType: "admin2-dot" });
  };

  for (const path of paths) {
    const stride = Math.max(2, Math.round(baseStride * (0.88 + path.complexity * 0.4)));
    for (let index = 0; index < path.points.length; index += stride) {
      const point = path.points[index];
      pushPoint(point.lat, point.lng);
      if (points.length >= maxDots) {
        return points;
      }
    }

    const last = path.points[path.points.length - 1];
    pushPoint(last.lat, last.lng);
    if (points.length >= maxDots) {
      return points;
    }
  }

  return points;
}

function addBoundaryPathFromCoordinatePath(
  path: unknown,
  tier: BoundaryTier,
  coordinateStride: number,
  maxPointsPerPath: number,
  minPointsPerPath: number,
  maxPaths: number,
  output: BoundaryPath[]
): void {
  if (output.length >= maxPaths) {
    return;
  }

  const points = buildBoundaryPointsFromCoordinatePath(path, coordinateStride, maxPointsPerPath);
  if (points.length < minPointsPerPath) {
    return;
  }

  output.push(createBoundaryPath(points, tier));
}

function geoJsonFeaturesToBoundaryPaths(
  features: GeoFeature[],
  tier: BoundaryTier,
  coordinateStride: number,
  maxPaths: number,
  maxPointsPerPath: number,
  minPointsPerPath = 2
): BoundaryPath[] {
  const paths: BoundaryPath[] = [];

  for (const feature of features) {
    if (paths.length >= maxPaths) {
      break;
    }

    const geometry = feature.geometry;
    const type = geometry?.type;
    const coordinates = geometry?.coordinates;

    if (!type || !coordinates) {
      continue;
    }

    if (type === "LineString") {
      addBoundaryPathFromCoordinatePath(
        coordinates,
        tier,
        coordinateStride,
        maxPointsPerPath,
        minPointsPerPath,
        maxPaths,
        paths
      );
      continue;
    }

    if (type === "MultiLineString") {
      if (Array.isArray(coordinates)) {
        for (const line of coordinates) {
          if (paths.length >= maxPaths) {
            break;
          }

          addBoundaryPathFromCoordinatePath(
            line,
            tier,
            coordinateStride,
            maxPointsPerPath,
            minPointsPerPath,
            maxPaths,
            paths
          );
        }
      }
      continue;
    }

    if (type === "Polygon") {
      if (Array.isArray(coordinates)) {
        for (const ring of coordinates) {
          if (paths.length >= maxPaths) {
            break;
          }

          addBoundaryPathFromCoordinatePath(
            ring,
            tier,
            coordinateStride,
            maxPointsPerPath,
            minPointsPerPath,
            maxPaths,
            paths
          );
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
          if (paths.length >= maxPaths) {
            break;
          }

          addBoundaryPathFromCoordinatePath(
            ring,
            tier,
            coordinateStride,
            maxPointsPerPath,
            minPointsPerPath,
            maxPaths,
            paths
          );
        }

        if (paths.length >= maxPaths) {
          break;
        }
      }
    }
  }

  return paths;
}

async function fetchGeoJsonFeatures(url: string, timeoutMs = 15000): Promise<GeoFeature[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { cache: "force-cache", signal: controller.signal });
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { features?: GeoFeature[] };
    return Array.isArray(payload.features) ? payload.features : [];
  } catch {
    return [];
  } finally {
    window.clearTimeout(timeout);
  }
}

function isPathCameraFacing(
  path: BoundaryPath,
  cameraForwardVector: [number, number, number],
  threshold = -0.09
): boolean {
  if (dotUnitVector(path.centerVector, cameraForwardVector) >= threshold) {
    return true;
  }

  for (const vector of path.sampleVectors) {
    if (dotUnitVector(vector, cameraForwardVector) >= threshold) {
      return true;
    }
  }

  return false;
}

function getBoundaryColor(paperEnabled: boolean, tier: BoundaryTier): string {
  if (paperEnabled) {
    if (tier === "country") return "rgba(105, 76, 47, 0.86)";
    if (tier === "coast") return "rgba(125, 95, 67, 0.82)";
    if (tier === "admin1") return "rgba(121, 89, 58, 0.8)";
    return "rgba(142, 107, 73, 0.66)";
  }

  if (tier === "country") return "rgba(0, 0, 0, 0.92)";
  if (tier === "coast") return "rgba(0, 0, 0, 0.9)";
  if (tier === "admin1") return "rgba(147, 207, 255, 0.88)";
  return "rgba(114, 187, 255, 0.72)";
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
    clamp(settings.crosshatchDensity, 0.05, 12) * (lowPower ? 0.82 : 1)
  );
  const crosshatchThreshold = clamp(settings.crosshatchThreshold, 0.05, 0.995);
  const thresholdA = shaderFloat(crosshatchThreshold);
  const thresholdB = shaderFloat(clamp(crosshatchThreshold + 0.03, 0.08, 0.997));
  const thresholdC = shaderFloat(clamp(crosshatchThreshold + 0.06, 0.1, 0.999));

  return `vec3 worldNormal = normalize(vWorldNormal);
float sunDot = dot(worldNormal, normalize(uSunDirection));

float dayMix = smoothstep(-0.1, 0.42, sunDot);
float nightMix = 1.0 - dayMix;
float nightBand = smoothstep(0.18, -0.36, sunDot);

vec3 dayColor = vec3(0.12, 0.56, 1.0);
vec3 twilightColor = vec3(0.91, 0.3, 0.55);
vec3 nightColor = vec3(0.015, 0.026, 0.07);

vec3 ink = mix(nightColor, dayColor, dayMix);
ink = mix(ink, twilightColor, smoothstep(-0.08, 0.08, sunDot) * 0.42);
vec3 lightingTint = mix(vec3(0.7, 0.74, 0.82), vec3(1.06, 1.03, 0.98), dayMix);
diffuseColor.rgb *= lightingTint;
diffuseColor.rgb = mix(diffuseColor.rgb, ink, 0.08);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.68, 0.72, 0.8), nightBand * 0.2);

float terminatorNoise = sin(vWorldPosition.x * 0.07 + vWorldPosition.y * 0.11 + vWorldPosition.z * 0.09) * 0.5 + 0.5;
float terminatorBand = (1.0 - smoothstep(0.0, 0.1, abs(sunDot))) * mix(0.9, 1.34, terminatorNoise);
vec3 terminatorColor = vec3(1.0, 0.57, 0.18);
diffuseColor.rgb += terminatorColor * terminatorBand * (0.9 + uDetailStrength * 0.6);

float lon = atan(worldNormal.z, worldNormal.x);
float lat = asin(clamp(worldNormal.y, -1.0, 1.0));
float lonLine = 1.0 - smoothstep(0.88, 0.99, abs(sin(lon * 11.0)));
float latLine = 1.0 - smoothstep(0.9, 0.995, abs(sin(lat * 10.0)));
float wireMask = max(lonLine, latLine) * uWireStrength * (0.45 + uDetailStrength * 0.8);
vec3 wireColor = mix(vec3(0.16, 0.84, 1.0), vec3(0.73, 0.92, 1.0), smoothstep(-0.2, 0.5, sunDot));
diffuseColor.rgb = mix(diffuseColor.rgb, wireColor, clamp(wireMask, 0.0, 1.0));

float hatchA = abs(sin((vWorldPosition.x + vWorldPosition.y) * (0.23 * ${crosshatchDensity})));
float hatchB = abs(sin((vWorldPosition.x - vWorldPosition.z) * (0.29 * ${crosshatchDensity})));
float hatchC = abs(sin((vWorldPosition.y + vWorldPosition.z) * (0.19 * ${crosshatchDensity})));
float hatchMask = clamp(step(${thresholdA}, hatchA) * 0.45 + step(${thresholdB}, hatchB) * 0.35 + step(${thresholdC}, hatchC) * 0.2, 0.0, 1.0);
float hatchAmount = (0.01 + nightMix * 0.3) * uHatchStrength * (0.14 + uDetailStrength * 0.34);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.3, hatchMask * hatchAmount);

float rim = pow(1.0 - max(dot(worldNormal, normalize(cameraPosition - vWorldPosition)), 0.0), 2.1);
diffuseColor.rgb += vec3(0.0, 0.7, 1.0) * rim * 0.2;
diffuseColor.rgb = max(diffuseColor.rgb, vec3(0.15, 0.16, 0.2));
diffuseColor.a = 1.0;

#include <dithering_fragment>`;
}

function buildPaperFragmentBody(settings: GlobeRuntimeSettings, lowPower: boolean): string {
  const grainStrength = shaderFloat(
    clamp(settings.paperGrainStrength, 0, 2.8) * (lowPower ? 0.7 : 1)
  );
  const halftoneStrength = shaderFloat(
    clamp(settings.paperHalftoneStrength, 0, 2.8) * (lowPower ? 0.7 : 1)
  );
  const inkStrength = shaderFloat(clamp(settings.paperInkStrength, 0, 2.8));
  const crosshatchDensity = shaderFloat(
    clamp(settings.crosshatchDensity, 0.05, 12) * (lowPower ? 0.82 : 1)
  );
  const crosshatchThreshold = shaderFloat(clamp(settings.crosshatchThreshold, 0.05, 0.995));

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
diffuseColor.a = 1.0;

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
  const [cameraPov, setCameraPov] = useState({ lat: 35, lng: -40, altitude: 2.5 });
  const [countryBoundaryPaths, setCountryBoundaryPaths] = useState<BoundaryPath[]>([]);
  const [coastBoundaryPaths, setCoastBoundaryPaths] = useState<BoundaryPath[]>([]);
  const [admin1BoundaryPaths, setAdmin1BoundaryPaths] = useState<BoundaryPath[]>([]);
  const [admin2BoundaryPaths, setAdmin2BoundaryPaths] = useState<BoundaryPath[]>([]);
  const lastPovEmitRef = useRef(0);
  const lastAltitudeRef = useRef(2.5);
  const lastAltitudeStateEmitRef = useRef(0);
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
    material.blending = NormalBlending;

    // Protect against three-globe's texture loader which runs
    // `globeMaterial.color = null` after async load, destroying our color.
    const safeColor = material.color.clone();
    Object.defineProperty(material, "color", {
      get: () => safeColor,
      set: (v: unknown) => {
        if (v != null && v instanceof Color) safeColor.copy(v);
      },
      configurable: true,
    });

    if (useStylizedShader) {
      const detailStrength = getDetailStrength(performanceProfile.lowPower);
      const wireStrength = clamp(settings.wireStrength, 0, 4);
      const hatchStrength = clamp(settings.hatchStrength, 0, 4);

      const uniforms: GlobeShaderUniforms = {
        uSunDirection: { value: SUN_DIRECTION },
        uHatchStrength: {
          value: detailStrength * hatchStrength * (performanceProfile.lowPower ? 0.95 : 1.35),
        },
        uDetailStrength: { value: detailStrength },
        uWireStrength: {
          value: (performanceProfile.lowPower ? 0.75 : 1.25) * wireStrength,
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
    }

    return material;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed to shader-affecting settings only; border/zoom/marker settings should not trigger shader recompile
  }, [
    paperEnabled,
    useStylizedShader,
    earthTexture,
    performanceProfile.lowPower,
    settings.wireStrength,
    settings.hatchStrength,
    settings.crosshatchDensity,
    settings.crosshatchThreshold,
    settings.enablePaperEffect,
    settings.paperGrainStrength,
    settings.paperHalftoneStrength,
    settings.paperInkStrength,
  ]);

  const isZoomedOut = altitude >= settings.zoomThreshold;
  const borderQualityBias = useMemo(() => clamp(settings.borderQualityBias, 0, 1), [settings.borderQualityBias]);
  const borderLodUpdateMs = useMemo(
    () => Math.round(clamp(settings.borderLodUpdateMs, 40, 1000)),
    [settings.borderLodUpdateMs]
  );
  const borderAdmin1MinScreenPx = useMemo(
    () => clamp(settings.borderAdmin1MinScreenPx, 0, 180),
    [settings.borderAdmin1MinScreenPx]
  );
  const borderAdmin2MinScreenPx = useMemo(
    () => clamp(settings.borderAdmin2MinScreenPx, 0, 220),
    [settings.borderAdmin2MinScreenPx]
  );
  const borderMaxFeaturesAdmin0 = useMemo(
    () => Math.round(clamp(settings.borderMaxFeaturesAdmin0, 0, 2000)),
    [settings.borderMaxFeaturesAdmin0]
  );
  const borderMaxFeaturesAdmin1 = useMemo(
    () => Math.round(clamp(settings.borderMaxFeaturesAdmin1, 80, 22000)),
    [settings.borderMaxFeaturesAdmin1]
  );
  const borderMaxFeaturesAdmin2 = useMemo(
    () => Math.round(clamp(settings.borderMaxFeaturesAdmin2, 80, 30000)),
    [settings.borderMaxFeaturesAdmin2]
  );
  const effectiveAltitude = useMemo(() => Math.max(0.25, Math.round(altitude * 8) / 8), [altitude]);
  const viewportMin = useMemo(
    () => Math.max(320, Math.min(dimensions.width || 0, dimensions.height || 0) || 840),
    [dimensions.height, dimensions.width]
  );
  const countryBoundaryRanked = useMemo(
    () => [...countryBoundaryPaths].sort((a, b) => b.angularSpanDeg - a.angularSpanDeg),
    [countryBoundaryPaths]
  );
  const coastBoundaryRanked = useMemo(
    () => [...coastBoundaryPaths].sort((a, b) => b.angularSpanDeg - a.angularSpanDeg),
    [coastBoundaryPaths]
  );
  const admin1BoundaryRanked = useMemo(
    () => [...admin1BoundaryPaths].sort((a, b) => b.angularSpanDeg - a.angularSpanDeg),
    [admin1BoundaryPaths]
  );
  const admin2BoundaryRanked = useMemo(
    () => [...admin2BoundaryPaths].sort((a, b) => b.angularSpanDeg - a.angularSpanDeg),
    [admin2BoundaryPaths]
  );
  const cameraForwardVector = useMemo(
    () => latLngToUnitVector(cameraPov.lat, cameraPov.lng),
    [cameraPov.lat, cameraPov.lng]
  );

  const prevPathLayersRef = useRef<BoundaryPath[]>([]);
  const prevAdmin2VisibleRef = useRef<BoundaryPath[]>([]);

  const { pathLayers, admin2VisiblePaths } = useMemo(() => {
    const qualityScale = settings.autoBorderLod ? 0.56 + borderQualityBias * 0.44 : 0.88 + borderQualityBias * 0.28;
    const powerScale = performanceProfile.lowPower ? 0.68 : 1;
    const capByBudget = (maxFeatures: number) => {
      if (maxFeatures <= 0) {
        return 0;
      }

      return Math.max(1, Math.round(maxFeatures * qualityScale * powerScale));
    };
    const admin1ThresholdPx = settings.autoBorderLod
      ? borderAdmin1MinScreenPx + clamp((effectiveAltitude - 0.9) * 2.6, 0, 8)
      : 0;
    const admin2ThresholdPx = settings.autoBorderLod
      ? borderAdmin2MinScreenPx + clamp((effectiveAltitude - 0.8) * 4.8, 0, 16)
      : 0;
    const hemisphereEnabled = settings.borderVisibleHemisphereOnly;

    const selectTier = (
      paths: BoundaryPath[],
      tier: BoundaryTier,
      maxFeatures: number,
      minScreenPx: number
    ): BoundaryPath[] => {
      if (!paths.length) {
        return [];
      }

      const threshold = tier === "country" ? 0 : tier === "coast" ? minScreenPx * 0.5 : minScreenPx;
      const maxForTier = capByBudget(maxFeatures);
      if (maxForTier <= 0) {
        return [];
      }
      const selected: BoundaryPath[] = [];

      for (const path of paths) {
        if (hemisphereEnabled && !isPathCameraFacing(path, cameraForwardVector)) {
          continue;
        }

        if (threshold > 0) {
          const projectedPx = estimateProjectedPixels(path.angularSpanDeg, effectiveAltitude, viewportMin);
          if (projectedPx < threshold) {
            break;
          }
        }

        selected.push(path);
        if (selected.length >= maxForTier) {
          break;
        }
      }

      return selected;
    };

    const selectedPathLayers: BoundaryPath[] = [];
    if (settings.showInternationalBorders) {
      selectedPathLayers.push(...selectTier(countryBoundaryRanked, "country", borderMaxFeaturesAdmin0, 0));
      selectedPathLayers.push(...selectTier(coastBoundaryRanked, "coast", borderMaxFeaturesAdmin0, admin1ThresholdPx));
    }

    if (settings.showAdmin1Divisions) {
      selectedPathLayers.push(
        ...selectTier(admin1BoundaryRanked, "admin1", borderMaxFeaturesAdmin1, admin1ThresholdPx)
      );
    }

    const selectedAdmin2Paths = settings.showAdmin2Divisions && !isZoomedOut
      ? selectTier(admin2BoundaryRanked, "admin2", borderMaxFeaturesAdmin2, admin2ThresholdPx)
      : [];

    const prevPaths = prevPathLayersRef.current;
    const prevAdmin2 = prevAdmin2VisibleRef.current;
    const pathsSame =
      prevPaths.length === selectedPathLayers.length &&
      selectedPathLayers.every((p, i) => p === prevPaths[i]);
    const admin2Same =
      prevAdmin2.length === selectedAdmin2Paths.length &&
      selectedAdmin2Paths.every((p, i) => p === prevAdmin2[i]);

    const stablePaths = pathsSame ? prevPaths : selectedPathLayers;
    const stableAdmin2 = admin2Same ? prevAdmin2 : selectedAdmin2Paths;
    prevPathLayersRef.current = stablePaths;
    prevAdmin2VisibleRef.current = stableAdmin2;

    return {
      pathLayers: stablePaths,
      admin2VisiblePaths: stableAdmin2,
    };
  }, [
    admin1BoundaryRanked,
    admin2BoundaryRanked,
    borderAdmin1MinScreenPx,
    borderAdmin2MinScreenPx,
    borderMaxFeaturesAdmin0,
    borderMaxFeaturesAdmin1,
    borderMaxFeaturesAdmin2,
    borderQualityBias,
    cameraForwardVector,
    coastBoundaryRanked,
    countryBoundaryRanked,
    effectiveAltitude,
    performanceProfile.lowPower,
    settings.autoBorderLod,
    settings.borderVisibleHemisphereOnly,
    settings.showAdmin1Divisions,
    settings.showAdmin2Divisions,
    settings.showInternationalBorders,
    isZoomedOut,
    viewportMin,
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
    return clamp(settings.atmosphereAltitude || fallback, 0, 0.6);
  }, [paperEnabled, performanceProfile.lowPower, settings.atmosphereAltitude]);

  const pointRadius = useMemo(() => clamp(settings.pointRadius, 0.02, 4), [settings.pointRadius]);
  const pointAltitude = useMemo(() => clamp(settings.pointAltitude, 0, 0.3), [settings.pointAltitude]);
  const markerScale = useMemo(() => clamp(settings.markerScale, 0.1, 5), [settings.markerScale]);
  const internationalBorderAlpha = useMemo(
    () => clamp(settings.internationalBorderAlpha, 0, 1),
    [settings.internationalBorderAlpha]
  );
  const internationalStrokeWidth = settings.internationalBorderThickness;
  const admin1Alpha = useMemo(() => clamp(settings.admin1Alpha, 0, 1), [settings.admin1Alpha]);
  const admin1StrokeWidth = settings.admin1Thickness;
  const admin1DashLength = useMemo(
    () => clamp(settings.admin1DashLength, 0.01, 0.99),
    [settings.admin1DashLength]
  );
  const admin1DashGap = useMemo(() => clamp(settings.admin1DashGap, 0.01, 0.99), [settings.admin1DashGap]);
  const admin2Thickness = useMemo(
    () => clamp(settings.admin2Thickness, 0.05, 25),
    [settings.admin2Thickness]
  );
  const admin2Alpha = useMemo(() => clamp(settings.admin2Alpha, 0, 1), [settings.admin2Alpha]);
  const admin2DotSize = useMemo(() => clamp(settings.admin2DotSize, 0.01, 0.99), [settings.admin2DotSize]);
  const admin2DotGap = useMemo(() => clamp(settings.admin2DotGap, 0.01, 0.99), [settings.admin2DotGap]);
  const admin2DotBudget = useMemo(() => {
    const zoomFactor = clamp((1.9 - effectiveAltitude) / 1.4, 0, 1);
    const baseBudget = performanceProfile.lowPower ? 900 : 1800;
    const zoomBudget = performanceProfile.lowPower ? 2600 : 6200;
    const lodMultiplier = settings.autoBorderLod ? 1 : 1.45;
    return Math.round((baseBudget + zoomBudget * zoomFactor) * lodMultiplier);
  }, [effectiveAltitude, performanceProfile.lowPower, settings.autoBorderLod]);

  const admin2DotPoints = useMemo(
    () => {
      if (admin2Alpha <= 0.001 || isZoomedOut) {
        return [];
      }

      return buildAdmin2DotPoints(admin2VisiblePaths, admin2DotSize, admin2DotGap, admin2DotBudget);
    },
    [admin2Alpha, admin2DotBudget, admin2DotGap, admin2DotSize, admin2VisiblePaths, isZoomedOut]
  );

  const globePoints = useMemo<GlobePointDatum[]>(
    () => (isZoomedOut ? [] : [...events, ...admin2DotPoints]),
    [admin2DotPoints, events, isZoomedOut]
  );

  useEffect(() => {
    let cancelled = false;

    const loadAdministrativeBoundaries = async () => {
      const [countryFeatures, coastFeatures, admin1Features, admin2Features] = await Promise.all([
        fetchGeoJsonFeatures(COUNTRIES_GEOJSON_URL, 15000),
        fetchGeoJsonFeatures(COASTLINE_GEOJSON_URL, 15000),
        fetchGeoJsonFeatures(ADMIN1_LINES_GEOJSON_URL, 22000),
        fetchGeoJsonFeatures(ADMIN2_COUNTIES_GEOJSON_URL, 22000),
      ]);

      if (cancelled) {
        return;
      }

      const admin1FeaturesFiltered = filterFeaturesByMinZoom(admin1Features, 10);

      const countryPaths = dedupeBoundaryPaths(
        geoJsonFeaturesToBoundaryPaths(countryFeatures, "country", 1, 14000, 4000),
        4
      );
      const coastPaths = dedupeBoundaryPaths(
        geoJsonFeaturesToBoundaryPaths(coastFeatures, "coast", 2, 14000, 3000),
        4
      );
      const admin1Paths = dedupeBoundaryPaths(
        geoJsonFeaturesToBoundaryPaths(admin1FeaturesFiltered, "admin1", 1, 36000, 96, 3),
        4
      );
      const admin2PathsRaw = dedupeBoundaryPaths(
        geoJsonFeaturesToBoundaryPaths(admin2Features, "admin2", 3, 12000, 72, 3),
        4
      );
      const admin2Proxy = admin1Paths
        .filter((_, index) => index % 5 === 0)
        .map((path) => ({ ...path, tier: "admin2" as const }));
      const mergedAdmin2 = dedupeBoundaryPaths([...admin2PathsRaw, ...admin2Proxy], 4);

      setCountryBoundaryPaths(countryPaths);
      setCoastBoundaryPaths(coastPaths);
      setAdmin1BoundaryPaths(admin1Paths);
      setAdmin2BoundaryPaths(mergedAdmin2);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lights() is on the underlying three-globe instance, not typed in GlobeMethods
    (globe as any).lights([ambientLight, sunLight, nightFill]);

    globe.pointOfView({ lat: 35, lng: -40, altitude: 2.5 }, 0);

    const renderer = globe.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, performanceProfile.maxPixelRatio));

    const controls = globe.controls();

    const handleControlsChange = () => {
      const pov = globe.pointOfView();
      const now = performance.now();
      const altitudeDelta = Math.abs(lastAltitudeRef.current - pov.altitude);

      if (altitudeDelta >= 0.0008) {
        lastAltitudeRef.current = pov.altitude;
        if (now - lastAltitudeStateEmitRef.current >= 40 || altitudeDelta > 0.04) {
          lastAltitudeStateEmitRef.current = now;
          setAltitude(pov.altitude);
        }
      }

      if (now - lastPovEmitRef.current >= borderLodUpdateMs) {
        lastPovEmitRef.current = now;

        if (settings.borderVisibleHemisphereOnly) {
          setCameraPov((previous) => {
            const latDelta = Math.abs(previous.lat - pov.lat);
            const lngDelta = Math.abs(previous.lng - pov.lng);
            const altitudeDeltaForPov = Math.abs(previous.altitude - pov.altitude);
            if (latDelta < 0.9 && lngDelta < 0.9 && altitudeDeltaForPov < 0.06) {
              return previous;
            }

            return { lat: pov.lat, lng: pov.lng, altitude: pov.altitude };
          });
        }

        onAltitudeChangeRef.current?.(pov.altitude);
      }
    };

    lastPovEmitRef.current = performance.now() - borderLodUpdateMs;
    handleControlsChange();
    controls.addEventListener("change", handleControlsChange);

    return () => {
      controls.removeEventListener("change", handleControlsChange);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lights() is on the underlying three-globe instance, not typed in GlobeMethods
      (globe as any).lights([]);
    };
  }, [
    borderLodUpdateMs,
    performanceProfile.maxPixelRatio,
    settings.borderVisibleHemisphereOnly,
    useStylizedShader,
  ]);

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

  useEffect(() => {
    if (!settings.borderVisibleHemisphereOnly) {
      return;
    }

    const pov = globeRef.current?.pointOfView();
    if (!pov) {
      return;
    }

    setCameraPov({ lat: pov.lat, lng: pov.lng, altitude: pov.altitude });
  }, [settings.borderVisibleHemisphereOnly]);

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

  const pathColorAccessor = useCallback(
    (data: object) =>
      scaleRgbaAlpha(
        getBoundaryColor(paperEnabled, (data as BoundaryPath).tier),
        (data as BoundaryPath).tier === "country"
          ? internationalBorderAlpha
          : (data as BoundaryPath).tier === "coast"
            ? internationalBorderAlpha
            : (data as BoundaryPath).tier === "admin1"
              ? admin1Alpha
              : admin2Alpha
      ),
    [paperEnabled, internationalBorderAlpha, admin1Alpha, admin2Alpha]
  );

  const pathStrokeAccessor = useCallback(
    (data: object) => {
      const tier = (data as BoundaryPath).tier;
      if (tier === "country" || tier === "coast") return internationalStrokeWidth;
      if (tier === "admin1") return admin1StrokeWidth;
      return 0;
    },
    [internationalStrokeWidth, admin1StrokeWidth]
  );

  const pathDashLengthAccessor = useCallback(
    (data: object) => {
      const tier = (data as BoundaryPath).tier;
      if (tier === "country" || tier === "coast") return 1;
      if (tier === "admin1") {
        return getDashPatternByPathLength(
          (data as BoundaryPath).pathLengthDeg,
          admin1DashLength,
          admin1DashGap
        ).dash;
      }
      return 1;
    },
    [admin1DashLength, admin1DashGap]
  );

  const pathDashGapAccessor = useCallback(
    (data: object) => {
      const tier = (data as BoundaryPath).tier;
      if (tier === "country" || tier === "coast") return 0;
      if (tier === "admin1") {
        return getDashPatternByPathLength(
          (data as BoundaryPath).pathLengthDeg,
          admin1DashLength,
          admin1DashGap
        ).gap;
      }
      return 0;
    },
    [admin1DashLength, admin1DashGap]
  );

  const htmlElementAccessor = useCallback(
    (data: object) => {
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
    },
    [markerHtml]
  );

  const pointColorAccessor = useCallback(
    (data: object) =>
      isBorderDotPoint(data as GlobePointDatum)
        ? scaleRgbaAlpha(getBoundaryColor(paperEnabled, "admin2"), admin2Alpha)
        : getPointColor(paperEnabled),
    [paperEnabled, admin2Alpha]
  );

  const pointRadiusAccessor = useCallback(
    (data: object) =>
      isBorderDotPoint(data as GlobePointDatum)
        ? clamp(0.004 + admin2Thickness * 0.016, 0.004, 0.52)
        : pointRadius,
    [admin2Thickness, pointRadius]
  );

  const pointAltitudeAccessor = useCallback(
    (data: object) =>
      isBorderDotPoint(data as GlobePointDatum) ? 0.0008 : pointAltitude,
    [pointAltitude]
  );

  const onPointClickHandler = useCallback(
    (point: object) => {
      const datum = point as GlobePointDatum;
      if (isBorderDotPoint(datum)) return;
      onEventClick(datum as LexerEvent);
    },
    [onEventClick]
  );

  const htmlData = useMemo(
    () => (isZoomedOut ? KEY_LOCATIONS : []),
    [isZoomedOut]
  );

  return (
    <ReactGlobe
      ref={globeRef}
      width={dimensions.width}
      height={dimensions.height}
      backgroundColor="rgba(0,0,0,0)"
      backgroundImageUrl={null}
      globeImageUrl={EARTH_TEXTURE_URL}
      globeMaterial={globeMaterial ?? undefined}
      showGraticules={!paperEnabled}
      showAtmosphere={settings.showAtmosphere}
      atmosphereColor={atmosphereColor}
      atmosphereAltitude={atmosphereAltitude}
      globeCurvatureResolution={performanceProfile.globeCurvatureResolution}
      pathsData={pathLayers}
      pathPoints={pathPointsAccessor}
      pathPointLat={pathPointLatAccessor}
      pathPointLng={pathPointLngAccessor}
      pathPointAlt={pathPointAltAccessor}
      pathResolution={2}
      pathColor={pathColorAccessor}
      pathStroke={pathStrokeAccessor}
      pathDashLength={pathDashLengthAccessor}
      pathDashGap={pathDashGapAccessor}
      pathDashAnimateTime={0}
      pathTransitionDuration={0}
      htmlElementsData={htmlData}
      htmlLat={htmlLatAccessor}
      htmlLng={htmlLngAccessor}
      htmlElement={htmlElementAccessor}
      htmlAltitude={0}
      htmlTransitionDuration={0}
      pointsData={globePoints}
      pointLat={pointLatAccessor}
      pointLng={pointLngAccessor}
      pointColor={pointColorAccessor}
      pointRadius={pointRadiusAccessor}
      pointAltitude={pointAltitudeAccessor}
      pointResolution={performanceProfile.pointResolution}
      pointsTransitionDuration={0}
      onPointClick={onPointClickHandler}
    />
  );
}
