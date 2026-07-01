import { api } from "./client";
import type { AddressSuggestion } from "../../types/property";

export async function searchAddress(
  query: string
): Promise<AddressSuggestion[]> {
  if (query.length < 3) return [];

  return api<AddressSuggestion[]>(
    `/address/search?q=${encodeURIComponent(query)}`
  );
}
