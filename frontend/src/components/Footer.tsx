export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface/60">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 py-6 text-xs leading-relaxed text-ink-muted sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-ink-secondary">
          <span>Throughline · Pro Draft Planning &amp; Macro Debrief</span>
          <span>Tactical Warroom Design System v1.0</span>
        </div>
        <p>
          Throughline isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or
          anyone officially involved in producing or managing Riot Games properties. Riot Games, and all
          associated properties are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
}