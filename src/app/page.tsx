import { connection } from "next/server";
import { Studio } from "@/components/Studio";
import { REPOSITORY_URL, SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import { loadDepartments } from "@/server/departments";

export default async function Home() {
  await connection();
  const departments = await loadDepartments();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteUrl().toString(),
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Person", name: "David Koen", url: "https://github.com/TheDavidKoen" },
    sameAs: [REPOSITORY_URL],
  };

  return (
    <>
      <main>
        <Studio departments={departments} />
      </main>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD with "<" escaped, per the Next.js JSON-LD guide
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
