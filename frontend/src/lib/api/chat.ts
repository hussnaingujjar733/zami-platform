import { api } from "./client";

export async function askZami(question: string, context?: unknown) {
  return api<{ answer: string }>("/chat", {
    method: "POST",
    body: JSON.stringify({ question, context }),
  });
}
