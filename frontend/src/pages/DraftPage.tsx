import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { ChampionPicker } from "../components/ChampionPicker";
import { saveToken } from "../lib/tokens";
import { ROLES, type Role, type Side } from "../types";

const empty = (): Record<Role, string> => ({ top: "", jungle: "", mid: "", bot: "", support: "" });

export function DraftPage() {
  const navigate = useNavigate();
  const [blue, setBlue] = useState(empty);
  const [red, setRed] = useState(empty);
  const [us, setUs] = useState<Side>("blue");
  const create = useMutation({
    mutationFn: () => api.createPlan({ blue, red, us }),
    onSuccess: (response) => {
      if (response.edit_token) saveToken("plan", response.id, response.edit_token);
      navigate(`/plan/${response.id}`);
    },
  });
  const complete = ROLES.every((role) => blue[role] && red[role]);
  const column = (side: Side, value: Record<Role, string>, set: (value: Record<Role, string>) => void) => (
    <fieldset className="flex flex-1 flex-col gap-2">
      <legend className={`mb-2 font-medium ${side === "blue" ? "text-blue-side" : "text-red-side"}`}>
        {side === "blue" ? "Blue side" : "Red side"}
      </legend>
      {ROLES.map((role) => (
        <ChampionPicker key={role} label={role} value={value[role]} onChange={(next) => set({ ...value, [role]: next })} />
      ))}
    </fieldset>
  );
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">New draft</h1>
      <div className="mt-6 flex flex-col gap-8 md:flex-row">
        {column("blue", blue, setBlue)}
        {column("red", red, setRed)}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <span className="text-sm text-zinc-400">We are</span>
        {(["blue", "red"] as Side[]).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => setUs(side)}
            className={`rounded px-3 py-1 text-sm ${us === side ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800"}`}
          >
            {side === "blue" ? "Blue" : "Red"}
          </button>
        ))}
        <button
          type="button"
          disabled={!complete || create.isPending}
          onClick={() => create.mutate()}
          className="ml-auto rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950 disabled:opacity-40"
        >
          {create.isPending ? "Building the plan..." : "Build the plan"}
        </button>
      </div>
      {create.error && <p className="mt-4 text-rose-400">{String(create.error.message)}</p>}
    </main>
  );
}