import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API routes and the admin dashboard are never for crawlers. Result and
        // payment pages are NOT listed here on purpose: they carry a noindex
        // header, and a crawler can only honour that if it is allowed to fetch.
        disallow: ["/api/", "/admin"],
      },
    ],
    sitemap: "https://quiz.wayofgods.com/sitemap.xml",
    host: "https://quiz.wayofgods.com",
  };
}
