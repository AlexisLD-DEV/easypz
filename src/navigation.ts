type TopbarUser = { role: string } | null;

export type TopbarLink = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "highlight";
  icon: "quiz" | "join" | "teacher" | "create" | "results" | "more" | "bank" | "admin" | "settings";
  children?: TopbarLink[];
};

export type NavLabels = {
  gallery: string;
  joinQuiz: string;
  login: string;
  register: string;
  dashboard: string;
  launchQuiz: string;
  createQuiz: string;
  results: string;
  more: string;
  bank: string;
  admin: string;
  settings: string;
};

export type TopbarSurface = "default" | "student";

export const frenchNavLabels: NavLabels = {
  gallery: "Quiz",
  joinQuiz: "Rejoindre un quiz",
  login: "Connexion",
  register: "Créer un compte",
  dashboard: "Espace prof",
  launchQuiz: "Lancer un quiz",
  createQuiz: "Créer un quiz",
  results: "Résultats",
  more: "Plus",
  bank: "Banque",
  admin: "Admin",
  settings: "Réglages"
};

export const englishNavLabels: NavLabels = {
  gallery: "Quiz",
  joinQuiz: "Join a quiz",
  login: "Log in",
  register: "Create account",
  dashboard: "Teacher space",
  launchQuiz: "Launch quiz",
  createQuiz: "Create quiz",
  results: "Results",
  more: "More",
  bank: "Bank",
  admin: "Admin",
  settings: "Settings"
};

export function topbarLinks(user: TopbarUser, labels: NavLabels = frenchNavLabels, options: { surface?: TopbarSurface } = {}): TopbarLink[] {
  if (options.surface === "student") return [];

  if (!user) {
    return [
      { href: "/", label: labels.gallery, variant: "highlight", icon: "quiz" },
      { href: "/join", label: labels.joinQuiz, variant: "primary", icon: "join" },
      { href: "/login", label: labels.dashboard, variant: "secondary", icon: "teacher" }
    ];
  }

  const links: TopbarLink[] = [
    { href: "/dashboard", label: labels.dashboard, variant: "primary", icon: "teacher" },
    { href: "/dashboard#launch", label: labels.launchQuiz, icon: "join" },
    { href: "/editor", label: labels.createQuiz, icon: "create" },
    { href: "/dashboard#results", label: labels.results, icon: "results" },
    {
      href: "#",
      label: labels.more,
      icon: "more",
      children: [
        { href: "/question-bank", label: labels.bank, icon: "bank" },
        { href: "/", label: labels.gallery, icon: "quiz" },
        ...(user.role === "admin" ? [{ href: "/admin/allowed-emails", label: labels.admin, icon: "admin" as const }] : []),
        { href: "/settings", label: labels.settings, icon: "settings" }
      ]
    }
  ];
  return links;
}
