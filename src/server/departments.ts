import "server-only";
import { met } from "./met/instance";
import type { Department } from "./met/types";
import { TraceRecorder } from "./trace-recorder";

export async function loadDepartments(): Promise<Department[]> {
  try {
    return await met.departments(new TraceRecorder());
  } catch {
    return [];
  }
}
