/**
 * Structured data (JSON-LD) components for SEO.
 * Render these inside <head> via layout or page server components.
 */

interface WebSiteSchemaProps {
  url?: string;
  name?: string;
  description?: string;
}

export function WebSiteSchema({
  url = "https://petborder.com",
  name = "PetBorder",
  description = "Personalised DAFF compliance timelines for bringing your pet to Australia. Know every step, deadline, and cost before you book.",
}: WebSiteSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/generate`,
      },
      "query-input": "required name=pet_travel",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PetBorder",
    url: "https://petborder.com",
    logo: "https://petborder.com/og-image.png",
    description:
      "PetBorder helps pet owners navigate Australian DAFF import and export requirements with personalised compliance timelines.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: "https://petborder.com/contact",
      availableLanguage: "English",
    },
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface SoftwareApplicationSchemaProps {
  name?: string;
  url?: string;
}

/** For the timeline generator tool — helps Google understand it's an interactive app */
export function SoftwareApplicationSchema({
  name = "PetBorder Pet Travel Planner",
  url = "https://petborder.com/generate",
}: SoftwareApplicationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    url,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
    },
    description:
      "Generate a personalised DAFF compliance timeline for bringing your dog or cat to Australia. Free in 60 seconds.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
