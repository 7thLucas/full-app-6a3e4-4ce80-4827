/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  // Base
  background: string;
  foreground: string;
  // Card
  card: string;
  cardForeground: string;
  // Popover
  popover: string;
  popoverForeground: string;
  // Primary
  primary: string;
  primaryForeground: string;
  // Secondary
  secondary: string;
  secondaryForeground: string;
  // Muted
  muted: string;
  mutedForeground: string;
  // Accent
  accent: string;
  accentForeground: string;
  // Destructive
  destructive: string;
  destructiveForeground: string;
  // Border / Input / Ring
  border: string;
  input: string;
  ring: string;
  // Charts
  chart1?: string;
  chart2?: string;
  chart3?: string;
  chart4?: string;
  chart5?: string;
  // Navbar
  navbarBackground: string;
  // Sidebar
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

export type TFont = {
  headingFont: string;
  textFont: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  font: TFont;
  tagline?: string;
  expenseCategories?: string[];
  currencySymbol?: string;
  defaultExpensesPerPage?: number;
  showPnlCharts?: boolean;
  footerText?: string;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "PropLedger",
  logoUrl: "",
  tagline: "Property expense management for serious portfolio managers",
  expenseCategories: [
    "Maintenance & Repairs",
    "Utilities",
    "Insurance",
    "Property Tax",
    "Management Fees",
    "Landscaping",
    "Cleaning",
    "Supplies",
    "Legal & Professional",
    "Capital Improvements",
    "Other",
  ],
  currencySymbol: "$",
  defaultExpensesPerPage: 25,
  showPnlCharts: true,
  footerText: "PropLedger — Professional property expense management",
  brandColor: {
    // Base
    background:        "#F5F7FA",
    foreground:        "#1A1A2E",
    // Card
    card:              "#FFFFFF",
    cardForeground:    "#1A1A2E",
    // Popover
    popover:           "#FFFFFF",
    popoverForeground: "#1A1A2E",
    // Primary
    primary:           "#1B2B4B",
    primaryForeground: "#FFFFFF",
    // Secondary
    secondary:           "#2D6A4F",
    secondaryForeground: "#FFFFFF",
    // Muted
    muted:           "#EEF1F6",
    mutedForeground: "#6B7280",
    // Accent
    accent:           "#2D6A4F",
    accentForeground: "#FFFFFF",
    // Destructive
    destructive:           "#EF4444",
    destructiveForeground: "#FFFFFF",
    // Border / Input / Ring
    border: "#DDE2EA",
    input:  "#DDE2EA",
    ring:   "#2D6A4F",
    // Charts
    chart1: "#2D6A4F",
    chart2: "#1B2B4B",
    chart3: "#22C55E",
    chart4: "#EF4444",
    chart5: "#6B7280",
    // Navbar
    navbarBackground: "#1B2B4B",
    // Sidebar
    sidebarBackground:        "#1B2B4B",
    sidebarForeground:        "#E8EDF5",
    sidebarPrimary:           "#2D6A4F",
    sidebarPrimaryForeground: "#FFFFFF",
    sidebarAccent:            "#243552",
    sidebarAccentForeground:  "#E8EDF5",
    sidebarBorder:            "#2E3D5C",
    sidebarRing:              "#2D6A4F",
  },
  font: {
    headingFont: "Inter",
    textFont: "Inter",
  },
  // ─────────────────────────────────────────────────────────────────────
  // Add new field defaults here. See RULES.md §5 for per-type shape.
  // ─────────────────────────────────────────────────────────────────────
};
