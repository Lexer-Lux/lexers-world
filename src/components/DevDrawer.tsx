"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AestheticRuntimeSettings,
  DEFAULT_AESTHETIC_RUNTIME_SETTINGS,
} from "@/lib/aesthetic-settings";
import {
  DEFAULT_GLOBE_RUNTIME_SETTINGS,
  GlobeRuntimeSettings,
} from "@/lib/globe-settings";

interface DevDrawerProps {
  globeSettings: GlobeRuntimeSettings;
  onGlobeChange: (settings: GlobeRuntimeSettings) => void;
  aestheticSettings: AestheticRuntimeSettings;
  onAestheticChange: (settings: AestheticRuntimeSettings) => void;
}

function decimalPlaces(step: number): number {
  if (!Number.isFinite(step) || step >= 1) {
    return 0;
  }

  const [, decimals = ""] = step.toString().split(".");
  return Math.min(4, decimals.length);
}

function NumberControl({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const precision = decimalPlaces(step);

  return (
    <label htmlFor={id} className="grid gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--copy-secondary)" }}>
        {label}
      </span>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full cursor-pointer accent-cyan-300"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value.toFixed(precision)}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (!Number.isFinite(nextValue)) {
              return;
            }

            onChange(Math.min(max, Math.max(min, nextValue)));
          }}
          className="w-[68px] rounded border bg-black/30 px-1.5 py-1 text-right font-mono text-[10px]"
          style={{
            color: "var(--copy-primary)",
            borderColor: "rgba(130, 166, 255, 0.38)",
          }}
        />
      </div>
    </label>
  );
}

function ColorControl({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--copy-secondary)" }}>
        {label}
      </span>
      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-10 cursor-pointer rounded border bg-transparent p-0"
          style={{ borderColor: "rgba(130, 166, 255, 0.38)" }}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded border bg-black/30 px-1.5 py-1 font-mono text-[10px] uppercase"
          style={{
            color: "var(--copy-primary)",
            borderColor: "rgba(130, 166, 255, 0.38)",
          }}
        />
      </div>
    </label>
  );
}

function ToggleControl({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--copy-secondary)" }}>
        {label}
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-cyan-300"
      />
    </label>
  );
}

