/** Shared coverage globs for RNF04 (75% backend / 25% frontend). */

export const backendCoverageInclude = [
  "src/app/api/**/*.ts",
  "src/repositories/**/*.ts",
  "src/services/**/*.ts",
  "src/lib/**/*.ts",
  "src/types/**/*.ts",
  "src/middleware.ts",
];

/** Client helpers + UI shell/pages used by the Next.js frontend. */
export const frontendCoverageInclude = [
  "src/lib/client/**/*.ts",
  "src/components/**/*.{ts,tsx}",
  "src/app/login/page.tsx",
  "src/app/(app)/**/page.tsx",
  "src/app/page.tsx",
];
