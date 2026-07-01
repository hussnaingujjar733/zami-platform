import PremiumCard from "../effects/PremiumCard";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <PremiumCard className="h-full">
      <div
        className={`h-full rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl transition-all duration-500 hover:border-emerald-400/40 ${className}`}
      >
        {children}
      </div>
    </PremiumCard>
  );
}
