/**
 * Which kind of build this is. Vite replaces these values at build time, so code behind a false flag
 * is left out of that build.
 *
 *  - Student build (`npm run build`, dist/): what students play on their Chromebooks. No test hook,
 *    no teacher panel, graphics locked to Low.
 *  - Teacher build (`npm run build:teacher`, dist-teacher/): the same game plus the teacher panel (T),
 *    for projecting and for recovering a student's game. Graphics still locked to Low.
 *  - Test build (`npm run build:test`, dist-test/) and `npm run dev`: everything, including the
 *    test hook and the Balanced and High graphics presets.
 */

/** May automated checks drive this build (window.__hosl)? Dev and the test build only. */
export const TEST_BUILD: boolean = import.meta.env.DEV || import.meta.env.VITE_TEST_HOOK === 'true';

/** Does this build include the teacher panel? Never the student build. */
export const TEACHER_BUILD: boolean = TEST_BUILD || import.meta.env.MODE === 'teacher';

/** Graphics presets above Low (development and testing only; students always play on Low). */
export const DEV_GRAPHICS: boolean = TEST_BUILD;
