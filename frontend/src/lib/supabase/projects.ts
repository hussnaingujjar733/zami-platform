import { supabase } from "./client";
import type { EstimateResponse } from "../../types/property";

export async function saveProject(estimate: EstimateResponse) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "not_logged_in" };

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    address: estimate.address,
    surface: estimate.surface,
    dpe: estimate.dpe,
    target_dpe: estimate.targetDpe,
    estimated_cost: estimate.estimatedCost,
    subsidies: estimate.subsidies,
    net_cost: estimate.netCost,
    yearly_savings: estimate.yearlySavings,
    confidence: estimate.confidence,
    source: estimate.source,
    note: estimate.note,
    recommendations: estimate.recommendations,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getMyProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}
