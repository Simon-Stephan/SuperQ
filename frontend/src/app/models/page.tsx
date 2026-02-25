import type { Metadata } from "next";
import { ModelsClient, type OpenRouterModel } from "./models-client";

export const metadata: Metadata = {
  title: "Modèles — SuperQ",
  description: "Parcourir les modèles IA disponibles via OpenRouter",
};

async function fetchModels(): Promise<OpenRouterModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

export default async function ModelsPage() {
  const models = await fetchModels();
  return <ModelsClient models={models} />;
}
