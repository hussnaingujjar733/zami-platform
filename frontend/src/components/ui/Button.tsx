import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
};

export function Button({ children, href, variant = "primary" }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-6 py-4 text-sm font-black transition duration-300";

  const styles =
    variant === "primary"
      ? "bg-emerald-500 text-white shadow-[0_18px_55px_rgba(34,197,94,.35)] hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(34,197,94,.5)]"
      : "border border-white/15 bg-white/5 text-white hover:bg-white/10";

  if (href) {
    return (
      <Link href={href} className={`${base} ${styles}`}>
        {children}
      </Link>
    );
  }

  return <button className={`${base} ${styles}`}>{children}</button>;
}
