import { lazy, Suspense, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  FilePlus2,
  Gamepad2,
  GraduationCap,
  MailCheck,
  Moon,
  MoreHorizontal,
  Rocket,
  Settings,
  Sun
} from "lucide-react";
import { useI18n } from "./i18n/useI18n";
import { api } from "./api/client";
import { authRouteDecision } from "./authRouting";
import {
  colorModeClassName,
  nextColorMode,
  readStoredColorMode,
  writeStoredColorMode,
  type ColorMode
} from "./features/accessibility/colorMode";
import {
  nextThemeMode,
  readStoredThemeMode,
  themeModeClassName,
  writeStoredThemeMode,
  type ThemeMode
} from "./features/accessibility/themeMode";
import { teacherPreferencesChangedEvent } from "./features/settings/teacherPreferences";
import { topbarLinks } from "./navigation";
import type { TopbarLink } from "./navigation";

type CurrentUser = { id: string; email: string; role: string };

const LoginPage = lazy(() => import("./features/auth/AuthPages").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./features/auth/AuthPages").then((module) => ({ default: module.RegisterPage })));
const TeacherDashboard = lazy(() => import("./features/dashboard/TeacherDashboard").then((module) => ({ default: module.TeacherDashboard })));
const QuizEditor = lazy(() => import("./features/editor/QuizEditor").then((module) => ({ default: module.QuizEditor })));
const AdminAllowedEmails = lazy(() => import("./features/admin/AdminAllowedEmails").then((module) => ({ default: module.AdminAllowedEmails })));
const PublicGallery = lazy(() => import("./features/public/PublicGallery").then((module) => ({ default: module.PublicGallery })));
const PracticePlayer = lazy(() => import("./features/practice/PracticePlayer").then((module) => ({ default: module.PracticePlayer })));
const QuestionBankPage = lazy(() => import("./features/questionBank/QuestionBankPage").then((module) => ({ default: module.QuestionBankPage })));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const CodePage = lazy(() => import("./features/code/CodePage").then((module) => ({ default: module.CodePage })));
const BoardLiveRoom = lazy(() => import("./features/live/BoardLiveRoom").then((module) => ({ default: module.BoardLiveRoom })));
const StudentJoin = lazy(() => import("./features/live/StudentJoin").then((module) => ({ default: module.StudentJoin })));
const StudentLiveRoom = lazy(() => import("./features/live/StudentLiveRoom").then((module) => ({ default: module.StudentLiveRoom })));
const TeacherLiveRoom = lazy(() => import("./features/live/TeacherLiveRoom").then((module) => ({ default: module.TeacherLiveRoom })));
const SessionResults = lazy(() => import("./features/results/SessionResults").then((module) => ({ default: module.SessionResults })));

function TopbarIcon({ icon }: { icon: TopbarLink["icon"] }) {
  const icons = {
    quiz: BookOpen,
    join: Rocket,
    teacher: GraduationCap,
    create: FilePlus2,
    results: BarChart3,
    more: MoreHorizontal,
    bank: Gamepad2,
    admin: MailCheck,
    settings: Settings
  };
  const Icon = icons[icon];
  return <Icon size={18} aria-hidden="true" />;
}

function RouteView({ user, authChecked }: { user: CurrentUser | null; authChecked: boolean }) {
  const { t } = useI18n();
  const path = window.location.pathname;
  const authDecision = authRouteDecision(path, user, authChecked);
  if (authDecision.kind === "loading") return <p className="status-message">{t("app.loading")}</p>;
  if (authDecision.kind === "redirect") {
    window.location.href = authDecision.to;
    return <p className="status-message">{t("app.loading")}</p>;
  }

  const parts = path.split("/").filter(Boolean);
  if (path === "/login") return <LoginPage />;
  if (path === "/register") return <RegisterPage />;
  if (path === "/dashboard") return <TeacherDashboard />;
  if (path === "/results") return <TeacherDashboard />;
  if (path === "/settings") return <SettingsPage />;
  if (path === "/code") return <CodePage />;
  if (path === "/question-bank") return <QuestionBankPage />;
  if (path === "/editor") return <QuizEditor />;
  if (path === "/admin/allowed-emails") return <AdminAllowedEmails />;
  if (parts[0] === "practice" && parts[1] === "secret" && parts[2]) {
    return <PracticePlayer access={{ kind: "secret", token: parts[2] }} />;
  }
  if (parts[0] === "practice" && parts[1]) return <PracticePlayer access={{ kind: "public", slug: parts[1] }} />;
  if (parts[0] === "sessions" && parts[1] && parts[2] === "results") return <SessionResults sessionId={parts[1]} />;
  if (parts[0] === "join") return <StudentJoin code={parts[1] ?? ""} />;
  if (parts[0] === "live" && parts[1] === "teacher" && parts[2]) return <TeacherLiveRoom sessionId={parts[2]} />;
  if (parts[0] === "live" && parts[1] === "board" && parts[2]) return <BoardLiveRoom sessionId={parts[2]} />;
  if (parts[0] === "live" && parts[1] === "student" && parts[2] && parts[3]) {
    const participantToken = new URLSearchParams(window.location.search).get("token") ?? "";
    return <StudentLiveRoom sessionId={parts[2]} participantId={parts[3]} participantToken={participantToken} />;
  }
  return <PublicGallery />;
}

export function App() {
  const { locale, setLocale, t } = useI18n();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>(() => readStoredColorMode());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const path = window.location.pathname;
  const isStudentSurface = path.startsWith("/join") || path.startsWith("/live/student/");
  const navLabels = {
    gallery: t("nav.gallery"),
    joinQuiz: t("nav.joinQuiz"),
    login: t("nav.login"),
    register: t("nav.register"),
    dashboard: t("nav.dashboard"),
    launchQuiz: t("nav.launchQuiz"),
    createQuiz: t("nav.createQuiz"),
    results: t("nav.results"),
    more: t("nav.more"),
    bank: t("nav.bank"),
    admin: t("nav.admin"),
    settings: t("nav.settings")
  };

  useEffect(() => {
    api<{ user: CurrentUser }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    function syncPreferences() {
      setColorMode(readStoredColorMode());
    }

    window.addEventListener(teacherPreferencesChangedEvent, syncPreferences);
    return () => window.removeEventListener(teacherPreferencesChangedEvent, syncPreferences);
  }, []);

  function toggleColorMode() {
    setColorMode((current) => {
      const next = nextColorMode(current);
      writeStoredColorMode(window.localStorage, next);
      return next;
    });
  }

  function toggleThemeMode() {
    setThemeMode((current) => {
      const next = nextThemeMode(current);
      writeStoredThemeMode(window.localStorage, next);
      return next;
    });
  }

  return (
    <main className={`app-shell ${colorModeClassName(colorMode)} ${themeModeClassName(themeMode)}`.trim()}>
      <header className="topbar">
        <div className="topbar-primary-row">
          <a className="brand-link" href="/" aria-label={t("appName")}>
            <img className="brand-logo" src="/easypz-mascot.png" alt="" aria-hidden="true" />
            <span>{t("appName")}</span>
          </a>
          <div className="mobile-top-actions" aria-label={t("nav.main")}>
            {!isStudentSurface ? (
              <a className="mobile-teacher-link" href={user ? "/dashboard" : "/login"} title={navLabels.dashboard}>
                <GraduationCap size={17} aria-hidden="true" />
                <span className="switch-text">{navLabels.dashboard}</span>
              </a>
            ) : null}
            <label className="switch-control mobile-colorblind-control" title={t("nav.colorblind")}>
              <input
                type="checkbox"
                checked={colorMode === "colorblind"}
                onChange={toggleColorMode}
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
              <span className="switch-label">
                <img className="colorblind-icon" src="/colorblind-icon.svg" alt="" aria-hidden="true" />
                <span className="switch-text">{t("nav.colorblind")}</span>
              </span>
            </label>
            <button className="theme-toggle theme-switch" type="button" onClick={toggleThemeMode} aria-pressed={themeMode === "dark"} title={themeMode === "dark" ? t("nav.lightMode") : t("nav.darkMode")}>
              <span className={`theme-switch-icon ${themeMode === "dark" ? "theme-switch-icon-dark" : "theme-switch-icon-light"}`} aria-hidden="true">
                {themeMode === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              </span>
              <span className="switch-text">{themeMode === "dark" ? t("nav.lightMode") : t("nav.darkMode")}</span>
            </button>
            <button className="icon-button locale-switch" onClick={() => setLocale(locale === "fr" ? "en" : "fr")} title={locale === "fr" ? "Switch to English" : "Passer en français"}>
              <span className={`flag-icon ${locale === "fr" ? "flag-uk" : "flag-fr"}`} aria-hidden="true" />
              <span className="switch-text">{locale === "fr" ? "EN" : "FR"}</span>
            </button>
          </div>
        </div>
        <nav className="topbar-nav" aria-label={t("nav.main")}>
          {topbarLinks(user, navLabels, { surface: isStudentSurface ? "student" : "default" }).map((link) => (
            link.children ? (
              <details className="topbar-menu" key={link.label}>
                <summary className="nav-link">
                  <TopbarIcon icon={link.icon} />
                  <span>{link.label}</span>
                </summary>
                <div className="topbar-menu-panel">
                  {link.children.map((child) => (
                    <a key={child.href} className="nav-link" href={child.href}>
                      <TopbarIcon icon={child.icon} />
                      <span>{child.label}</span>
                    </a>
                  ))}
                </div>
              </details>
            ) : (
              <a
                key={link.href}
                className={`nav-link ${link.variant === "primary" ? "nav-link-primary" : link.variant === "secondary" ? "nav-link-secondary" : link.variant === "highlight" ? "nav-link-highlight" : ""}`.trim()}
                href={link.href}
              >
                <TopbarIcon icon={link.icon} />
                <span>{link.label}</span>
              </a>
            )
          ))}
          <label className="switch-control" title={t("nav.colorblind")}>
            <input
              type="checkbox"
              checked={colorMode === "colorblind"}
              onChange={toggleColorMode}
            />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">
              <img className="colorblind-icon" src="/colorblind-icon.svg" alt="" aria-hidden="true" />
              {t("nav.colorblind")}
            </span>
          </label>
          <div className="desktop-top-actions">
          <button className="theme-toggle theme-switch" type="button" onClick={toggleThemeMode} aria-pressed={themeMode === "dark"} title={themeMode === "dark" ? t("nav.lightMode") : t("nav.darkMode")}>
            <span className={`theme-switch-icon ${themeMode === "dark" ? "theme-switch-icon-dark" : "theme-switch-icon-light"}`} aria-hidden="true">
              {themeMode === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            </span>
            <span>{themeMode === "dark" ? t("nav.lightMode") : t("nav.darkMode")}</span>
          </button>
          <button className="icon-button locale-switch" onClick={() => setLocale(locale === "fr" ? "en" : "fr")} title={locale === "fr" ? "Switch to English" : "Passer en français"}>
            <span className={`flag-icon ${locale === "fr" ? "flag-uk" : "flag-fr"}`} aria-hidden="true" />
            <span>{locale === "fr" ? "EN" : "FR"}</span>
          </button>
          </div>
        </nav>
      </header>
      <section className="workspace">
        <Suspense fallback={<p className="status-message">{t("app.loading")}</p>}>
          <RouteView user={user} authChecked={authChecked} />
        </Suspense>
      </section>
    </main>
  );
}
