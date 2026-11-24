import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const DDRAGON = "https://ddragon.leagueoflegends.com";
export const MAP_URL = `${DDRAGON}/cdn/6.8.1/img/map/map11.png`;

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

interface ChampionIndex {
  version: string;
  ids: Map<string, string>;
}

async function loadIndex(): Promise<ChampionIndex> {
  const versions = (await (await fetch(`${DDRAGON}/api/versions.json`)).json()) as string[];
  const version = versions[0];
  const body = (await (await fetch(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`)).json()) as {
    data: Record<string, { id: string; name: string }>;
  };
  const ids = new Map<string, string>();
  for (const champion of Object.values(body.data)) {
    ids.set(normalize(champion.id), champion.id);
    ids.set(normalize(champion.name), champion.id);
  }
  return { version, ids };
}

export function useDdragon() {
  const { data } = useQuery({ queryKey: ["ddragon"], queryFn: loadIndex, staleTime: Infinity });
  return useMemo(
    () => ({
      version: data?.version,
      mapUrl: data ? `${DDRAGON}/cdn/${data.version}/img/map/map11.png` : MAP_URL,
      fallbackMapUrl: MAP_URL,
      iconFor(champion: string): string | undefined {
        const id = data?.ids.get(normalize(champion));
        return data && id ? `${DDRAGON}/cdn/${data.version}/img/champion/${id}.png` : undefined;
      },
    }),
    [data],
  );
}