function SectionCard({
  title,
  active,
  children,
}: {
  title: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="grid gap-1 rounded-md border px-2 py-1.5"
      style={{
        borderColor: active ? "rgba(0, 240, 255, 0.35)" : "rgba(142, 154, 205, 0.2)",
        background: active ? "rgba(0, 240, 255, 0.05)" : "rgba(10, 15, 31, 0.28)",
      }}
    >
      <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: active ? "var(--neon-cyan)" : "var(--copy-secondary)" }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function ResetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="cursor-pointer rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em]"
      style={{
        color: "var(--neon-pink)",
        borderColor: "var(--border-pink)",
        background: "rgba(255, 45, 117, 0.08)",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function DevDrawer({
  globeSettings,
  onGlobeChange,
  aestheticSettings,
  onAestheticChange,
}: DevDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTabHint, setShowTabHint] = useState(true);

  useEffect(() => {
    const mobileMedia = window.matchMedia("(max-width: 767px)");
    const pointerFineMedia = window.matchMedia("(pointer:fine)");

    const updateDeviceHints = () => {
      setIsMobile(mobileMedia.matches);
      const touchOnly = (navigator.maxTouchPoints ?? 0) > 0 && !pointerFineMedia.matches;
      setShowTabHint(!touchOnly);
    };

    updateDeviceHints();

    mobileMedia.addEventListener("change", updateDeviceHints);
    pointerFineMedia.addEventListener("change", updateDeviceHints);

    return () => {
      mobileMedia.removeEventListener("change", updateDeviceHints);
      pointerFineMedia.removeEventListener("change", updateDeviceHints);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const targetTag = target?.tagName;
      const editingTarget =
        target?.isContentEditable ||
        targetTag === "INPUT" ||
        targetTag === "TEXTAREA" ||
        targetTag === "SELECT";

      if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (editingTarget) {
        return;
      }

      event.preventDefault();
      setOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    if (open) {
      return;
    }

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.changedTouches.length !== 1) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (Math.abs(deltaY) > 48) {
        return;
      }

      const nearLeftEdge = startX <= 28;

      if (!open && nearLeftEdge && deltaX > 56) {
        setOpen(true);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [open]);

  const wrapperClassName = useMemo(
    () => {
      if (isMobile) {
        return `fixed inset-x-0 bottom-0 z-50 h-[50vh] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`;
      }

      return `fixed left-0 top-0 z-50 h-screen w-[min(92vw,420px)] transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`;
    },
    [isMobile, open]
  );

  const openerButtonClassName = isMobile
    ? "fixed bottom-4 left-3 z-[52] rounded-md border px-2 py-1"
    : "fixed left-0 top-1/2 z-[52] -translate-y-1/2 rounded-r-md border px-2 py-1";

  return (
    <>
      {!open && (
        <button
          type="button"
          className={`${openerButtonClassName} cursor-pointer`}
          style={{
            color: "var(--neon-cyan)",
            borderColor: "var(--border-cyan)",
            background: "rgba(8, 14, 30, 0.72)",
            boxShadow: "0 0 10px rgba(0, 240, 255, 0.24)",
          }}
          onClick={() => setOpen(true)}
          aria-label="Open dev drawer"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">DEV</span>
        </button>
      )}

      <aside className={wrapperClassName}>
        <div
          className="panel-shell benday-overlay relative h-full overflow-hidden border"
          style={{
            borderColor: "var(--border-cyan)",
            borderRadius: isMobile ? "16px 16px 0 0" : "0 12px 12px 0",
            background: "rgba(8, 11, 24, 0.72)",
            backdropFilter: "blur(10px)",
          }}
        >
          <button
            type="button"
            className="absolute right-[-30px] top-1/2 z-[51] hidden h-14 w-8 -translate-y-1/2 rounded-r-md border md:block"
            style={{
              color: "var(--neon-cyan)",
              borderColor: "var(--border-cyan)",
              background: "rgba(8, 14, 30, 0.74)",
              boxShadow: "0 0 10px rgba(0, 240, 255, 0.2)",
            }}
            onClick={() => setOpen(false)}
            aria-label="Close dev drawer"
          >
            <span className="font-mono text-xs">›</span>
          </button>

          <button
            type="button"
            className="absolute right-3 top-2 z-[51] rounded border px-2 py-1 md:hidden"
            style={{
              color: "var(--neon-cyan)",
              borderColor: "var(--border-cyan)",
              background: "rgba(8, 14, 30, 0.7)",
            }}
            onClick={() => setOpen(false)}
            aria-label="Close dev drawer"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">Close</span>
          </button>

          <div className="border-b px-3 py-2" style={{ borderColor: "rgba(0, 240, 255, 0.18)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan">Dev Drawer</span>
              <span className="font-mono text-[10px]" style={{ color: "var(--copy-muted)" }}>
                {showTabHint ? "TAB" : ""}
              </span>
            </div>
          </div>

          <div className="grid h-[calc(100%-42px)] gap-2 overflow-y-auto px-2 py-2">
            <SectionCard title="Globe Core" active>
            <ToggleControl
              id="dev-auto-rotate"
              label="Auto rotate"
              checked={globeSettings.autoRotate}
              onChange={(value) => onGlobeChange({ ...globeSettings, autoRotate: value })}
            />

            <NumberControl
              id="dev-auto-rotate-speed"
              label="Idle spin speed"
              min={0}
              max={1.2}
              step={0.01}
              value={globeSettings.autoRotateSpeed}
              onChange={(value) => onGlobeChange({ ...globeSettings, autoRotateSpeed: value })}
            />

            <NumberControl
              id="dev-drag-rotate-speed"
              label="Drag rotate speed"
              min={0.2}
              max={2.4}
              step={0.05}
              value={globeSettings.dragRotateSpeed}
              onChange={(value) => onGlobeChange({ ...globeSettings, dragRotateSpeed: value })}
            />

            <ToggleControl
              id="dev-use-inertia"
              label="Drag inertia"
              checked={globeSettings.useInertia}
              onChange={(value) => onGlobeChange({ ...globeSettings, useInertia: value })}
            />

            <NumberControl
              id="dev-inertia-damping"
              label="Inertia damping"
              min={0.02}
              max={0.35}
              step={0.01}
              value={globeSettings.inertiaDamping}
              onChange={(value) => onGlobeChange({ ...globeSettings, inertiaDamping: value })}
            />

            <NumberControl
              id="dev-zoom-threshold"
              label="Zoom threshold"
              min={1.2}
              max={2.8}
              step={0.05}
              value={globeSettings.zoomThreshold}
              onChange={(value) => onGlobeChange({ ...globeSettings, zoomThreshold: value })}
            />

            <NumberControl
              id="dev-wire-strength"
              label="Wire strength"
              min={0}
              max={1.6}
              step={0.05}
              value={globeSettings.wireStrength}
              onChange={(value) => onGlobeChange({ ...globeSettings, wireStrength: value })}
            />

            <NumberControl
              id="dev-hatch-strength"
              label="Hatch strength"
              min={0}
              max={1.6}
              step={0.05}
              value={globeSettings.hatchStrength}
              onChange={(value) => onGlobeChange({ ...globeSettings, hatchStrength: value })}
            />

            <NumberControl
              id="dev-crosshatch-density"
              label="Crosshatch density"
              min={0.4}
              max={2.2}
              step={0.05}
              value={globeSettings.crosshatchDensity}
              onChange={(value) => onGlobeChange({ ...globeSettings, crosshatchDensity: value })}
            />

            <NumberControl
              id="dev-crosshatch-threshold"
              label="Crosshatch threshold"
              min={0.82}
              max={0.98}
              step={0.005}
              value={globeSettings.crosshatchThreshold}
              onChange={(value) => onGlobeChange({ ...globeSettings, crosshatchThreshold: value })}
            />

            <ToggleControl
              id="dev-boundary-tiers"
              label="Boundary tiers"
              checked={globeSettings.showBoundaryTiers}
              onChange={(value) => onGlobeChange({ ...globeSettings, showBoundaryTiers: value })}
            />

            <NumberControl
              id="dev-boundary-opacity"
              label="Boundary opacity"
              min={0}
              max={1.6}
              step={0.05}
              value={globeSettings.boundaryOpacity}
              onChange={(value) => onGlobeChange({ ...globeSettings, boundaryOpacity: value })}
            />

            <ToggleControl
              id="dev-curved-title"
              label="Curved title"
              checked={globeSettings.showCurvedTitle}
              onChange={(value) => onGlobeChange({ ...globeSettings, showCurvedTitle: value })}
            />
          </SectionCard>

          <SectionCard title="Atmosphere + Markers" active>
            <ToggleControl
              id="dev-show-atmosphere"
              label="Atmosphere"
              checked={globeSettings.showAtmosphere}
              onChange={(value) => onGlobeChange({ ...globeSettings, showAtmosphere: value })}
            />

            <ColorControl
              id="dev-atmosphere-color"
              label="Atmosphere color"
              value={globeSettings.atmosphereColor}
              onChange={(value) => onGlobeChange({ ...globeSettings, atmosphereColor: value })}
            />

            <NumberControl
              id="dev-atmosphere-altitude"
              label="Atmosphere altitude"
              min={0.03}
              max={0.28}
              step={0.01}
              value={globeSettings.atmosphereAltitude}
              onChange={(value) => onGlobeChange({ ...globeSettings, atmosphereAltitude: value })}
            />

            <NumberControl
              id="dev-marker-scale"
              label="Marker scale"
              min={0.6}
              max={2}
              step={0.05}
              value={globeSettings.markerScale}
              onChange={(value) => onGlobeChange({ ...globeSettings, markerScale: value })}
            />

            <NumberControl
              id="dev-point-radius"
              label="Event dot size"
              min={0.12}
              max={1.2}
              step={0.02}
              value={globeSettings.pointRadius}
              onChange={(value) => onGlobeChange({ ...globeSettings, pointRadius: value })}
            />

            <NumberControl
              id="dev-point-altitude"
              label="Event dot lift"
              min={0}
              max={0.05}
              step={0.002}
              value={globeSettings.pointAltitude}
              onChange={(value) => onGlobeChange({ ...globeSettings, pointAltitude: value })}
            />
          </SectionCard>

          <SectionCard title="WarGames Values" active={globeSettings.enableWarGamesEffect}>
            <ToggleControl
              id="dev-war-enable"
              label="Enable WarGames"
              checked={globeSettings.enableWarGamesEffect}
              onChange={(value) => onGlobeChange({ ...globeSettings, enableWarGamesEffect: value })}
            />

            <NumberControl
              id="dev-war-density"
              label="Line density"
              min={6}
              max={24}
              step={0.5}
              value={globeSettings.warGamesLineDensity}
              onChange={(value) => onGlobeChange({ ...globeSettings, warGamesLineDensity: value })}
            />

            <NumberControl
              id="dev-war-glow"
              label="Glow strength"
              min={0}
              max={2}
              step={0.05}
              value={globeSettings.warGamesGlowStrength}
              onChange={(value) => onGlobeChange({ ...globeSettings, warGamesGlowStrength: value })}
            />

            <NumberControl
              id="dev-war-sweep"
              label="Sweep strength"
              min={0}
              max={2}
              step={0.05}
              value={globeSettings.warGamesSweepStrength}
              onChange={(value) => onGlobeChange({ ...globeSettings, warGamesSweepStrength: value })}
            />
          </SectionCard>

          <SectionCard title="Paper Values" active={globeSettings.enablePaperEffect}>
            <ToggleControl
              id="dev-paper-enable"
              label="Enable Paper"
              checked={globeSettings.enablePaperEffect}
              onChange={(value) => onGlobeChange({ ...globeSettings, enablePaperEffect: value })}
            />

            <NumberControl
              id="dev-paper-grain"
              label="Grain"
              min={0}
              max={1.6}
              step={0.05}
              value={globeSettings.paperGrainStrength}
              onChange={(value) => onGlobeChange({ ...globeSettings, paperGrainStrength: value })}
            />

            <NumberControl
              id="dev-paper-halftone"
              label="Halftone"
              min={0}
              max={1.6}
              step={0.05}
              value={globeSettings.paperHalftoneStrength}
              onChange={(value) => onGlobeChange({ ...globeSettings, paperHalftoneStrength: value })}
            />

            <NumberControl
              id="dev-paper-ink"
              label="Ink weight"
              min={0}
              max={1.6}
              step={0.05}
              value={globeSettings.paperInkStrength}
              onChange={(value) => onGlobeChange({ ...globeSettings, paperInkStrength: value })}
            />
          </SectionCard>

          <SectionCard title="Phase 5B Atmosphere" active>
            <ToggleControl
              id="dev-nebula-enabled"
              label="Nebula layer"
              checked={aestheticSettings.showNebula}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, showNebula: value })}
            />

            <NumberControl
              id="dev-nebula-opacity"
              label="Nebula opacity"
              min={0}
              max={1}
              step={0.02}
              value={aestheticSettings.nebulaOpacity}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, nebulaOpacity: value })}
            />

            <NumberControl
              id="dev-nebula-blur"
              label="Nebula blur"
              min={0}
              max={80}
              step={1}
              value={aestheticSettings.nebulaBlurPx}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, nebulaBlurPx: value })}
            />

            <NumberControl
              id="dev-nebula-drift"
              label="Nebula drift sec"
              min={4}
              max={40}
              step={0.5}
              value={aestheticSettings.nebulaDriftSeconds}
              onChange={(value) =>
                onAestheticChange({ ...aestheticSettings, nebulaDriftSeconds: value })
              }
            />

            <ToggleControl
              id="dev-grid-overlay"
              label="Grid overlay"
              checked={aestheticSettings.showGridOverlay}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, showGridOverlay: value })}
            />

            <NumberControl
              id="dev-grid-opacity"
              label="Grid opacity"
              min={0}
              max={0.7}
              step={0.01}
              value={aestheticSettings.gridOpacity}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, gridOpacity: value })}
            />

            <NumberControl
              id="dev-grid-angle"
              label="Grid angle"
              min={80}
              max={140}
              step={1}
              value={aestheticSettings.gridAngleDeg}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, gridAngleDeg: value })}
            />

            <NumberControl
              id="dev-grid-spacing"
              label="Grid spacing"
              min={4}
              max={24}
              step={1}
              value={aestheticSettings.gridSpacingPx}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, gridSpacingPx: value })}
            />

            <NumberControl
              id="dev-grid-drift"
              label="Grid drift sec"
              min={6}
              max={50}
              step={0.5}
              value={aestheticSettings.gridDriftSeconds}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, gridDriftSeconds: value })}
            />

            <ToggleControl
              id="dev-horizon-fade"
              label="Horizon fade"
              checked={aestheticSettings.showHorizonFade}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, showHorizonFade: value })}
            />

            <NumberControl
              id="dev-horizon-opacity"
              label="Horizon opacity"
              min={0}
              max={1}
              step={0.02}
              value={aestheticSettings.horizonOpacity}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, horizonOpacity: value })}
            />
          </SectionCard>

          <SectionCard title="Comic + Censor" active>
            <ToggleControl
              id="dev-motion-lines"
              label="Motion lines"
              checked={aestheticSettings.showMotionLines}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, showMotionLines: value })}
            />

            <NumberControl
              id="dev-motion-opacity"
              label="Motion opacity"
              min={0}
              max={0.2}
              step={0.01}
              value={aestheticSettings.motionLinesOpacity}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, motionLinesOpacity: value })}
            />

            <NumberControl
              id="dev-motion-speed"
              label="Motion speed sec"
              min={1}
              max={12}
              step={0.1}
              value={aestheticSettings.motionLinesSpeedSeconds}
              onChange={(value) =>
                onAestheticChange({ ...aestheticSettings, motionLinesSpeedSeconds: value })
              }
            />

            <ToggleControl
              id="dev-edge-streaks"
              label="Edge streaks"
              checked={aestheticSettings.showEdgeStreaks}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, showEdgeStreaks: value })}
            />

            <NumberControl
              id="dev-edge-streak-opacity"
              label="Edge streak opacity"
              min={0}
              max={0.25}
              step={0.01}
              value={aestheticSettings.edgeStreaksOpacity}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, edgeStreaksOpacity: value })}
            />

            <NumberControl
              id="dev-edge-streak-speed"
              label="Edge streak sec"
              min={2}
              max={24}
              step={0.2}
              value={aestheticSettings.edgeStreaksSpeedSeconds}
              onChange={(value) =>
                onAestheticChange({ ...aestheticSettings, edgeStreaksSpeedSeconds: value })
              }
            />

            <ToggleControl
              id="dev-burst-overlay"
              label="Burst overlay"
              checked={aestheticSettings.showBurstOverlay}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, showBurstOverlay: value })}
            />

            <NumberControl
              id="dev-burst-overlay-opacity"
              label="Burst opacity"
              min={0}
              max={0.3}
              step={0.01}
              value={aestheticSettings.burstOverlayOpacity}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, burstOverlayOpacity: value })}
            />

            <NumberControl
              id="dev-burst-overlay-pulse"
              label="Burst pulse sec"
              min={1.5}
              max={12}
              step={0.1}
              value={aestheticSettings.burstOverlayPulseSeconds}
              onChange={(value) =>
                onAestheticChange({ ...aestheticSettings, burstOverlayPulseSeconds: value })
              }
            />

            <ToggleControl
              id="dev-comic-captions"
              label="Comic captions"
              checked={aestheticSettings.showComicCaptions}
              onChange={(value) =>
                onAestheticChange({ ...aestheticSettings, showComicCaptions: value })
              }
            />

            <NumberControl
              id="dev-caption-tilt"
              label="Caption tilt"
              min={-16}
              max={16}
              step={0.5}
              value={aestheticSettings.comicCaptionRotationDeg}
              onChange={(value) =>
                onAestheticChange({ ...aestheticSettings, comicCaptionRotationDeg: value })
              }
            />

            <NumberControl
              id="dev-benday-opacity"
              label="Ben-day opacity"
              min={0}
              max={1}
              step={0.02}
              value={aestheticSettings.bendayOpacity}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, bendayOpacity: value })}
            />

            <NumberControl
              id="dev-panel-blur"
              label="Panel blur"
              min={0}
              max={26}
              step={1}
              value={aestheticSettings.panelBlurPx}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, panelBlurPx: value })}
            />

            <ToggleControl
              id="dev-glitch-enabled"
              label="Glitch censor"
              checked={aestheticSettings.glitchEnabled}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, glitchEnabled: value })}
            />

            <NumberControl
              id="dev-glitch-speed"
              label="Glitch speed sec"
              min={0.4}
              max={6}
              step={0.1}
              value={aestheticSettings.glitchSpeedSeconds}
              onChange={(value) => onAestheticChange({ ...aestheticSettings, glitchSpeedSeconds: value })}
            />
          </SectionCard>

          <div className="mt-1 grid grid-cols-3 gap-1">
            <ResetButton label="Reset Globe" onClick={() => onGlobeChange(DEFAULT_GLOBE_RUNTIME_SETTINGS)} />
            <ResetButton
              label="Reset VFX"
              onClick={() => onAestheticChange(DEFAULT_AESTHETIC_RUNTIME_SETTINGS)}
            />
            <ResetButton
              label="Reset All"
              onClick={() => {
                onGlobeChange(DEFAULT_GLOBE_RUNTIME_SETTINGS);
                onAestheticChange(DEFAULT_AESTHETIC_RUNTIME_SETTINGS);
              }}
            />
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}
