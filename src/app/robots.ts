import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/quiz", "/archetypes", "/privacy", "/terms"],
        // Personal result pages, API routes and the admin dashboard must never be indexed.
        disallow: ["/api/", "/results", "/paid", "/admin"],
      },
    ],
    sitemap: "https://quiz.wayofgods.com/sitemap.xml",
    host: "https://quiz.wayofgods.com",
  };
}
