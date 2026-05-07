import { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://lbscourse.cetmca.in";
  
  const routes: { path: string; priority: number; changefreq: "daily" | "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1.0, changefreq: "daily" },
    { path: "/blog", priority: 0.9, changefreq: "daily" },
    { path: "/contact", priority: 0.8, changefreq: "monthly" },
    { path: "/download", priority: 0.7, changefreq: "monthly" },
    { path: "/developers", priority: 0.5, changefreq: "yearly" },
    { path: "/privacy-policy", priority: 0.3, changefreq: "monthly" },
    { path: "/terms-of-service", priority: 0.3, changefreq: "monthly" },
  ];

  const staticSitemap = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changefreq,
    priority: route.priority,
  }));

  const blogSitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticSitemap, ...blogSitemap];
}