import { parseCatalogue, type Catalogue } from '@sant-vaani/core';

import sample from './sample-catalogue.json';

/**
 * Sample content for tests and screenshots (scripts/screens.mjs serves the
 * same file). The saints are made up. Answer 5 runs 7 minutes in all:
 * 150 + 150 + 120 seconds of clips.
 */
export const sampleCatalogue: Catalogue = parseCatalogue(sample);

/**
 * 28 October 2026, 6:40 in the morning wherever the test runs. Its day
 * number is 20754, so Today shows the fifth answer (by id) and the first
 * daily verse.
 */
export const TEST_MORNING = new Date(2026, 9, 28, 6, 40);
