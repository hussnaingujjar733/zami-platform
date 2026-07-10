"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeEuro,
  Building2,
  CalendarDays,
  Check,
  Download,
  FileCheck2,
  Gauge,
  Home,
  Leaf,
  LoaderCircle,
  MapPin,
  Printer,
  Ruler,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/client";

type Project = {
  id: string;
  address?: string | null;
  city?: string | null;
  surface?: number | null;
  property_type?: string | null;
  construction_year?: number | null;
  heating?: string | null;
  dpe?: string | null;
  target_dpe?: string | null;
  estimated_cost?: number | null;
  subsidies?: number | null;
  net_cost?: number | null;
  yearly_savings?: number | null;
  confidence?: number | null;
  recommendations?: unknown;
  created_at?: string | null;
};

type Recommendation = {
  title: string;
  description: string;
  cost: string;
  savings: string;
  priority: string;
};

const fallbackRecommendations: Recommendation[] = [
  {
    title: "External wall insulation",
    description:
      "Improve thermal performance and reduce heat loss through the building envelope.",
    cost: "€12,500",
    savings: "18–24%",
    priority: "High",
  },
  {
    title: "Heat pump installation",
    description:
      "Replace the existing heating system with an efficient renewable solution.",
    cost: "€11,200",
    savings: "25–32%",
    priority: "High",
  },
  {
    title: "Roof insulation",
    description:
      "Limit heat loss through the roof and improve winter and summer comfort.",
    cost: "€5,100",
    savings: "10–15%",
    priority: "Medium",
  },
  {
    title: "Double-flow ventilation",
    description:
      "Improve indoor-air quality while recovering heat from extracted air.",
    cost: "€2,700",
    savings: "6–9%",
    priority: "Medium",
  },
];

const grades = ["A", "B", "C", "D", "E", "F", "G"];

