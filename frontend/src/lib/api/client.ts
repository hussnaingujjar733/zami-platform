const API_URL = "/api/backend";

export async function api<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(API_URL + path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error("API Error");
  }

  return response.json();
}
