// Old addresses kept alive: the READMEs and earlier links point at them.
export const REDIRECTS: { source: string; destination: string; permanent: true }[] = [
  { source: "/projets", destination: "/#projets", permanent: true },
  { source: "/towns/:code", destination: "/demo/:code", permanent: true },
];
