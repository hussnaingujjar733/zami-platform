"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  FileText,
  Home,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingDown,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

type Project = {
  id: string;
  address: string | null;
  surface: number | null;
  dpe: string | null;
  target_dpe: string | null;
  estimated_cost: number | null;
  subsidies: number | null;
  net_cost: number | null;
  yearly_savings: number | null;
  confidence: number | null;
  recommendations: unknown;
  created_at: string | null;
};

type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
};

const navigation: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "Projects",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Documents",
    href: "/report",
    icon: FileText,
  },
  {
    label: "Messages",
    href: "#",
    icon: MessageSquare,
  },
  {
    label: "Calendar",
    href: "#",
    icon: CalendarDays,
  },
];

export function ProjectsDashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Homeowner");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const metadataName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Homeowner";

      setUserName(metadataName);

      const { data, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectError) {
        setError(projectError.message);
        setProjects([]);
      } else {
        setProjects((data ?? []) as Project[]);
      }

      setLoading(false);
    }

    void loadDashboard();
  }, [router]);

  const totals = useMemo(() => {
    const totalBudget = projects.reduce(
      (sum, project) => sum + Number(project.estimated_cost || 0),
      0,
    );

    const totalSavings = projects.reduce(
      (sum, project) => sum + Number(project.yearly_savings || 0),
      0,
    );

    const totalSubsidies = projects.reduce(
      (sum, project) => sum + Number(project.subsidies || 0),
      0,
    );

    const averageProgress = projects.length
      ? Math.round(
          projects.reduce(
            (sum, project, index) =>
              sum + calculateProjectProgress(project, index),
            0,
          ) / projects.length,
        )
      : 0;

    return {
      totalBudget,
      totalSavings,
      totalSubsidies,
      averageProgress,
    };
  }, [projects]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="zv2-dashboard-page">
      <DashboardSidebar onSignOut={signOut} />

      <div className="zv2-dashboard-main">
        <header className="zv2-dashboard-header">
          <div>
            <span className="zv2-dashboard-kicker">ZAMI workspace</span>

            <h1>
              Welcome back, <span>{firstName(userName)}</span>
            </h1>

            <p>
              Track renovation estimates, energy improvements and project
              progress in one place.
            </p>
          </div>

          <div className="zv2-dashboard-header-actions">
            <button
              type="button"
              aria-label="Notifications"
              className="zv2-dashboard-icon-button"
            >
              <Bell size={19} />
              <span />
            </button>

            <Link href="/estimate" className="zv2-new-project-button">
              <Plus size={18} />
              New project
            </Link>
          </div>
        </header>

        <section className="zv2-dashboard-stats">
          <DashboardStat
            icon={Home}
            label="Active projects"
            value={String(projects.length)}
            detail="Saved renovation projects"
          />

          <DashboardStat
            icon={WalletCards}
            label="Estimated investment"
            value={formatEuro(totals.totalBudget)}
            detail="Across all properties"
          />

          <DashboardStat
            icon={TrendingDown}
            label="Annual savings"
            value={formatEuro(totals.totalSavings)}
            detail="Potential yearly savings"
          />

          <DashboardStat
            icon={Sparkles}
            label="Average progress"
            value={`${totals.averageProgress}%`}
            detail={`${formatEuro(totals.totalSubsidies)} support identified`}
          />
        </section>

        <section className="zv2-projects-section">
          <div className="zv2-projects-toolbar">
            <div>
              <span>Portfolio overview</span>
              <h2>My renovation projects</h2>
            </div>

            <div className="zv2-projects-toolbar-actions">
              <label className="zv2-project-search">
                <Search size={17} />
                <input placeholder="Search projects" />
              </label>

              <button type="button">
                Recent
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {loading && (
            <div className="zv2-dashboard-state">
              <LoaderCircle className="zv2-dashboard-spinner" size={32} />
              <h3>Loading your projects</h3>
              <p>Retrieving saved renovation estimates...</p>
            </div>
          )}

          {!loading && error && (
            <div className="zv2-dashboard-state is-error">
              <CircleHelp size={32} />
              <h3>Projects could not be loaded</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <EmptyProjects />
          )}

          {!loading && !error && projects.length > 0 && (
            <div className="zv2-project-list">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>

        <section className="zv2-dashboard-bottom-grid">
          <article className="zv2-dashboard-insight-card">
            <div className="zv2-dashboard-insight-icon">
              <Leaf size={24} />
            </div>

            <div>
              <span>ZAMI portfolio insight</span>
              <h3>
                Insulation-first projects usually deliver stronger long-term
                performance.
              </h3>
              <p>
                Review the recommended sequencing before requesting contractor
                quotations.
              </p>
            </div>

            <Link href="/results">
              View analysis
              <ChevronRight size={16} />
            </Link>
          </article>

          <article className="zv2-dashboard-support-card">
            <div>
              <CircleHelp size={21} />
              <span>Need support?</span>
            </div>

            <h3>Talk to a renovation expert</h3>

            <p>
              Get assistance understanding your estimate and recommended next
              steps.
            </p>

            <button type="button">Book a consultation</button>
          </article>
        </section>
      </div>

      <DashboardMobileNav />
    </main>
  );
}

function DashboardSidebar({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}) {
  return (
    <aside className="zv2-dashboard-sidebar">
      <Link href="/" className="zv2-dashboard-logo" aria-label="ZAMI home">
        <span>
          <Leaf size={20} />
        </span>
        <strong>ZAMI</strong>
      </Link>

      <nav className="zv2-dashboard-nav">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={item.active ? "is-active" : ""}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="zv2-dashboard-sidebar-spacer" />

      <nav className="zv2-dashboard-nav zv2-dashboard-nav-secondary">
        <Link href="#" title="Settings">
          <Settings size={20} />
          <span>Settings</span>
        </Link>

        <Link href="#" title="Help">
          <CircleHelp size={20} />
          <span>Help</span>
        </Link>

        <button type="button" title="Sign out" onClick={() => void onSignOut()}>
          <LogOut size={20} />
          <span>Sign out</span>
        </button>
      </nav>
    </aside>
  );
}

function DashboardStat({
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
    <article className="zv2-dashboard-stat">
      <div className="zv2-dashboard-stat-top">
        <div>
          <Icon size={19} />
        </div>

        <Sparkles size={14} />
      </div>

      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ProjectCard({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const progress = calculateProjectProgress(project, index);
  const currentDpe = normaliseDpe(project.dpe, "E");
  const targetDpe = normaliseDpe(project.target_dpe, "B");

  return (
    <Link href={`/projects/${project.id}`} className="zv2-project-card">
      <ProjectThumbnail variant={index % 3} />

      <div className="zv2-project-information">
        <div className="zv2-project-title-row">
          <div>
            <span>Renovation project</span>
            <h3>{projectTitle(project.address, index)}</h3>
          </div>

          <span className="zv2-project-status">Estimate ready</span>
        </div>

        <p className="zv2-project-location">
          <MapPin size={14} />
          {project.address || "Address not available"}
        </p>

        <div className="zv2-project-details">
          <div>
            <span>Surface</span>
            <strong>{project.surface || "—"} m²</strong>
          </div>

          <div>
            <span>DPE improvement</span>

            <strong className="zv2-project-dpe">
              <i className={`grade-${currentDpe.toLowerCase()}`}>
                {currentDpe}
              </i>

              <ChevronRight size={14} />

              <i className={`grade-${targetDpe.toLowerCase()}`}>
                {targetDpe}
              </i>
            </strong>
          </div>

          <div>
            <span>Budget</span>
            <strong>{formatEuro(Number(project.estimated_cost || 0))}</strong>
          </div>

          <div>
            <span>Annual savings</span>
            <strong className="zv2-project-green">
              {formatEuro(Number(project.yearly_savings || 0))}
            </strong>
          </div>
        </div>

        <div className="zv2-project-footer">
          <span>
            Updated {formatProjectDate(project.created_at)}
          </span>

          <strong>
            View project
            <ChevronRight size={15} />
          </strong>
        </div>
      </div>

      <ProgressRing progress={progress} />
    </Link>
  );
}

function ProjectThumbnail({ variant }: { variant: number }) {
  return (
    <div className={`zv2-project-thumbnail thumbnail-${variant + 1}`}>
      <div className="zv2-thumbnail-sun" />
      <div className="zv2-thumbnail-ground" />

      <div className="zv2-thumbnail-house">
        <div className="zv2-thumbnail-roof" />

        <div className="zv2-thumbnail-wall">
          <span />
          <span />
          <i />
        </div>

        <div className="zv2-thumbnail-side" />
      </div>

      <div className="zv2-thumbnail-label">
        <Building2 size={12} />
        Property
      </div>
    </div>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  const style = {
    "--project-progress": `${progress}%`,
  } as CSSProperties;

  return (
    <div className="zv2-project-progress-column">
      <div className="zv2-project-progress-ring" style={style}>
        <div>
          <strong>{progress}%</strong>
          <span>complete</span>
        </div>
      </div>

      <p>Project preparation</p>
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="zv2-empty-projects">
      <div className="zv2-empty-project-icon">
        <Home size={32} />
      </div>

      <span>Your property portfolio is empty</span>
      <h3>Create your first renovation estimate.</h3>

      <p>
        Add a property to receive an AI-powered budget, DPE projection and
        energy-saving roadmap.
      </p>

      <Link href="/estimate">
        <Plus size={17} />
        Start new estimate
      </Link>
    </div>
  );
}

function DashboardMobileNav() {
  return (
    <nav className="zv2-dashboard-mobile-nav">
      <Link href="/dashboard" className="is-active">
        <LayoutDashboard size={18} />
        <span>Overview</span>
      </Link>

      <Link href="/estimate">
        <Plus size={18} />
        <span>New</span>
      </Link>

      <Link href="/report">
        <FileText size={18} />
        <span>Reports</span>
      </Link>

      <Link href="#">
        <Settings size={18} />
        <span>Settings</span>
      </Link>
    </nav>
  );
}

function calculateProjectProgress(project: Project, index: number) {
  let progress = 28;

  if (project.target_dpe) progress += 8;
  if (Number(project.subsidies || 0) > 0) progress += 8;
  if (Number(project.yearly_savings || 0) > 0) progress += 7;

  if (
    Array.isArray(project.recommendations) &&
    project.recommendations.length > 0
  ) {
    progress += 8;
  }

  progress += Math.min(index * 3, 9);

  return Math.min(progress, 68);
}

function projectTitle(address: string | null, index: number) {
  if (!address) return `Energy renovation ${index + 1}`;

  const firstAddressPart = address.split(",")[0]?.trim();

  return firstAddressPart || `Energy renovation ${index + 1}`;
}

function normaliseDpe(value: string | null, fallback: string) {
  const grade = value?.trim().toUpperCase();

  return grade && /^[A-G]$/.test(grade) ? grade : fallback;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Homeowner";
}

function formatProjectDate(value: string | null) {
  if (!value) return "recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "recently";

  return new Intl.DateTimeFormat("en-FR", {
    day: "2-digit",
    month: "short",
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
