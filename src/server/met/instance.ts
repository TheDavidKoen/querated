import "server-only";
import { createMetClient } from "./client";

// One client per server instance, so the cache and the concurrency limit are shared by every
// request that instance serves.
export const met = createMetClient();
