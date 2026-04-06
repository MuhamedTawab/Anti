import { ArrowUpRight } from "lucide-react";

import { roadmap } from "@/lib/product-roadmap";

export function RoadmapCard() {
  return (
    <section className="h-full overflow-y-auto rounded-[32px] border border-white/10 bg-panel/90 p-6 shadow-panel backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl uppercase tracking-[0.08em]">Build Roadmap</p>
          <p className="text-sm text-white/45">The path from concept shell to real-time platform.</p>
        </div>
        <ArrowUpRight className="text-ember" size={20} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {roadmap.map((stage, index) => (
          <div key={stage.title} className="rounded-3xl border border-white/10 bg-steel p-4">
            <p className="mb-1 text-xs uppercase tracking-[0.25em] text-white/35">0{index + 1}</p>
            <p className="mb-3 font-semibold uppercase tracking-[0.08em] text-white">{stage.title}</p>
            <div className="space-y-3 text-sm leading-6 text-white/68">
              {stage.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
