type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionTitle({ eyebrow, title, subtitle }: SectionTitleProps) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      {eyebrow && (
        <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-emerald-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-lg leading-8 text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}
