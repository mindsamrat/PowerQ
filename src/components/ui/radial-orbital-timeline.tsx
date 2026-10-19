"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, Link as LinkIcon, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineItem {
  id: number;
  title: string;
  /** Short rarity line shown in the card header, e.g. "est. 6% of people". */
  rarity: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  /** 40–100: size of the decorative halo behind the node. */
  glow: number;
  /** Optional link to a full profile page, rendered at the foot of the card. */
  href?: string;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a media query on mount
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const reducedMotion = usePrefersReducedMotion();
  // The visitor's explicit choice wins over everything else.
  const [paused, setPaused] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);

  const autoRotate = paused === null ? !reducedMotion && expandedId === null : !paused;

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) setExpandedId(null);
  };

  const centerViewOnNode = useCallback((nodeId: number) => {
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const targetAngle = (nodeIndex / timelineData.length) * 360;
    setRotationAngle(270 - targetAngle);
  }, [timelineData]);

  const toggleItem = (id: number) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next !== null) centerViewOnNode(next);
      return next;
    });
  };

  useEffect(() => {
    if (!autoRotate) return;
    const rotationTimer = setInterval(() => {
      setRotationAngle((prev) => Number(((prev + 0.3) % 360).toFixed(3)));
    }, 50);
    return () => clearInterval(rotationTimer);
  }, [autoRotate]);

  // Escape closes the open card, as a dialog would.
  useEffect(() => {
    if (expandedId === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpandedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedId]);

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 200;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, angle, zIndex, opacity };
  };

  const relatedToActive = expandedId === null ? [] : (timelineData.find((i) => i.id === expandedId)?.relatedIds ?? []);

  return (
    <div
      className="w-full h-[620px] md:h-[720px] flex flex-col items-center justify-center overflow-hidden relative"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{ perspective: "1000px" }}
        >
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/90 via-rose-500/80 to-purple-500/80 animate-pulse flex items-center justify-center z-10" aria-hidden="true">
            <div className="absolute w-20 h-20 rounded-full border border-white/20 animate-ping opacity-70" />
            <div className="absolute w-24 h-24 rounded-full border border-white/10 animate-ping opacity-50" style={{ animationDelay: "0.5s" }} />
            <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md" />
          </div>

          <div className="absolute w-96 h-96 rounded-full border border-white/10" aria-hidden="true" />

          <ul className="contents" aria-label="The eight archetypes">
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedId === item.id;
            const isRelated = relatedToActive.includes(item.id);
            const Icon = item.icon;
            const cardId = `archetype-card-${item.id}`;

            const nodeStyle: React.CSSProperties = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <li
                key={item.id}
                className="absolute transition-all duration-700 list-none"
                style={nodeStyle}
              >
                <div
                  className={`absolute rounded-full -inset-1 pointer-events-none ${isRelated ? "animate-pulse duration-1000" : ""}`}
                  aria-hidden="true"
                  style={{
                    background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)",
                    width: `${item.glow * 0.5 + 40}px`,
                    height: `${item.glow * 0.5 + 40}px`,
                    left: `-${(item.glow * 0.5) / 2}px`,
                    top: `-${(item.glow * 0.5) / 2}px`,
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                  aria-expanded={isExpanded}
                  aria-controls={isExpanded ? cardId : undefined}
                  aria-label={`${item.title}: ${item.category.toLowerCase()}`}
                  className="group block cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <span
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isExpanded ? "bg-white text-black" : isRelated ? "bg-white/50 text-black" : "bg-black text-white"}
                      border-2
                      ${isExpanded ? "border-white shadow-lg shadow-white/30" : isRelated ? "border-white animate-pulse" : "border-white/40"}
                      transition-all duration-300 transform
                      ${isExpanded ? "scale-150" : ""}
                    `}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span
                    className={`
                      absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap
                      text-xs font-semibold tracking-wider
                      transition-all duration-300
                      ${isExpanded ? "text-white scale-125" : "text-white/80"}
                    `}
                    aria-hidden="true"
                  >
                    {item.title}
                  </span>
                </button>

                {isExpanded && (
                  <Card id={cardId} className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-black/90 backdrop-blur-lg border-white/30 shadow-xl shadow-white/10 overflow-visible">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/50" aria-hidden="true" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center gap-2">
                        <Badge className="px-2 text-xs text-white bg-black border-white">
                          {item.category}
                        </Badge>
                        <span className="text-[11px] font-mono text-white/70 whitespace-nowrap">{item.rarity}</span>
                      </div>
                      <CardTitle className="text-sm mt-2">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/85">
                      <p>{item.content}</p>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center mb-2">
                            <LinkIcon size={10} className="text-white/70 mr-1" aria-hidden="true" />
                            <h4 className="text-xs uppercase tracking-wider font-medium text-white/70">
                              Natural Enemy
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relId) => {
                              const rel = timelineData.find((i) => i.id === relId);
                              return (
                                <Button
                                  key={relId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-6 px-2 py-0 text-xs rounded-none border-white/20 bg-transparent hover:bg-white/10 text-white/80 hover:text-white transition-all"
                                  onClick={(e) => { e.stopPropagation(); toggleItem(relId); }}
                                >
                                  {rel?.title}
                                  <ArrowRight size={8} className="ml-1 text-white/60" aria-hidden="true" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {item.href && (
                        <a
                          href={item.href}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-4 flex items-center justify-center text-[11px] uppercase tracking-wider py-1.5 border transition-colors text-amber-300/90 hover:text-amber-200 border-white/15 hover:border-amber-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
                        >
                          Full profile <ArrowRight size={10} className="ml-1" aria-hidden="true" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                )}
              </li>
            );
          })}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setPaused(autoRotate); }}
        aria-pressed={!autoRotate}
        className="absolute bottom-3 right-4 md:right-8 inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-white/70 hover:text-white rounded-full px-3 py-2 border border-white/15 bg-black/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
      >
        {autoRotate ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
        {autoRotate ? "Pause" : "Rotate"}
      </button>
    </div>
  );
}
