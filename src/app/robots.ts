import { MetadataRoute } from "next";

/**
 * Generates the robots.txt content dynamically based on the application environment.
 * Ensures that private routes like admin, dashboard, and API are not indexed by search engines.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://lbscourse.cetmca.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/api/",
          "/_next/",
          "/player/",
          "/change-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: "lbscourse.cetmca.in",
  };
}
