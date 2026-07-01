import { api } from "./client";
import type { EstimateResponse } from "../../types/property";

export async function getEstimate(address: string, surface?: number, propertyType?: string) {
  return api<EstimateResponse>("/estimate", {
    method: "POST",
    body: JSON.stringify({ address, surface, propertyType }),
  });
}
