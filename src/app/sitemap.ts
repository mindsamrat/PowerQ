import type { MetadataRoute } from "next";
import { archetypes } from "@/data/archetypes";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://quiz.wayofgods.com";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/quiz`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/archetypes`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...archetypes.map((a) => ({
      url: `${base}/archetypes/${a.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
