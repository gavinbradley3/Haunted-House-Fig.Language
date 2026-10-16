/**
 * Is this a build the automated checks may drive? True in `npm run dev` and in the test build
 * (`npm run build:test`, which sets VITE_TEST_HOOK). False in the classroom build (`npm run build`),
 * where Vite replaces these values at build time and the test-only code is left out entirely.
 */
export const TEST_BUILD: boolean = import.meta.env.DEV || import.meta.env.VITE_TEST_HOOK === 'true';
