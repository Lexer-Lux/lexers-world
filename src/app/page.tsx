"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { getEventsForLocation } from "@/lib/data";
import { LexerEvent } from "@/lib/types";
import EventListPanel from "@/components/EventListPanel";
import EventDetailView from "@/components/EventDetailView";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<LexerEvent | null>(null);

  const handleLocationClick = (locationName: string) => {
    setSelectedLocation(locationName);
    setSelectedEvent(null);
  };

  const handleEventClick = (event: LexerEvent) => {
    setSelectedEvent(event);
    // If opened from globe dot (no location selected yet), set the location too
    if (!selectedLocation) {
      setSelectedLocation(event.manualLocation);
    }
  };

  const handleBack = () => {
    setSelectedEvent(null);
  };

  const handleClose = () => {
    setSelectedLocation(null);
    setSelectedEvent(null);
  };

  return (
    <main className="relative w-screen h-screen bg-[#0a0a0a]">
      <Globe onLocationClick={handleLocationClick} onEventClick={handleEventClick} />

      {/* Title overlay */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none">
        <h1
          className="text-3xl font-bold tracking-widest uppercase"
          style={{
            color: "#ff2d75",
            textShadow:
              "0 0 10px rgba(255,45,117,0.7), 0 0 30px rgba(255,45,117,0.4)",
            fontFamily: "monospace",
          }}
        >
          {"LEXER'S WORLD"}
        </h1>
      </div>

      {/* Event list panel — when a location is selected but no event detail open */}
      {selectedLocation && !selectedEvent && (
        <EventListPanel
          locationName={selectedLocation}
          events={getEventsForLocation(selectedLocation)}
          onEventClick={handleEventClick}
          onClose={handleClose}
        />
      )}

      {/* Event detail view — when a specific event is selected */}
      {selectedEvent && (
        <EventDetailView
          event={selectedEvent}
          onBack={handleBack}
          onClose={handleClose}
        />
      )}
    </main>
  );
}
