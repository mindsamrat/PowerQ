"use client";

import { Crown, Eye, Compass, Sparkles, Swords, Scale, Crosshair, Flame } from "lucide-react";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { archetypes } from "@/data/archetypes";

const iconById: Record<string, React.ElementType> = {
  sovereign: Crown,
  shadow: Eye,
  architect: Compass,
  oracle: Sparkles,
  blade: Swords,
  diplomat: Scale,
  hunter: Crosshair,
  flame: Flame,
};

const categoryById: Record<string, string> = {
  sovereign: "VISIBLE COMMAND",
  shadow: "INVISIBLE LEVERAGE",
  architect: "SYSTEMS",
  oracle: "INSIGHT",
  blade: "DECISIVE FORCE",
  diplomat: "COMPOSED CONTROL",
  hunter: "OPPORTUNITY",
  flame: "MAGNETISM",
};

// Stable numeric IDs — order defines the orbital ring placement.
const orbitalOrder: string[] = [
  "sovereign", "flame", "shadow", "diplomat",
  "architect", "hunter", "oracle", "blade",
];

function idFor(slug: string): number {
  return orbitalOrder.indexOf(slug) + 1;
}

export default function ArchetypeOrbital() {
  const data: TimelineItem[] = orbitalOrder.map((slug) => {
    const a = archetypes.find((x) => x.id === slug)!;
    return {
      id: idFor(slug),
      title: a.name.replace(/^The /, ""),
      date: `${a.rarity}% rare`,
      content: a.tagline,
      category: categoryById[slug],
      icon: iconById[slug],
      relatedIds: [idFor(a.enemyId)],
      status: "completed",
      energy: Math.round(((20 - a.rarity) / 14) * 60 + 40), // rarer = more energy, 40-100
      href: `/archetypes/${slug}`,
    };
  });

  return <RadialOrbitalTimeline timelineData={data} />;
}
