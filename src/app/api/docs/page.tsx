import { openApiSpec } from "@/lib/openapi-spec";
import { SwaggerUIComponent } from "./SwaggerUIComponent";

export const metadata = {
  title: "ClearPaws API Documentation",
  description: "Interactive documentation for the ClearPaws Public API",
};

export default function ApiDocsPage() {
  // Cast to satisfy SwaggerUIComponent prop type without exposing internal const typing
  const spec = openApiSpec as Record<string, unknown>;

  return (
    <main>
      <SwaggerUIComponent spec={spec} />
    </main>
  );
}
