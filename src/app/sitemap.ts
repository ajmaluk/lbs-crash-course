import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://lbscourse.cetmca.in";
  const lastModified = new Date("2026-04-08T00:00:00.000Z");

  const routes = [
    "/",
    "/login",
    "/register",
    "/privacy-policy",
    "/terms-of-service",
    "/contact",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1.0 : route === "/login" || route === "/register" ? 0.9 : 0.7,
  }));
}
