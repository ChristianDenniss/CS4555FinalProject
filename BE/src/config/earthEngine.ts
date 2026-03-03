import { ensureInitialized } from "../modules/earthEngine/earthEngine.service";

/**
 * Initializes Earth Engine using service account credentials.
 * Call once on server start so tiles/thumbnails are ready without per-request init.
 */
export async function initializeEarthEngine(): Promise<void> {
  await ensureInitialized();
  console.log("Earth Engine initialized");
}
