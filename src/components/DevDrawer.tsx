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

function HintDot({ help }: { help: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        title={help}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border font-mono text-[8px]"
        style={{
          color: "var(--neon-cyan)",
          borderColor: "rgba(0, 240, 255, 0.36)",
          background: "rgba(0, 240, 255, 0.08)",
        }}
        aria-label={help}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-[70] ml-1.5 w-56 -translate-y-1/2 rounded border px-2 py-1 font-mono text-[9px] normal-case tracking-normal opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          color: "var(--copy-primary)",
          borderColor: "rgba(0, 240, 255, 0.3)",
          background: "rgba(5, 10, 26, 0.96)",
          boxShadow: "0 0 20px rgba(0, 240, 255, 0.2)",
        }}
      >
        {help}
      </span>
    </span>
  );
}

function LabelRow({ label, help }: { label: string; help?: string }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: "var(--copy-secondary)" }}>
      {label}
      {help && <HintDot help={help} />}
    </span>
  );
}

function NumberControl({
  id,
  label,
  min,
  max,
  step,
  value,
  help,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  help?: string;
  onChange: (value: number) => void;
}) {
  const precision = decimalPlaces(step);
  const minText = Number.isInteger(min) ? `${min}` : min.toFixed(decimalPlaces(step));
  const maxText = Number.isInteger(max) ? `${max}` : max.toFixed(decimalPlaces(step));
  const stepText = Number.isInteger(step) ? `${step}` : step.toString();
  const tooltipText = help
    ? `${help} Range ${minText} to ${maxText}. Step ${stepText}.`
    : `Range ${minText} to ${maxText}. Step ${stepText}.`;

  return (
    <label htmlFor={id} className="grid gap-0.5">
      <LabelRow label={label} help={tooltipText} />
      <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
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
          className="w-[72px] rounded border bg-black/30 px-1 py-0.5 text-right font-mono text-[9px]"
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
  help,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-0.5">
      <LabelRow label={label} help={help} />
      <div className="grid grid-cols-[auto_1fr] items-center gap-1.5">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-9 cursor-pointer rounded border bg-transparent p-0"
          style={{ borderColor: "rgba(130, 166, 255, 0.38)" }}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded border bg-black/30 px-1 py-0.5 font-mono text-[9px] uppercase"
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
  help,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  help?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-2">
      <LabelRow label={label} help={help} />
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer accent-cyan-300"
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
      className="grid gap-0.5 rounded-md border px-1.5 py-1"
      style={{
        borderColor: active ? "rgba(0, 240, 255, 0.35)" : "rgba(142, 154, 205, 0.2)",
        background: active ? "rgba(0, 240, 255, 0.05)" : "rgba(10, 15, 31, 0.28)",
      }}
    >
      <h3
        className="font-mono text-[13px] font-black uppercase tracking-[0.16em]"
        style={{
          color: active ? "var(--neon-cyan)" : "var(--copy-secondary)",
          textShadow: active ? "0 0 8px rgba(0, 240, 255, 0.18)" : "none",
        }}
      >
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
      className="cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]"
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

  const wrapperClassName = useMemo(() => {
    if (isMobile) {
      return `fixed inset-x-0 bottom-0 z-50 h-[50vh] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`;
    }

    return `fixed left-0 top-0 z-50 h-screen w-[min(92vw,420px)] transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`;
  }, [isMobile, open]);

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
          className="panel-shell benday-overlay relative flex h-full flex-col overflow-hidden border"
          style={{
            borderColor: "var(--border-cyan)",
            borderRadius: isMobile ? "16px 16px 0 0" : "0 12px 12px 0",
            background: "rgba(8, 11, 24, 0.66)",
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
            <span className="font-mono text-xs">&rsaquo;</span>
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

          <div className="border-b px-2 py-1.5" style={{ borderColor: "rgba(0, 240, 255, 0.18)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan">Dev Drawer</span>
              <span className="font-mono text-[10px]" style={{ color: "var(--copy-muted)" }}>
                {showTabHint ? "TAB" : ""}
              </span>
            </div>

            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: "var(--copy-muted)" }}>
              Effects stack together. Toggle any combo.
            </p>
          </div>

          <div className="grid min-h-0 flex-1 gap-1 overflow-y-auto px-1.5 py-1.5 pb-2">
            <SectionCard title="Globe Core" active>
              <ToggleControl
                id="dev-auto-rotate"
                label="Auto rotate"
                checked={globeSettings.autoRotate}
                help="When on, globe spins while idle."
                onChange={(value) => onGlobeChange({ ...globeSettings, autoRotate: value })}
              />

              <NumberControl
                id="dev-auto-rotate-speed"
                label="Idle spin speed"
                min={0}
                max={6}
                step={0.01}
                value={globeSettings.autoRotateSpeed}
                help="Higher values spin faster."
                onChange={(value) => onGlobeChange({ ...globeSettings, autoRotateSpeed: value })}
              />

              <NumberControl
                id="dev-drag-rotate-speed"
                label="Drag rotate speed"
                min={0.05}
                max={8}
                step={0.01}
                value={globeSettings.dragRotateSpeed}
                help="How quickly drag input rotates the globe."
                onChange={(value) => onGlobeChange({ ...globeSettings, dragRotateSpeed: value })}
              />

              <ToggleControl
                id="dev-use-inertia"
                label="Drag inertia"
                checked={globeSettings.useInertia}
                help="Applies momentum after drag release."
                onChange={(value) => onGlobeChange({ ...globeSettings, useInertia: value })}
              />

              <NumberControl
                id="dev-inertia-damping"
                label="Inertia damping"
                min={0.001}
                max={0.99}
                step={0.01}
                value={globeSettings.inertiaDamping}
                help="Lower values coast longer; higher values stop faster."
                onChange={(value) => onGlobeChange({ ...globeSettings, inertiaDamping: value })}
              />

              <NumberControl
                id="dev-zoom-threshold"
                label="Zoom threshold"
                min={1}
                max={100}
                step={0.1}
                value={globeSettings.zoomThreshold}
                help="Altitude where city stars switch to event dots."
                onChange={(value) => onGlobeChange({ ...globeSettings, zoomThreshold: value })}
              />

              <NumberControl
                id="dev-marker-scale"
                label="Marker scale"
                min={0.1}
                max={5}
                step={0.01}
                value={globeSettings.markerScale}
                help="Scales city star markers and labels."
                onChange={(value) => onGlobeChange({ ...globeSettings, markerScale: value })}
              />

              <NumberControl
                id="dev-point-radius"
                label="Event dot size"
                min={0.02}
                max={0.03}
                step={0.001}
                value={globeSettings.pointRadius}
                help="Radius of event points when zoomed in."
                onChange={(value) => onGlobeChange({ ...globeSettings, pointRadius: value })}
              />

              <NumberControl
                id="dev-point-altitude"
                label="Event dot lift"
                min={0}
                max={0.01}
                step={0.001}
                value={globeSettings.pointAltitude}
                help="How far event points float above the globe."
                onChange={(value) => onGlobeChange({ ...globeSettings, pointAltitude: value })}
              />
            </SectionCard>

            <SectionCard title="Crosshatch + Day/Night" active>
              <NumberControl
                id="dev-wire-strength"
                label="Wire strength"
                min={0}
                max={4}
                step={0.01}
                value={globeSettings.wireStrength}
                help="Strength of longitude/latitude line tinting."
                onChange={(value) => onGlobeChange({ ...globeSettings, wireStrength: value })}
              />

              <NumberControl
                id="dev-hatch-strength"
                label="Hatch strength"
                min={0}
                max={4}
                step={0.01}
                value={globeSettings.hatchStrength}
                help="How dark crosshatch shadows appear on the night side."
                onChange={(value) => onGlobeChange({ ...globeSettings, hatchStrength: value })}
              />

              <NumberControl
                id="dev-crosshatch-density"
                label="Crosshatch density"
                min={0.05}
                max={12}
                step={0.01}
                value={globeSettings.crosshatchDensity}
                help="Pattern frequency of hatch strokes."
                onChange={(value) => onGlobeChange({ ...globeSettings, crosshatchDensity: value })}
              />

              <NumberControl
                id="dev-crosshatch-threshold"
                label="Crosshatch threshold"
                min={0.05}
                max={0.995}
                step={0.001}
                value={globeSettings.crosshatchThreshold}
                help="Lower values fill more hatch strokes; higher values keep fewer."
                onChange={(value) => onGlobeChange({ ...globeSettings, crosshatchThreshold: value })}
              />
            </SectionCard>

            <SectionCard
              title="Borders"
              active={
                globeSettings.showInternationalBorders ||
                globeSettings.showAdmin1Divisions ||
                globeSettings.showAdmin2Divisions
              }
            >
              <ToggleControl
                id="dev-border-auto-lod"
                label="Auto border LOD"
                checked={globeSettings.autoBorderLod}
                help="Automatically changes border detail by zoom + projected on-screen size."
                onChange={(value) => onGlobeChange({ ...globeSettings, autoBorderLod: value })}
              />

              <ToggleControl
                id="dev-border-front-only"
                label="Front hemisphere"
                checked={globeSettings.borderVisibleHemisphereOnly}
                help="When enabled, render only border segments on the camera-facing hemisphere for all border layers."
                onChange={(value) => onGlobeChange({ ...globeSettings, borderVisibleHemisphereOnly: value })}
              />

              <NumberControl
                id="dev-border-quality-bias"
                label="LOD quality bias"
                min={0}
                max={1}
                step={0.01}
                value={globeSettings.borderQualityBias}
                help="Master detail/performance slider. Higher keeps more borders visible."
                onChange={(value) => onGlobeChange({ ...globeSettings, borderQualityBias: value })}
              />

              <NumberControl
                id="dev-border-lod-update-ms"
                label="LOD update ms"
                min={40}
                max={1000}
                step={10}
                value={globeSettings.borderLodUpdateMs}
                help="Throttle (ms) for recalculating which borders are visible while orbiting. Only matters when 'Front hemisphere' is on and you're actively dragging. Lower = smoother border pop-in during rotation but more CPU work. At rest, this does nothing."
                onChange={(value) => onGlobeChange({ ...globeSettings, borderLodUpdateMs: value })}
              />

              <div
                className="mt-1 border-t pt-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
                style={{ color: "var(--neon-cyan)", borderColor: "rgba(0, 240, 255, 0.16)" }}
              >
                Intl Borders
              </div>

              <ToggleControl
                id="dev-show-international-borders"
                label="Enabled"
                checked={globeSettings.showInternationalBorders}
                help="Show country boundaries and coastlines."
                onChange={(value) => onGlobeChange({ ...globeSettings, showInternationalBorders: value })}
              />

              <NumberControl
                id="dev-international-border-thickness"
                label="Int'l thickness"
                min={0}
                max={10}
                step={0.01}
                value={globeSettings.internationalBorderThickness}
                help="Stroke width for international borders and coastlines. Value is used directly."
                onChange={(value) => onGlobeChange({ ...globeSettings, internationalBorderThickness: value })}
              />

              <NumberControl
                id="dev-intl-border-alpha"
                label="Int'l alpha"
                min={0}
                max={1}
                step={0.01}
                value={globeSettings.internationalBorderAlpha}
                help="Transparency for international borders and coastlines. 0 hides them, 1 is fully visible."
                onChange={(value) => onGlobeChange({ ...globeSettings, internationalBorderAlpha: value })}
              />

              <NumberControl
                id="dev-border-max-admin0"
                label="Max country features"
                min={0}
                max={2000}
                step={10}
                value={globeSettings.borderMaxFeaturesAdmin0}
                help="Hard render cap for country/coast boundary features."
                onChange={(value) => onGlobeChange({ ...globeSettings, borderMaxFeaturesAdmin0: Math.round(value) })}
              />

              <div
                className="mt-1 border-t pt-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
                style={{ color: "var(--neon-cyan)", borderColor: "rgba(0, 240, 255, 0.16)" }}
              >
                1st-Level Divisions
              </div>

              <ToggleControl
                id="dev-show-admin1"
                label="Enabled"
                checked={globeSettings.showAdmin1Divisions}
                help="Show states/provinces/regions."
                onChange={(value) => onGlobeChange({ ...globeSettings, showAdmin1Divisions: value })}
              />

              <NumberControl
                id="dev-admin1-thickness"
                label="1st thickness"
                min={0}
                max={10}
                step={0.01}
                value={globeSettings.admin1Thickness}
                help="Stroke width for first-level division lines. Value is used directly."
                onChange={(value) => onGlobeChange({ ...globeSettings, admin1Thickness: value })}
              />

              <NumberControl
                id="dev-admin1-alpha"
                label="1st alpha"
                min={0}
                max={1}
                step={0.01}
                value={globeSettings.admin1Alpha}
                help="Transparency for first-level division lines. 0 hides them, 1 is fully visible."
                onChange={(value) => onGlobeChange({ ...globeSettings, admin1Alpha: value })}
              />

              <NumberControl
                id="dev-admin1-dash-length"
                label="1st dash length"
                min={0.01}
                max={0.99}
                step={0.01}
                value={globeSettings.admin1DashLength}
                help="Visible part of each dashed segment for first-level divisions."
                onChange={(value) => onGlobeChange({ ...globeSettings, admin1DashLength: value })}
              />

              <NumberControl
                id="dev-admin1-dash-gap"
                label="1st dash gap"
                min={0.01}
                max={0.99}
                step={0.01}
                value={globeSettings.admin1DashGap}
                help="Gap between first-level dashed segments."
                onChange={(value) => onGlobeChange({ ...globeSettings, admin1DashGap: value })}
              />

              <NumberControl
                id="dev-border-admin1-min-px"
                label="1st min screen px"
                min={0}
                max={180}
                step={1}
                value={globeSettings.borderAdmin1MinScreenPx}
                help="Minimum projected screen size before first-level features render. Higher hides tiny distant lines."
                onChange={(value) => onGlobeChange({ ...globeSettings, borderAdmin1MinScreenPx: value })}
              />

              <NumberControl
                id="dev-border-max-admin1"
                label="Max 1st features"
                min={80}
                max={22000}
                step={20}
                value={globeSettings.borderMaxFeaturesAdmin1}
                help="Hard render cap for first-level boundary features."
                onChange={(value) => onGlobeChange({ ...globeSettings, borderMaxFeaturesAdmin1: Math.round(value) })}
              />

              <div
                className="mt-1 border-t pt-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
                style={{ color: "var(--neon-cyan)", borderColor: "rgba(0, 240, 255, 0.16)" }}
              >
                2nd-Level Divisions
              </div>

              <ToggleControl
                id="dev-show-admin2"
                label="Enabled"
                checked={globeSettings.showAdmin2Divisions}
                help="Show finer county/district-style boundaries with best-effort global fallback where true admin2 data is sparse."
                onChange={(value) => onGlobeChange({ ...globeSettings, showAdmin2Divisions: value })}
              />

              <NumberControl
                id="dev-admin2-thickness"
                label="2nd thickness"
                min={0.05}
                max={25}
                step={0.01}
                value={globeSettings.admin2Thickness}
                help="Dot diameter for second-level boundaries."
                onChange={(value) => onGlobeChange({ ...globeSettings, admin2Thickness: value })}
              />

              <NumberControl
                id="dev-admin2-alpha"
                label="2nd alpha"
                min={0}
                max={1}
                step={0.01}
                value={globeSettings.admin2Alpha}
                help="Transparency for second-level division lines. 0 hides them, 1 is fully visible."
                onChange={(value) => onGlobeChange({ ...globeSettings, admin2Alpha: value })}
              />

              <NumberControl
                id="dev-admin2-dot-size"
                label="2nd dot size"
                min={0.01}
                max={0.99}
                step={0.005}
                value={globeSettings.admin2DotSize}
                help="Controls how compact each second-level dot distribution appears along boundaries."
                onChange={(value) => onGlobeChange({ ...globeSettings, admin2DotSize: value })}
              />

              <NumberControl
                id="dev-admin2-dot-gap"
                label="2nd dot gap"
                min={0.01}
                max={0.99}
                step={0.005}
                value={globeSettings.admin2DotGap}
                help="Spacing between second-level dots along boundaries."
                onChange={(value) => onGlobeChange({ ...globeSettings, admin2DotGap: value })}
              />

              <NumberControl
                id="dev-border-admin2-min-px"
                label="2nd min screen px"
                min={0}
                max={220}
                step={1}
                value={globeSettings.borderAdmin2MinScreenPx}
                help="Minimum projected screen size before second-level features render."
                onChange={(value) => onGlobeChange({ ...globeSettings, borderAdmin2MinScreenPx: value })}
              />

              <NumberControl
                id="dev-border-max-admin2"
                label="Max 2nd features"
                min={80}
                max={30000}
                step={20}
                value={globeSettings.borderMaxFeaturesAdmin2}
                help="Hard render cap for second-level boundary features."
                onChange={(value) => onGlobeChange({ ...globeSettings, borderMaxFeaturesAdmin2: Math.round(value) })}
              />

            </SectionCard>

            <SectionCard title="Atmosphere" active>
              <ToggleControl
                id="dev-show-atmosphere"
                label="Atmosphere"
                checked={globeSettings.showAtmosphere}
                help="Enable atmospheric glow shell."
                onChange={(value) => onGlobeChange({ ...globeSettings, showAtmosphere: value })}
              />

              <ColorControl
                id="dev-atmosphere-color"
                label="Atmosphere color"
                value={globeSettings.atmosphereColor}
                help="Color tint for the atmosphere shell."
                onChange={(value) => onGlobeChange({ ...globeSettings, atmosphereColor: value })}
              />

              <NumberControl
                id="dev-atmosphere-altitude"
                label="Atmosphere altitude"
                min={0}
                max={0.6}
                step={0.005}
                value={globeSettings.atmosphereAltitude}
                help="How far atmosphere expands from globe surface."
                onChange={(value) => onGlobeChange({ ...globeSettings, atmosphereAltitude: value })}
              />

              <ToggleControl
                id="dev-curved-title"
                label="Curved title"
                checked={globeSettings.showCurvedTitle}
                help="Show the LEXER'S WORLD arc above the globe."
                onChange={(value) => onGlobeChange({ ...globeSettings, showCurvedTitle: value })}
              />
            </SectionCard>

            <SectionCard title="Paper Effect" active={globeSettings.enablePaperEffect}>
              <ToggleControl
                id="dev-paper-enable"
                label="Enable Paper"
                checked={globeSettings.enablePaperEffect}
                help="Switches the globe to a paper-comic shader with warm palette, grain, halftone dots, and ink contouring."
                onChange={(value) => onGlobeChange({ ...globeSettings, enablePaperEffect: value })}
              />

              <NumberControl
                id="dev-paper-grain"
                label="Grain"
                min={0}
                max={5}
                step={0.01}
                value={globeSettings.paperGrainStrength}
                help="Noise amount on paper surface."
                onChange={(value) => onGlobeChange({ ...globeSettings, paperGrainStrength: value })}
              />

              <NumberControl
                id="dev-paper-halftone"
                label="Halftone"
                min={0}
                max={5}
                step={0.01}
                value={globeSettings.paperHalftoneStrength}
                help="Strength of halftone dots in darker regions."
                onChange={(value) => onGlobeChange({ ...globeSettings, paperHalftoneStrength: value })}
              />

              <NumberControl
                id="dev-paper-ink"
                label="Ink weight"
                min={0}
                max={5}
                step={0.01}
                value={globeSettings.paperInkStrength}
                help="How bold contour ink appears."
                onChange={(value) => onGlobeChange({ ...globeSettings, paperInkStrength: value })}
              />
            </SectionCard>

            <SectionCard title="Phase 5B Atmosphere" active>
              <ToggleControl
                id="dev-nebula-enabled"
                label="Nebula layer"
                checked={aestheticSettings.showNebula}
                help="Shows animated background nebulas."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, showNebula: value })}
              />

              <NumberControl
                id="dev-nebula-opacity"
                label="Nebula opacity"
                min={0}
                max={1}
                step={0.02}
                value={aestheticSettings.nebulaOpacity}
                help="Opacity of nebula layers."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, nebulaOpacity: value })}
              />

              <NumberControl
                id="dev-nebula-blur"
                label="Nebula blur"
                min={0}
                max={80}
                step={1}
                value={aestheticSettings.nebulaBlurPx}
                help="Blur radius for nebula layers."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, nebulaBlurPx: value })}
              />

              <NumberControl
                id="dev-nebula-drift"
                label="Nebula drift sec"
                min={4}
                max={40}
                step={0.5}
                value={aestheticSettings.nebulaDriftSeconds}
                help="Duration of one nebula drift cycle."
                onChange={(value) =>
                  onAestheticChange({ ...aestheticSettings, nebulaDriftSeconds: value })
                }
              />

              <ToggleControl
                id="dev-grid-overlay"
                label="Grid overlay"
                checked={aestheticSettings.showGridOverlay}
                help="Shows animated synth grid over background."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, showGridOverlay: value })}
              />

              <NumberControl
                id="dev-grid-opacity"
                label="Grid opacity"
                min={0}
                max={0.7}
                step={0.01}
                value={aestheticSettings.gridOpacity}
                help="Opacity of the grid overlay."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, gridOpacity: value })}
              />

              <NumberControl
                id="dev-grid-angle"
                label="Grid angle"
                min={60}
                max={150}
                step={1}
                value={aestheticSettings.gridAngleDeg}
                help="Angle of the repeating grid lines."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, gridAngleDeg: value })}
              />

              <NumberControl
                id="dev-grid-spacing"
                label="Grid spacing"
                min={2}
                max={30}
                step={1}
                value={aestheticSettings.gridSpacingPx}
                help="Distance between grid lines in pixels."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, gridSpacingPx: value })}
              />

              <NumberControl
                id="dev-grid-drift"
                label="Grid drift sec"
                min={3}
                max={60}
                step={0.5}
                value={aestheticSettings.gridDriftSeconds}
                help="Duration of one grid drift loop."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, gridDriftSeconds: value })}
              />

              <ToggleControl
                id="dev-horizon-fade"
                label="Horizon fade"
                checked={aestheticSettings.showHorizonFade}
                help="Adds depth fade toward screen bottom."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, showHorizonFade: value })}
              />

              <NumberControl
                id="dev-horizon-opacity"
                label="Horizon opacity"
                min={0}
                max={1}
                step={0.02}
                value={aestheticSettings.horizonOpacity}
                help="Opacity of horizon fade layer."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, horizonOpacity: value })}
              />
            </SectionCard>

            <SectionCard title="Comic + Censor" active>
              <ToggleControl
                id="dev-motion-lines"
                label="Motion lines"
                checked={aestheticSettings.showMotionLines}
                help="Enables moving line texture over scene."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, showMotionLines: value })}
              />

              <NumberControl
                id="dev-motion-opacity"
                label="Motion opacity"
                min={0}
                max={0.4}
                step={0.01}
                value={aestheticSettings.motionLinesOpacity}
                help="Opacity of motion line effect."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, motionLinesOpacity: value })}
              />

              <NumberControl
                id="dev-motion-speed"
                label="Motion speed sec"
                min={0.5}
                max={16}
                step={0.1}
                value={aestheticSettings.motionLinesSpeedSeconds}
                help="Duration of one motion line cycle."
                onChange={(value) =>
                  onAestheticChange({ ...aestheticSettings, motionLinesSpeedSeconds: value })
                }
              />

              <ToggleControl
                id="dev-edge-streaks"
                label="Edge streaks"
                checked={aestheticSettings.showEdgeStreaks}
                help="Adds animated streaks near screen edges."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, showEdgeStreaks: value })}
              />

              <NumberControl
                id="dev-edge-streak-opacity"
                label="Edge streak opacity"
                min={0}
                max={0.35}
                step={0.01}
                value={aestheticSettings.edgeStreaksOpacity}
                help="Opacity of edge streak effect."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, edgeStreaksOpacity: value })}
              />

              <NumberControl
                id="dev-edge-streak-speed"
                label="Edge streak sec"
                min={1}
                max={32}
                step={0.2}
                value={aestheticSettings.edgeStreaksSpeedSeconds}
                help="Duration of one edge streak animation cycle."
                onChange={(value) =>
                  onAestheticChange({ ...aestheticSettings, edgeStreaksSpeedSeconds: value })
                }
              />

              <ToggleControl
                id="dev-burst-overlay"
                label="Burst overlay"
                checked={aestheticSettings.showBurstOverlay}
                help="Adds comic burst overlay over scene."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, showBurstOverlay: value })}
              />

              <NumberControl
                id="dev-burst-overlay-opacity"
                label="Burst opacity"
                min={0}
                max={0.5}
                step={0.01}
                value={aestheticSettings.burstOverlayOpacity}
                help="Opacity of burst overlay."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, burstOverlayOpacity: value })}
              />

              <NumberControl
                id="dev-burst-overlay-pulse"
                label="Burst pulse sec"
                min={0.8}
                max={16}
                step={0.1}
                value={aestheticSettings.burstOverlayPulseSeconds}
                help="Duration of one burst pulse cycle."
                onChange={(value) =>
                  onAestheticChange({ ...aestheticSettings, burstOverlayPulseSeconds: value })
                }
              />

              <ToggleControl
                id="dev-comic-captions"
                label="Comic captions"
                checked={aestheticSettings.showComicCaptions}
                help="Enables comic text caption treatments."
                onChange={(value) =>
                  onAestheticChange({ ...aestheticSettings, showComicCaptions: value })
                }
              />

              <NumberControl
                id="dev-caption-tilt"
                label="Caption tilt"
                min={-22}
                max={22}
                step={0.5}
                value={aestheticSettings.comicCaptionRotationDeg}
                help="Rotation angle applied to caption overlays."
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
                help="Opacity of Ben-Day dot overlays."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, bendayOpacity: value })}
              />

              <NumberControl
                id="dev-panel-blur"
                label="Panel blur"
                min={0}
                max={32}
                step={1}
                value={aestheticSettings.panelBlurPx}
                help="Backdrop blur strength for panels."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, panelBlurPx: value })}
              />

              <ToggleControl
                id="dev-glitch-enabled"
                label="Glitch censor"
                checked={aestheticSettings.glitchEnabled}
                help="Enables glitch masking animations for outsider redactions."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, glitchEnabled: value })}
              />

              <NumberControl
                id="dev-glitch-speed"
                label="Glitch speed sec"
                min={0.2}
                max={8}
                step={0.1}
                value={aestheticSettings.glitchSpeedSeconds}
                help="Duration of one glitch animation cycle."
                onChange={(value) => onAestheticChange({ ...aestheticSettings, glitchSpeedSeconds: value })}
              />
            </SectionCard>

            <div
              className="sticky bottom-0 mt-0.5 grid grid-cols-3 gap-1 border-t pt-1"
              style={{
                borderColor: "rgba(0, 240, 255, 0.16)",
                background:
                  "linear-gradient(180deg, rgba(8, 11, 24, 0) 0%, rgba(8, 11, 24, 0.92) 22%, rgba(8, 11, 24, 0.96) 100%)",
              }}
            >
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
