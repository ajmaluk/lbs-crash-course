import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://lbscourse.cetmca.in";

  const routes = [
    "",
    "/login",
    "/register",
    "/privacy-policy",
    "/terms-of-service",
    "/contact",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route === "/login" || route === "/register" ? 0.9 : 0.7,
  }));
}
