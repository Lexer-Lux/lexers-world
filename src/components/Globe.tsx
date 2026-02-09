"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactGlobe, { GlobeMethods } from "react-globe.gl";
import { KEY_LOCATIONS, MOCK_EVENTS } from "@/lib/data";
import { KeyLocation, LexerEvent } from "@/lib/types";

// Zoom threshold: above this altitude = zoomed out (show stars)
const ZOOM_THRESHOLD = 1.8;

interface GlobeProps {
  onLocationClick: (locationName: string) => void;
  onEventClick: (event: LexerEvent) => void;
}

export default function Globe({ onLocationClick, onEventClick }: GlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [altitude, setAltitude] = useState(2.5);

  const isZoomedOut = altitude >= ZOOM_THRESHOLD;

  // Track window size
  useEffect(() => {
    const update = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Style the globe on mount
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Dark atmosphere
    const scene = globe.scene();
    scene.background = null;

    // Set initial point of view (looking at North America)
    globe.pointOfView({ lat: 35, lng: -40, altitude: 2.5 }, 0);

    // Auto-rotate
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableDamping = true;

    // Track zoom level
    controls.addEventListener("change", () => {
      const pov = globe.pointOfView();
      setAltitude(pov.altitude);
    });
  }, []);

  // Stable refs for callbacks so htmlElement doesn't recreate on every render
  const onLocationClickRef = useRef(onLocationClick);
  onLocationClickRef.current = onLocationClick;

  // Star SVG as HTML for markers
  const markerHtml = useCallback(
    (d: object) => {
      const loc = d as KeyLocation;
      if (!isZoomedOut) return "";
      return `
      <div style="text-align:center;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ff1744" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z"
            stroke="#ff6e80" stroke-width="0.5"/>
        </svg>
        <div style="
          color: #ff1744;
          font-size: 11px;
          font-weight: 700;
          text-shadow: 0 0 6px rgba(255,23,68,0.8), 0 0 12px rgba(255,23,68,0.4);
          white-space: nowrap;
          letter-spacing: 0.5px;
          font-family: monospace;
        ">${loc.name}</div>
      </div>
    `;
    },
    [isZoomedOut]
  );

  return (
    <ReactGlobe
      ref={globeRef}
      width={dimensions.width}
      height={dimensions.height}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      atmosphereColor="#b026ff"
      atmosphereAltitude={0.2}
      // Key location markers (HTML layer)
      htmlElementsData={KEY_LOCATIONS}
      htmlLat={(d) => (d as KeyLocation).lat}
      htmlLng={(d) => (d as KeyLocation).lng}
      htmlElement={(d) => {
        const loc = d as KeyLocation;
        const el = document.createElement("div");
        el.innerHTML = markerHtml(d);
        el.style.pointerEvents = "auto";
        el.style.cursor = "pointer";
        el.onclick = (e) => {
          e.stopPropagation();
          onLocationClickRef.current(loc.name);
        };
        return el;
      }}
      htmlAltitude={0}
      htmlTransitionDuration={0}
      // Event dots (points layer) — visible only when zoomed in
      pointsData={isZoomedOut ? [] : MOCK_EVENTS}
      pointLat={(d) => (d as LexerEvent).lat}
      pointLng={(d) => (d as LexerEvent).lng}
      pointColor={() => "#ff2d75"}
      pointRadius={0.4}
      pointAltitude={0.01}
      onPointClick={(point) => onEventClick(point as unknown as LexerEvent)}
    />
  );
}
