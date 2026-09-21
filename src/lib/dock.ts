// Copy and entries for the dock: the toggle, the tech stack sheet and the link back to the
// author's site. Each stack entry names the ADR that records the decision, where there is one.

import { REPOSITORY_URL } from "./site";

export type StackEntry = {
  layer: string;
  choice: string;
  logo: string | null;
  why: string;
  adr: string | null;
};

export const ADR_BASE = `${REPOSITORY_URL}/blob/main/docs/adr`;

export const DOCK = {
  toggleLabel: "Explore more",
  toggleTip: "Explore more.",
  stackLabel: "Open the tech stack",
  stackTip: "Program's tech stack.",
  stackEyebrow: "Decisions, not defaults",
  stackHeading: "What Querated runs on",
  close: "Close",
  siteLabel: "David Koen's portfolio",
  siteTip: "Back to my site.",
  siteHref: "https://davidkoen.is-a.dev",
} as const;

export const STACK: readonly StackEntry[] = [
  {
    layer: "Framework",
    choice: "Next.js",
    logo: "/stack/nextdotjs.svg",
    why: "The page and the API ship as one app. The studio is rendered on the server, and the GraphQL endpoint is a route handler beside it, so there is one deploy and one origin.",
    adr: "0001-nextjs-with-graphql-yoga-in-a-route-handler",
  },
  {
    layer: "API",
    choice: "GraphQL Yoga",
    logo: "/stack/graphql.svg",
    why: "One endpoint, and a response that carries only the fields the query asks for. The schema's descriptions are its documentation, and every query the studio can build is validated against it in tests.",
    adr: "0001-nextjs-with-graphql-yoga-in-a-route-handler",
  },
  {
    layer: "Data loading",
    choice: "DataLoader",
    logo: null,
    why: "Twelve works by the same artist cost one artist search, not twelve. A loader per request removes repeated calls, and a shared cache answers repeat visits without calling the Met at all.",
    adr: "0004-request-scoped-dataloader-over-shared-cache",
  },
  {
    layer: "Security",
    choice: "GraphQL Armor",
    logo: null,
    why: "Depth, alias, token and cost limits refuse an expensive query before it runs, so a single request can never fan out into thousands of Met calls. A nonce-based Content Security Policy guards the page.",
    adr: "0005-query-hardening-before-execution",
  },
  {
    layer: "Motion",
    choice: "GSAP",
    logo: "/stack/gsap.svg",
    why: "Flies each token of the query along a curved path into the gallery, then builds the cards in. Everything is skipped when the visitor prefers reduced motion.",
    adr: "0007-gsap-for-choreography-three-js-for-the-beam",
  },
  {
    layer: "3D",
    choice: "Three.js",
    logo: "/stack/threedotjs.svg",
    why: "Draws the particle beam that crosses the divider on send. It loads only after the page is idle, in its own chunk, so it never delays the first paint.",
    adr: "0007-gsap-for-choreography-three-js-for-the-beam",
  },
  {
    layer: "Styling",
    choice: "Tailwind CSS",
    logo: "/stack/tailwindcss.svg",
    why: "The styling framework I build with. Its theme holds the two palettes, ink for the studio and wall for the gallery, and the syntax colours shared by the query and the cards.",
    adr: null,
  },
  {
    layer: "Hosting",
    choice: "Vercel",
    logo: "/stack/vercel.svg",
    why: "Builds Next.js natively, so production runs exactly what the build produced. Every pull request gets its own preview, and no deploy token lives in GitHub.",
    adr: "0008-vercel-through-its-git-integration",
  },
  {
    layer: "Language",
    choice: "TypeScript",
    logo: "/stack/typescript.svg",
    why: "Everything here is written in TypeScript, from the Met's untrusted records through the resolvers to the cards, so a change to a shape fails the build rather than the page.",
    adr: null,
  },
  {
    layer: "Quality gates",
    choice: "Automated checks",
    logo: "/stack/lighthouse.svg",
    why: "Every pull request runs CI before it can merge: type checks, lint, tests, a production build, a Lighthouse audit, and a budget that fails the build if the initial JavaScript grows past 210 KB.",
    adr: "0002-github-flow",
  },
];
