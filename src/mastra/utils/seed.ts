import { qdrantService, SEED_DATASET } from './qdrant-client';

export async function seed() {
  console.log('[Seed] Starting database seeding process...');
  try {
    await qdrantService.initializeCollection();
    await qdrantService.seedNotes(SEED_DATASET);
    console.log('[Seed] Seeding process finished successfully.');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
  }
}

// Allow direct execution from CLI if run as main module
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
