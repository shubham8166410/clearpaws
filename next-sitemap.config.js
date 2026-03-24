/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://petborder.com",
  generateRobotsTxt: true,
  generateIndexSitemap: false,

  // Exclude all non-public routes
  exclude: [
    "/admin",
    "/admin/*",
    "/dashboard",
    "/dashboard/*",
    "/agency-portal",
    "/agency-portal/*",
    "/vet-portal",
    "/vet-portal/*",
    "/wl",
    "/wl/*",
    "/login",
    "/signup",
    "/auth/*",
    // Exclude all API routes EXCEPT the public docs page
    "/api/admin",
    "/api/admin/*",
    "/api/agencies",
    "/api/agencies/*",
    "/api/agency-leads",
    "/api/agency-leads/*",
    "/api/agency",
    "/api/agency/*",
    "/api/api-keys",
    "/api/api-keys/*",
    "/api/checkout",
    "/api/contact",
    "/api/countries",
    "/api/cron",
    "/api/cron/*",
    "/api/generate-timeline",
    "/api/generate-outbound-timeline",
    "/api/labs",
    "/api/mickleham-status",
    "/api/pdf",
    "/api/pdf/*",
    "/api/pets",
    "/api/pets/*",
    "/api/subscription",
    "/api/subscription/*",
    "/api/timelines",
    "/api/timelines/*",
    "/api/v1",
    "/api/v1/*",
    "/api/vet",
    "/api/vet/*",
    "/api/vet-clinics",
    "/api/vets",
    "/api/webhook",
    "/api/webhook/*",
  ],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/agency-portal",
          "/vet-portal",
          "/wl",
          "/auth",
          "/api/",
        ],
      },
    ],
    additionalSitemaps: [],
  },

  // Priority and change frequency per page
  transform: async (config, path) => {
    const priorities = {
      "/": 1.0,
      "/generate": 0.9,
      "/outbound": 0.9,
      "/faq": 0.8,
      "/about": 0.7,
      "/contact": 0.6,
      "/api/docs": 0.6,
    };

    const changeFrequencies = {
      "/": "weekly",
      "/generate": "monthly",
      "/outbound": "monthly",
      "/faq": "monthly",
      "/about": "monthly",
      "/contact": "yearly",
      "/api/docs": "weekly",
    };

    return {
      loc: path,
      changefreq: changeFrequencies[path] ?? "monthly",
      priority: priorities[path] ?? 0.5,
      lastmod: new Date().toISOString(),
    };
  },
};
