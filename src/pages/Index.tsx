import NagelSchreckenberg from "@/components/NagelSchreckenberg";
import LaneReduction from "@/components/LaneReduction";
import BusTrafficSim from "@/components/BusTrafficSim";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <p className="text-primary font-display text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            CSE 442 — Explorable Explanation
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
            How to Solve Traffic
          </h1>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            For millions of Americans, the reality of their commute consists of traffic jams and
            slowdowns. Today, we explore why traffic jams occur — and what we can do to solve them.
          </p>
          <div className="mt-8 w-16 h-px bg-primary/40 mx-auto" />
        </div>
      </header>

      {/* Simulation Sections */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 space-y-24">
        {/* Section 1: Highway Traffic Flow */}
        <section className="sim-section">
          <div className="max-w-3xl mb-8">
            <span className="text-primary font-display text-xs font-semibold tracking-[0.15em] uppercase">
              Simulation 01
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-2 mb-4">
              Highway Traffic Flow
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              This simulation models realistic highway traffic inspired by the Nagel-Schreckenberg model.
              Cars accelerate, maintain safe distances, and occasionally brake randomly. Watch how
              phantom traffic jams emerge naturally from the collective behavior of individual drivers.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              The model captures key aspects of highway traffic: cars accelerate toward a maximum speed,
              slow down to avoid collisions, and occasionally brake randomly. This simple set of rules
              produces emergent traffic phenomena including stop-and-go waves, demonstrating that traffic
              jams don't always require an external cause.
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <NagelSchreckenberg />
            </div>
          </div>
        </section>

        {/* Section 2: Lane Reduction */}
        <section className="sim-section">
          <div className="max-w-3xl mb-8">
            <span className="text-primary font-display text-xs font-semibold tracking-[0.15em] uppercase">
              Simulation 02
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-2 mb-4">
              Lane Reduction Bottlenecks
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              This simulation shows realistic traffic flow through a lane reduction bottleneck.
              When cars merge, they may briefly slow down, creating a ripple effect that affects all lanes.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Watch how traffic flows slowly but steadily through the bottleneck. Cars inch forward
              while waiting for gaps, and recently-merged cars slow down briefly, delaying the cars
              immediately behind them.
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <LaneReduction />
            </div>
          </div>
        </section>

        {/* Section 3: Bus Traffic */}
        <section className="sim-section">
          <div className="max-w-3xl mb-8">
            <span className="text-primary font-display text-xs font-semibold tracking-[0.15em] uppercase">
              Simulation 03
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-2 mb-4">
              Bus vs Car: Space Efficiency
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Buses slow down traffic due to their larger size and slower speed. However, when more
              people use buses, fewer vehicles are on the road, and each person consumes less road space.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              This simulation compares road space efficiency between cars and buses. According to the
              National Household Travel Survey, cars typically carry ~1.5 people each. Because buses
              move far more people using less road space, a dedicated bus lane allows them to bypass
              congestion, making transit faster and more reliable.
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <BusTrafficSim />
            </div>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="sim-section text-center py-12">
          <div className="inline-block px-3 py-1 rounded-full bg-secondary border border-border mb-4">
            <span className="text-muted-foreground text-sm font-display">Coming Soon</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">
            Autonomous Vehicle Solutions
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Explore how self-driving cars could reshape traffic flow, reduce congestion,
            and improve highway efficiency.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-muted-foreground text-sm">
          CSE 442 — Interactive Explorable Explanation
        </div>
      </footer>
    </div>
  );
};

export default Index;
