import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/quiz", "/privacy", "/terms"],
        // Personal result pages and API routes must never be indexed.
        disallow: ["/api/", "/results", "/paid"],
      },
    ],
    sitemap: "https://quiz.wayofgods.com/sitemap.xml",
    host: "https://quiz.wayofgods.com",
  };
}
