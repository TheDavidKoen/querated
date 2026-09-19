export const SITE_NAME = "Querated";
export const SITE_TITLE = "Ask the Met in Querated";
export const SITE_DESCRIPTION =
  "Hunt for art in the Met's open collection. Querated writes a GraphQL query as you choose, flies it across the screen and builds a gallery in its exact shape, with every upstream call and byte accounted for.";
export const REPOSITORY_URL = "https://github.com/TheDavidKoen/querated";

export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return new URL(`https://${production}`);
  return new URL("http://localhost:3000");
}