export function ProjectReport() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to access this report.");
        setLoading(false);
        return;
      }

      const projectId = new URLSearchParams(
        window.location.search,
      ).get("project");

      let query = supabase.from("projects").select("*");

      if (projectId) {
        const { data, error: projectError } = await query
          .eq("id", projectId)
          .single();

        if (projectError) {
          setError(projectError.message);
        } else {
          setProject(data as Project);
        }
      } else {
        const { data, error: projectError } = await query
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (projectError) {
          setError(projectError.message);
        } else if (!data) {
          setError("No saved project is available.");
        } else {
          setProject(data as Project);
        }
      }

      setLoading(false);
    }

    void loadReport();
  }, []);

  const financials = useMemo(() => {
    if (!project) return null;

    const total = Number(project.estimated_cost || 0);
    const subsidies = Number(project.subsidies || 0);
    const net =
      project.net_cost !== null && project.net_cost !== undefined
        ? Number(project.net_cost)
        : Math.max(total - subsidies, 0);

    const savings = Number(project.yearly_savings || 0);
    const payback = savings > 0 ? (net / savings).toFixed(1) : "—";

    return {
      total,
      subsidies,
      net,
      savings,
      payback,
    };
  }, [project]);

  if (loading) {
    return (
      <main className="zv2-report-state">
        <LoaderCircle className="zv2-report-spinner" size={38} />
        <h1>Preparing your report</h1>
        <p>Loading the renovation analysis and financial projections...</p>
      </main>
    );
  }

  if (error || !project || !financials) {
    return (
      <main className="zv2-report-state">
        <ShieldCheck size={38} />
        <h1>Report unavailable</h1>
        <p>{error || "The requested report could not be loaded."}</p>

        <Link href="/dashboard">
          <ArrowLeft size={17} />
          Return to dashboard
        </Link>
      </main>
    );
  }

  const currentDpe = normaliseDpe(project.dpe, "E");
  const targetDpe = normaliseDpe(project.target_dpe, "B");
  const recommendations = parseRecommendations(project.recommendations);

  return (
    <main className="zv2-report-page">
      <header className="zv2-report-toolbar zv2-no-print">
        <Link href={`/projects/${project.id}`}>
          <ArrowLeft size={17} />
          Project
        </Link>

        <div className="zv2-report-toolbar-logo">
          <span>
            <Leaf size={17} />
          </span>
          ZAMI Report
        </div>

        <div>
          <button type="button" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </button>

          <button
            type="button"
            className="is-primary"
            onClick={() => window.print()}
          >
            <Download size={16} />
            Save as PDF
          </button>
        </div>
      </header>

      <article className="zv2-report-document">
        <section className="zv2-report-cover">
          <div className="zv2-report-brand">
            <span>
              <Leaf size={26} />
            </span>

            <div>
              <strong>ZAMI</strong>
              <small>RENOVATION INTELLIGENCE</small>
            </div>
          </div>

          <div className="zv2-report-cover-copy">
            <span>AI renovation and energy report</span>

            <h1>
              Your personalised
              <strong> renovation roadmap.</strong>
            </h1>

            <p>
              A preliminary analysis of renovation costs, energy-performance
              improvement and potential financial support.
            </p>
          </div>

          <div className="zv2-report-property-box">
            <div>
              <MapPin size={18} />

              <span>
                <small>Property address</small>
                <strong>
                  {project.address || "Address not provided"}
                </strong>
              </span>
            </div>

            <div>
              <CalendarDays size={18} />

              <span>
                <small>Report date</small>
                <strong>{formatDate(new Date().toISOString())}</strong>
              </span>
            </div>

            <div>
              <FileCheck2 size={18} />

              <span>
                <small>Report reference</small>
                <strong>ZAMI-{project.id.slice(0, 8).toUpperCase()}</strong>
              </span>
            </div>
          </div>

          <div className="zv2-report-cover-footer">
            <span>Generated using ZAMI AI estimation technology</span>
            <strong>Confidential homeowner report</strong>
          </div>
        </section>

        <section className="zv2-report-section">
          <ReportHeading
            number="01"
            kicker="Executive summary"
            title="Your renovation at a glance"
          />

          <div className="zv2-report-summary-grid">
            <ReportMetric
              icon={<WalletCards size={20} />}
              label="Estimated budget"
              value={formatEuro(financials.total)}
              detail="Before grants and subsidies"
            />

            <ReportMetric
              icon={<TrendingDown size={20} />}
              label="Annual savings"
              value={formatEuro(financials.savings)}
              detail="Potential energy-bill reduction"
            />

            <ReportMetric
              icon={<BadgeEuro size={20} />}
              label="Potential support"
              value={formatEuro(financials.subsidies)}
              detail="Subject to final eligibility"
            />

            <ReportMetric
              icon={<Sparkles size={20} />}
              label="AI confidence"
              value={`${Math.round(Number(project.confidence || 87))}%`}
              detail="Preliminary estimate confidence"
            />
          </div>

          <div className="zv2-report-highlight">
            <div>
              <Leaf size={25} />
            </div>

            <div>
              <span>ZAMI assessment</span>
              <h3>
                This property shows meaningful potential for energy and comfort
                improvements.
              </h3>

              <p>
                The recommended renovation sequence prioritises insulation
                before heating-system replacement to improve overall efficiency
                and equipment sizing.
              </p>
            </div>

            <strong>{currentDpe} → {targetDpe}</strong>
          </div>
        </section>

        <section className="zv2-report-section">
          <ReportHeading
            number="02"
            kicker="Property information"
            title="Property profile"
          />

          <div className="zv2-report-property-grid">
            <ReportFact
              icon={<Home size={18} />}
              label="Property type"
              value={project.property_type || "Residential property"}
            />

            <ReportFact
              icon={<Ruler size={18} />}
              label="Living surface"
              value={project.surface ? `${project.surface} m²` : "Not provided"}
            />

            <ReportFact
              icon={<Building2 size={18} />}
              label="Construction year"
              value={
                project.construction_year
                  ? String(project.construction_year)
                  : "Not provided"
              }
            />

            <ReportFact
              icon={<Gauge size={18} />}
              label="Current heating"
              value={project.heating || "Not provided"}
            />
          </div>
        </section>

        <section className="zv2-report-section">
          <ReportHeading
            number="03"
            kicker="Energy performance"
            title="Projected DPE improvement"
          />

          <div className="zv2-report-dpe-header">
            <div>
              <span>Current energy grade</span>
              <strong className={`report-grade-${currentDpe.toLowerCase()}`}>
                {currentDpe}
              </strong>
            </div>

            <div className="zv2-report-dpe-change">
              <span>Estimated improvement</span>
              <strong>3 classes</strong>
            </div>

            <div>
              <span>Target energy grade</span>
              <strong className={`report-grade-${targetDpe.toLowerCase()}`}>
                {targetDpe}
              </strong>
            </div>
          </div>

          <div className="zv2-report-dpe-scale">
            {grades.map((grade) => (
              <div
                key={grade}
                className={`
                  report-grade-${grade.toLowerCase()}
                  ${grade === currentDpe ? "is-current" : ""}
                  ${grade === targetDpe ? "is-target" : ""}
                `}
              >
                <strong>{grade}</strong>

                {grade === currentDpe && <span>Current</span>}
                {grade === targetDpe && <span>Target</span>}
              </div>
            ))}
          </div>

          <div className="zv2-report-energy-note">
            <Check size={17} />

            <p>
              The target grade is a preliminary projection. Final performance
              depends on detailed technical design, materials, installation
              quality and an official post-renovation assessment.
            </p>
          </div>
        </section>

        <section className="zv2-report-section">
          <ReportHeading
            number="04"
            kicker="Financial analysis"
            title="Investment breakdown"
          />

          <div className="zv2-report-finance-grid">
            <div className="zv2-report-finance-table">
              <FinanceRow
                label="Estimated renovation works"
                value={formatEuro(financials.total)}
              />

              <FinanceRow
                label="Potential grants and subsidies"
                value={`− ${formatEuro(financials.subsidies)}`}
                highlight
              />

              <FinanceRow
                label="Estimated net investment"
                value={formatEuro(financials.net)}
                total
              />

              <FinanceRow
                label="Potential yearly energy savings"
                value={formatEuro(financials.savings)}
              />

              <FinanceRow
                label="Estimated payback period"
                value={
                  financials.payback === "—"
                    ? "Not available"
                    : `${financials.payback} years`
                }
              />
            </div>

            <div className="zv2-report-budget-chart">
              <div className="zv2-report-donut">
                <div>
                  <span>Net cost</span>
                  <strong>{formatEuro(financials.net)}</strong>
                </div>
              </div>

              <div>
                <p>
                  <i className="budget-insulation" />
                  <span>Insulation</span>
                  <strong>40%</strong>
                </p>

                <p>
                  <i className="budget-heating" />
                  <span>Heating system</span>
                  <strong>35%</strong>
                </p>

                <p>
                  <i className="budget-ventilation" />
                  <span>Ventilation</span>
                  <strong>10%</strong>
                </p>

                <p>
                  <i className="budget-other" />
                  <span>Other works</span>
                  <strong>15%</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="zv2-report-section">
          <ReportHeading
            number="05"
            kicker="Recommended actions"
            title="Renovation roadmap"
          />

          <div className="zv2-report-recommendations">
            {recommendations.map((recommendation, index) => (
              <article key={`${recommendation.title}-${index}`}>
                <div className="zv2-report-recommendation-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div>
                  <div className="zv2-report-recommendation-heading">
                    <h3>{recommendation.title}</h3>

                    <span
                      className={
                        recommendation.priority
                          .toLowerCase()
                          .includes("high")
                          ? "is-high"
                          : "is-medium"
                      }
                    >
                      {recommendation.priority} priority
                    </span>
                  </div>

                  <p>{recommendation.description}</p>

                  <div className="zv2-report-recommendation-metrics">
                    <span>
                      Potential savings
                      <strong>{recommendation.savings}</strong>
                    </span>

                    <span>
                      Estimated cost
                      <strong>{recommendation.cost}</strong>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="zv2-report-section">
          <ReportHeading
            number="06"
            kicker="Recommended process"
            title="Next steps"
          />

          <div className="zv2-report-next-steps">
            <NextStep
              number="01"
              title="Validate the renovation scope"
              description="Review the priorities and identify which measures should form the first renovation phase."
            />

            <NextStep
              number="02"
              title="Request a professional energy audit"
              description="Confirm assumptions and technical requirements with a qualified energy professional."
            />

            <NextStep
              number="03"
              title="Compare RGE contractor quotations"
              description="Request detailed quotations with materials, labour, timing and warranty information."
            />

            <NextStep
              number="04"
              title="Confirm subsidy eligibility"
              description="Validate financial-support eligibility before signing quotations or starting work."
            />
          </div>
        </section>

        <section className="zv2-report-disclaimer">
          <ShieldCheck size={24} />

          <div>
            <h3>Important information</h3>

            <p>
              This document provides a preliminary digital estimate and does
              not replace an official DPE, energy audit, technical study,
              contractor quotation or government subsidy decision. Final costs
              and performance may vary according to property condition,
              technical constraints, material choices and market prices.
            </p>
          </div>
        </section>

        <footer className="zv2-report-footer">
          <div>
            <strong>ZAMI</strong>
            <span>AI-powered renovation intelligence</span>
          </div>

          <p>
            Report reference: ZAMI-{project.id.slice(0, 8).toUpperCase()}
          </p>

          <p>{formatDate(new Date().toISOString())}</p>
        </footer>
      </article>
    </main>
  );
}

function ReportHeading({
  number,
  kicker,
  title,
}: {
  number: string;
  kicker: string;
  title: string;
}) {
  return (
    <div className="zv2-report-heading">
      <span>{number}</span>

      <div>
        <small>{kicker}</small>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function ReportMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="zv2-report-metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ReportFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article>
      <div>{icon}</div>

      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </article>
  );
}

function FinanceRow({
  label,
  value,
  highlight,
  total,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  total?: boolean;
}) {
  return (
    <div
      className={`
        zv2-report-finance-row
        ${highlight ? "is-highlighted" : ""}
        ${total ? "is-total" : ""}
      `}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NextStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article>
      <span>{number}</span>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  );
}

function parseRecommendations(value: unknown): Recommendation[] {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return fallbackRecommendations;
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return fallbackRecommendations;
  }

  const recommendations = parsed
    .slice(0, 4)
    .map((item, index): Recommendation | null => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const fallback = fallbackRecommendations[index];

      return {
        title: String(record.title || record.name || fallback.title),
        description: String(
          record.description ||
            record.detail ||
            record.reason ||
            fallback.description,
        ),
        cost: String(record.cost || record.estimated_cost || fallback.cost),
        savings: String(
          record.savings || record.energy_savings || fallback.savings,
        ),
        priority: String(record.priority || fallback.priority),
      };
    })
    .filter((item): item is Recommendation => item !== null);

  return recommendations.length ? recommendations : fallbackRecommendations;
}

function normaliseDpe(value: string | null | undefined, fallback: string) {
  const grade = value?.trim().toUpperCase();
  return grade && /^[A-G]$/.test(grade) ? grade : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("en-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
