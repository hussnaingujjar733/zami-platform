"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Flame,
  Gauge,
  Home,
  Leaf,
  LoaderCircle,
  MapPin,
  Ruler,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  TrendingDown,
  WalletCards,
  Wind,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
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
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
      "Improve the building envelope and reduce heat loss through external walls.",
    cost: "€12,500",
    savings: "18–24%",
    priority: "High",
  },
  {
    title: "Heat pump installation",
    description:
      "Replace the existing heating system with a more efficient renewable solution.",
    cost: "€11,200",
    savings: "25–32%",
    priority: "High",
  },
  {
    title: "Roof insulation",
    description:
      "Reduce thermal losses through the roof and improve indoor comfort.",
    cost: "€5,100",
    savings: "10–15%",
    priority: "Medium",
  },
  {
    title: "Double-flow ventilation",
    description:
      "Improve air quality while recovering heat from extracted indoor air.",
    cost: "€2,700",
    savings: "6–9%",
    priority: "Medium",
  },
];

const recommendationIcons: LucideIcon[] = [
  ThermometerSun,
  Flame,
  Home,
  Wind,
];

const dpeGrades = ["A", "B", "C", "D", "E", "F", "G"];

export function ProjectDetail() {
  const params = useParams();

  const projectId = Array.isArray(params.id)
    ? params.id[0]
    : String(params.id || "");

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProject() {
      if (!projectId) {
        setError("Project ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to view this project.");
        setLoading(false);
        return;
      }

      const { data, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        setError(projectError.message);
        setProject(null);
      } else {
        setProject(data as Project);
      }

      setLoading(false);
    }

    void loadProject();
  }, [projectId]);

  const calculations = useMemo(() => {
    if (!project) return null;

    const total = Number(project.estimated_cost || 0);
    const subsidies = Number(project.subsidies || 0);

    const netCost =
      project.net_cost !== null &&
      project.net_cost !== undefined
        ? Number(project.net_cost)
        : Math.max(total - subsidies, 0);

    const yearlySavings = Number(project.yearly_savings || 0);

    const payback =
      yearlySavings > 0
        ? Math.max(netCost / yearlySavings, 0).toFixed(1)
        : "—";

    return {
      total,
      subsidies,
      netCost,
      yearlySavings,
      payback,
    };
  }, [project]);

  if (loading) {
    return (
      <main className="zv2-detail-state">
        <LoaderCircle className="zv2-detail-spinner" size={38} />
        <h1>Loading project</h1>
        <p>Retrieving your renovation analysis from ZAMI...</p>
      </main>
    );
  }

  if (error || !project || !calculations) {
    return (
      <main className="zv2-detail-state">
        <ShieldCheck size={38} />
        <h1>Project unavailable</h1>
        <p>{error || "This project could not be found."}</p>

        <Link href="/dashboard">
          <ArrowLeft size={17} />
          Return to dashboard
        </Link>
      </main>
    );
  }

  const currentDpe = normaliseDpe(project.dpe, "E");
  const targetDpe = normaliseDpe(project.target_dpe, "B");
  const progress = calculateProgress(project);
  const recommendations = parseRecommendations(project.recommendations);

  return (
    <main className="zv2-detail-page">
      <header className="zv2-detail-topbar">
        <Link href="/dashboard" className="zv2-detail-back">
          <ArrowLeft size={17} />
          My projects
        </Link>

        <Link href="/" className="zv2-detail-logo">
          <span>
            <Leaf size={18} />
          </span>
          ZAMI
        </Link>

        <div className="zv2-detail-actions">
          <Link href={`/report?project=${project.id}`}>
            <FileText size={16} />
            Report
          </Link>

          <Link
            href={`/estimate?project=${project.id}`}
            className="is-primary"
          >
            Update estimate
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="zv2-detail-hero">
        <div>
          <div className="zv2-detail-status">
            <Check size={14} />
            Estimate ready
          </div>

          <span className="zv2-detail-kicker">
            Renovation project
          </span>

          <h1>{projectTitle(project.address)}</h1>

          <p>
            <MapPin size={15} />
            {project.address || "Property address unavailable"}
          </p>
        </div>

        <ProjectProgress progress={progress} />
      </section>

      <section className="zv2-detail-metrics">
        <DetailMetric
          icon={WalletCards}
          label="Renovation budget"
          value={formatEuro(calculations.total)}
          detail="Estimated cost before support"
        />

        <DetailMetric
          icon={TrendingDown}
          label="Annual savings"
          value={formatEuro(calculations.yearlySavings)}
          detail="Potential energy-bill reduction"
        />

        <DetailMetric
          icon={CircleDollarSign}
          label="Payback period"
          value={
            calculations.payback === "—"
              ? "Not available"
              : `${calculations.payback} years`
          }
          detail="Based on estimated net investment"
        />

        <DetailMetric
          icon={Sparkles}
          label="AI confidence"
          value={`${Math.round(Number(project.confidence || 87))}%`}
          detail="Estimate confidence level"
        />
      </section>

      <section className="zv2-detail-main-grid">
        <div className="zv2-detail-main-column">
          <article className="zv2-detail-card zv2-detail-energy">
            <CardTitle
              icon={Gauge}
              kicker="Energy performance"
              title="DPE improvement"
            />

            <div className="zv2-detail-dpe-summary">
              <div>
                <span>Current</span>
                <strong className={`grade-text-${currentDpe.toLowerCase()}`}>
                  {currentDpe}
                </strong>
              </div>

              <div className="zv2-detail-dpe-arrow">
                <ArrowRight size={27} />
                <span>After renovation</span>
              </div>

              <div>
                <span>Target</span>
                <strong className={`grade-text-${targetDpe.toLowerCase()}`}>
                  {targetDpe}
                </strong>
              </div>
            </div>

            <div className="zv2-detail-dpe-scale">
              {dpeGrades.map((grade) => (
                <div
                  key={grade}
                  className={`
                    grade-${grade.toLowerCase()}
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

            <div className="zv2-detail-energy-insight">
              <Leaf size={18} />

              <div>
                <span>Estimated improvement</span>
                <strong>
                  Moving from DPE {currentDpe} to {targetDpe} may significantly
                  reduce energy consumption.
                </strong>
              </div>

              <p>−48%</p>
            </div>
          </article>

          <article className="zv2-detail-card">
            <CardTitle
              icon={Sparkles}
              kicker="AI roadmap"
              title="Recommended renovation actions"
            />

            <div className="zv2-detail-recommendations">
              {recommendations.map((recommendation, index) => {
                const Icon =
                  recommendationIcons[
                    index % recommendationIcons.length
                  ];

                return (
                  <article
                    key={`${recommendation.title}-${index}`}
                    className="zv2-detail-recommendation"
                  >
                    <div className="zv2-detail-recommendation-icon">
                      <Icon size={21} />
                    </div>

                    <div className="zv2-detail-recommendation-content">
                      <div>
                        <span>
                          Recommendation{" "}
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <strong
                          className={
                            recommendation.priority
                              .toLowerCase()
                              .includes("high")
                              ? "priority-high"
                              : "priority-medium"
                          }
                        >
                          {recommendation.priority} priority
                        </strong>
                      </div>

                      <h3>{recommendation.title}</h3>
                      <p>{recommendation.description}</p>

                      <div className="zv2-detail-recommendation-data">
                        <span>
                          <TrendingDown size={14} />
                          Savings
                          <strong>{recommendation.savings}</strong>
                        </span>

                        <span>
                          <BadgeEuro size={14} />
                          Cost
                          <strong>{recommendation.cost}</strong>
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={18} />
                  </article>
                );
              })}
            </div>
          </article>
        </div>

        <aside className="zv2-detail-side-column">
          <article className="zv2-detail-card">
            <CardTitle
              icon={BadgeEuro}
              kicker="Financial plan"
              title="Investment breakdown"
            />

            <div className="zv2-detail-donut-wrap">
              <div className="zv2-detail-donut">
                <div>
                  <span>Net cost</span>
                  <strong>{formatEuro(calculations.netCost)}</strong>
                </div>
              </div>
            </div>

            <div className="zv2-detail-finance-list">
              <FinanceRow
                label="Estimated works"
                value={formatEuro(calculations.total)}
              />

              <FinanceRow
                label="Potential subsidies"
                value={`− ${formatEuro(calculations.subsidies)}`}
                highlight
              />

              <FinanceRow
                label="Estimated net investment"
                value={formatEuro(calculations.netCost)}
                total
              />
            </div>
          </article>

          <article className="zv2-detail-card">
            <CardTitle
              icon={Home}
              kicker="Property details"
              title="Property overview"
            />

            <div className="zv2-detail-property-list">
              <PropertyFact
                icon={Ruler}
                label="Living surface"
                value={
                  project.surface
                    ? `${project.surface} m²`
                    : "Not provided"
                }
              />

              <PropertyFact
                icon={Home}
                label="Property type"
                value={project.property_type || "Residential property"}
              />

              <PropertyFact
                icon={CalendarDays}
                label="Construction year"
                value={
                  project.construction_year
                    ? String(project.construction_year)
                    : "Not provided"
                }
              />

              <PropertyFact
                icon={Flame}
                label="Heating system"
                value={project.heating || "Not provided"}
              />
            </div>
          </article>

          <article className="zv2-detail-card">
            <CardTitle
              icon={ShieldCheck}
              kicker="Next steps"
              title="Project preparation"
            />

            <div className="zv2-detail-timeline">
              <TimelineItem
                number="01"
                title="AI estimate"
                detail="Renovation analysis generated"
                complete
              />

              <TimelineItem
                number="02"
                title="Review recommendations"
                detail="Validate scope and priorities"
                complete={progress >= 45}
              />

              <TimelineItem
                number="03"
                title="Download report"
                detail="Prepare contractor consultation"
                complete={progress >= 60}
              />

              <TimelineItem
                number="04"
                title="Compare professionals"
                detail="Request detailed quotations"
              />
            </div>

            <Link
              href={`/report?project=${project.id}`}
              className="zv2-detail-report-button"
            >
              Generate project report
              <ArrowRight size={16} />
            </Link>
          </article>
        </aside>
      </section>

      <section className="zv2-detail-cta">
        <div>
          <span>ZAMI next step</span>
          <h2>Turn this estimate into a real renovation plan.</h2>

          <p>
            Use your project report to validate priorities and compare
            contractor quotations.
          </p>
        </div>

        <Link href={`/report?project=${project.id}`}>
          View complete report
          <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}

function ProjectProgress({ progress }: { progress: number }) {
  const style = {
    "--detail-progress": `${progress}%`,
  } as CSSProperties;

  return (
    <div className="zv2-detail-progress">
      <div className="zv2-detail-progress-ring" style={style}>
        <div>
          <strong>{progress}%</strong>
          <span>ready</span>
        </div>
      </div>

      <div>
        <span>Project readiness</span>
        <strong>Your estimate is ready for review</strong>
      </div>
    </div>
  );
}

function DetailMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article>
      <div>
        <Icon size={19} />
      </div>

      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function CardTitle({
  icon: Icon,
  kicker,
  title,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
}) {
  return (
    <div className="zv2-detail-card-title">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>

      <div>
        <Icon size={20} />
      </div>
    </div>
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
        zv2-detail-finance-row
        ${highlight ? "is-highlighted" : ""}
        ${total ? "is-total" : ""}
      `}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PropertyFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>
        <Icon size={16} />
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TimelineItem({
  number,
  title,
  detail,
  complete,
}: {
  number: string;
  title: string;
  detail: string;
  complete?: boolean;
}) {
  return (
    <div className={complete ? "is-complete" : ""}>
      <span>{complete ? <Check size={13} /> : number}</span>

      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
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

      return {
        title: String(
          record.title ||
            record.name ||
            fallbackRecommendations[index]?.title ||
            `Recommendation ${index + 1}`,
        ),
        description: String(
          record.description ||
            record.detail ||
            record.reason ||
            fallbackRecommendations[index]?.description ||
            "Recommended renovation action.",
        ),
        cost: String(
          record.cost ||
            record.estimated_cost ||
            fallbackRecommendations[index]?.cost ||
            "To estimate",
        ),
        savings: String(
          record.savings ||
            record.energy_savings ||
            fallbackRecommendations[index]?.savings ||
            "To estimate",
        ),
        priority: String(
          record.priority ||
            fallbackRecommendations[index]?.priority ||
            "Medium",
        ),
      };
    })
    .filter((item): item is Recommendation => item !== null);

  return recommendations.length
    ? recommendations
    : fallbackRecommendations;
}

function calculateProgress(project: Project) {
  let progress = 32;

  if (project.target_dpe) progress += 10;
  if (Number(project.subsidies || 0) > 0) progress += 9;
  if (Number(project.yearly_savings || 0) > 0) progress += 9;
  if (project.recommendations) progress += 8;

  return Math.min(progress, 68);
}

function normaliseDpe(value: string | null | undefined, fallback: string) {
  const grade = value?.trim().toUpperCase();

  return grade && /^[A-G]$/.test(grade) ? grade : fallback;
}

function projectTitle(address?: string | null) {
  if (!address) return "Energy renovation project";

  return address.split(",")[0]?.trim() || "Energy renovation project";
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("en-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
