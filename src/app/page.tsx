import dynamic from "next/dynamic";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

export default function Home() {
  return (
    <main className="relative w-screen h-screen bg-[#0a0a0a]">
      <Globe />
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
    </main>
  );
}
