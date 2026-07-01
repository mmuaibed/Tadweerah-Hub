import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ClipboardList,
  FileCheck2,
  FileText,
  Factory,
  HelpCircle,
  Leaf,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Recycle,
  ShieldCheck,
  Truck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n";
import "./home.css";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const assetPath = (path: string) => `${basePath}${path}`;

const HOMEPAGE_LOCKUP = assetPath("/homepage/tadweerah-lockup-horizontal.png");
const HOMEPAGE_ICON = assetPath("/homepage/tadweerah-icon.png");

// Production should replace the extracted lockup with the official standalone SVG or high-resolution transparent PNG once provided.

const navItems = [
  ["#top", "publicHome.nav.home"],
  ["#how", "publicHome.nav.how"],
  ["#services", "publicHome.nav.services"],
  ["#audience", "publicHome.nav.audience"],
  ["#compliance", "publicHome.nav.compliance"],
  ["#about", "publicHome.nav.about"],
  ["#contact", "publicHome.nav.contact"],
] as const;

const trustItems: Array<{ key: string; icon: LucideIcon }> = [
  { key: "publicHome.trust.saudi", icon: Leaf },
  { key: "publicHome.trust.business", icon: Building2 },
  { key: "publicHome.trust.workflow", icon: Check },
  { key: "publicHome.trust.protected", icon: ShieldCheck },
  { key: "publicHome.trust.reporting", icon: FileText },
];

const howSteps: Array<{ title: string; body: string; icon: LucideIcon }> = [
  {
    title: "publicHome.how.step1.title",
    body: "publicHome.how.step1.body",
    icon: Package,
  },
  {
    title: "publicHome.how.step2.title",
    body: "publicHome.how.step2.body",
    icon: User,
  },
  {
    title: "publicHome.how.step3.title",
    body: "publicHome.how.step3.body",
    icon: Truck,
  },
  {
    title: "publicHome.how.step4.title",
    body: "publicHome.how.step4.body",
    icon: BarChart3,
  },
];

const services: Array<{ title: string; body: string; icon: LucideIcon; cta?: boolean }> = [
  {
    title: "publicHome.services.market.title",
    body: "publicHome.services.market.body",
    icon: Recycle,
  },
  {
    title: "publicHome.services.deals.title",
    body: "publicHome.services.deals.body",
    icon: ClipboardList,
  },
  {
    title: "publicHome.services.transport.title",
    body: "publicHome.services.transport.body",
    icon: Truck,
  },
  {
    title: "publicHome.services.reports.title",
    body: "publicHome.services.reports.body",
    icon: BarChart3,
  },
  {
    title: "publicHome.services.governance.title",
    body: "publicHome.services.governance.body",
    icon: ShieldCheck,
  },
  {
    title: "publicHome.services.ready.title",
    body: "publicHome.services.ready.body",
    icon: Building2,
    cta: true,
  },
];

const audienceCards: Array<{
  icon: LucideIcon;
  tone: "green" | "teal" | "blue";
  title: string;
  body: string;
  points: string[];
}> = [
  {
    icon: Building2,
    tone: "green",
    title: "publicHome.audience.generators.title",
    body: "publicHome.audience.generators.body",
    points: [
      "publicHome.audience.generators.p1",
      "publicHome.audience.generators.p2",
      "publicHome.audience.generators.p3",
    ],
  },
  {
    icon: Factory,
    tone: "teal",
    title: "publicHome.audience.processors.title",
    body: "publicHome.audience.processors.body",
    points: [
      "publicHome.audience.processors.p1",
      "publicHome.audience.processors.p2",
      "publicHome.audience.processors.p3",
    ],
  },
  {
    icon: Truck,
    tone: "blue",
    title: "publicHome.audience.transporters.title",
    body: "publicHome.audience.transporters.body",
    points: [
      "publicHome.audience.transporters.p1",
      "publicHome.audience.transporters.p2",
      "publicHome.audience.transporters.p3",
    ],
  },
];

const complianceItems: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: FileCheck2,
    title: "publicHome.compliance.item1.title",
    body: "publicHome.compliance.item1.body",
  },
  {
    icon: LockKeyhole,
    title: "publicHome.compliance.item2.title",
    body: "publicHome.compliance.item2.body",
  },
  {
    icon: ShieldCheck,
    title: "publicHome.compliance.item3.title",
    body: "publicHome.compliance.item3.body",
  },
];

const vaultItems: Array<{ icon: LucideIcon; key: string }> = [
  { icon: LockKeyhole, key: "publicHome.compliance.vault.1" },
  { icon: User, key: "publicHome.compliance.vault.2" },
  { icon: Check, key: "publicHome.compliance.vault.3" },
  { icon: FileText, key: "publicHome.compliance.vault.4" },
];

const aboutItems: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Check,
    title: "publicHome.about.item1.title",
    body: "publicHome.about.item1.body",
  },
  {
    icon: FileText,
    title: "publicHome.about.item2.title",
    body: "publicHome.about.item2.body",
  },
  {
    icon: ShieldCheck,
    title: "publicHome.about.item3.title",
    body: "publicHome.about.item3.body",
  },
];

function PublicButton({
  href,
  variant,
  children,
  external = false,
}: {
  href: string;
  variant: "primary" | "secondary" | "blue" | "white";
  children: React.ReactNode;
  external?: boolean;
}) {
  const className = `ph-btn ph-btn-${variant}`;
  if (external || href.startsWith("mailto:") || href.startsWith("#")) {
    return (
      <a
        href={href}
        className={className}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function MockupCard() {
  const { t } = useT();

  return (
    <div className="ph-snapshot" role="img" aria-label={t("publicHome.mockup.aria")}>
      <div className="ph-window">
        <div className="ph-window-bar">
          <span className="ph-avatar">م ع</span>
          <span className="ph-dot ph-dot-green" />
          <span className="ph-url">app.tadweerah.com</span>
          <img src={HOMEPAGE_ICON} alt="" className="ph-window-mark" aria-hidden="true" />
          <span className="ph-dot ph-dot-muted" />
          <span className="ph-dot ph-dot-blue" />
          <span className="ph-dot ph-dot-green" />
        </div>
        <div className="ph-window-body">
          <div className="ph-cards">
            <div className="ph-mini-card">
              <div className="ph-card-head">
                <span>{t("publicHome.mockup.listing")}</span>
                <span className="ph-badge ph-badge-open">{t("publicHome.mockup.open")}</span>
              </div>
              <strong>{t("publicHome.mockup.pp")}</strong>
              <small>{t("publicHome.mockup.ppMeta")}</small>
              <span className="ph-progress" />
            </div>
            <div className="ph-mini-card">
              <div className="ph-card-head">
                <span>{t("publicHome.mockup.listing")}</span>
                <span className="ph-badge ph-badge-review">{t("publicHome.mockup.review")}</span>
              </div>
              <strong>{t("publicHome.mockup.hdpe")}</strong>
              <small>{t("publicHome.mockup.hdpeMeta")}</small>
            </div>
            <div className="ph-mini-card">
              <div className="ph-card-head">
                <span>{t("publicHome.mockup.dealStatus")}</span>
                <span className="ph-badge ph-badge-doc">{t("publicHome.mockup.documented")}</span>
              </div>
              <div className="ph-status-row">
                {["offer", "deal", "transport", "close"].map((key, index) => (
                  <span key={key} className={index < 3 ? "is-done" : ""}>
                    {t(`publicHome.mockup.${key}`)}
                  </span>
                ))}
              </div>
            </div>
            <div className="ph-mini-card">
              <div className="ph-card-head">
                <span>{t("publicHome.mockup.report")}</span>
                <span className="ph-badge ph-badge-quality">{t("publicHome.mockup.quality")}</span>
              </div>
              <div className="ph-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <small>{t("publicHome.mockup.reportNote")}</small>
            </div>
          </div>
          <div className="ph-side-rail" aria-hidden="true">
            <Package />
            <FileText />
            <Truck />
            <BarChart3 />
          </div>
        </div>
      </div>
      <div className="ph-float">
        <span className="ph-float-dot" />
        <strong>{t("publicHome.mockup.float")}</strong>
        <span>{t("publicHome.mockup.sample")}</span>
      </div>
    </div>
  );
}

export function HomePage() {
  const { t, lang, setLang } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const toggleLanguage = () => setLang(lang === "ar" ? "en" : "ar");
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="public-homepage" id="top">
      <header className="ph-header">
        <div className="ph-wrap ph-nav">
          <a href="#top" className="ph-brand" aria-label={t("publicHome.brand.aria")}>
            <img className="ph-logo-full" src={HOMEPAGE_LOCKUP} alt={t("publicHome.brand.alt")} />
            <img className="ph-logo-icon" src={HOMEPAGE_ICON} alt={t("publicHome.brand.alt")} />
          </a>

          <nav className="ph-nav-links" aria-label={t("publicHome.nav.aria")}>
            {navItems.map(([href, key]) => (
              <a key={href} href={href}>
                {t(key)}
              </a>
            ))}
          </nav>

          <div className="ph-nav-actions">
            <button type="button" className="ph-lang" onClick={toggleLanguage}>
              {t("publicHome.action.language")}
            </button>
            <Link href="/sign-in" className="ph-login">
              {t("publicHome.action.login")}
            </Link>
            <Link href="/onboarding/company" className="ph-register">
              {t("publicHome.action.register")}
            </Link>
            <button
              type="button"
              className="ph-menu-toggle"
              aria-label={t("publicHome.nav.menu")}
              aria-expanded={menuOpen}
              aria-controls="public-homepage-menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        <div
          id="public-homepage-menu"
          className={`ph-mobile-menu${menuOpen ? " is-open" : ""}`}
          hidden={!menuOpen}
        >
          {navItems.map(([href, key]) => (
            <a key={href} href={href} onClick={closeMenu}>
              {t(key)}
            </a>
          ))}
          <Link href="/sign-in" onClick={closeMenu}>
            {t("publicHome.action.login")}
          </Link>
          <div className="ph-mobile-actions">
            <Link href="/onboarding/company" className="ph-btn ph-btn-primary" onClick={closeMenu}>
              {t("publicHome.action.register")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="ph-hero">
          <div className="ph-wrap ph-hero-grid">
            <div className="ph-hero-copy">
              <span className="ph-eyebrow ph-eyebrow-green">{t("publicHome.hero.eyebrow")}</span>
              <h1>
                <span className="ph-hero-line">{t("publicHome.hero.line1")}</span>
                <span className="ph-hero-line ph-highlight">{t("publicHome.hero.line2")}</span>
              </h1>
              <p className="ph-lead">{t("publicHome.hero.body")}</p>
              <div className="ph-hero-actions">
                <PublicButton href="/onboarding/company" variant="primary">
                  {t("publicHome.action.registerCompany")}
                </PublicButton>
                <PublicButton href="#how" variant="secondary">
                  {t("publicHome.action.seeHow")}
                  <Arrow aria-hidden="true" />
                </PublicButton>
              </div>
              <p className="ph-hero-note">{t("publicHome.hero.note")}</p>
            </div>

            <MockupCard />
          </div>
        </section>

        <section className="ph-trust-strip" aria-label={t("publicHome.trust.aria")}>
          <div className="ph-wrap ph-trust-list">
            {trustItems.map(({ key, icon: Icon }) => (
              <span key={key}>
                <Icon aria-hidden="true" />
                {t(key)}
              </span>
            ))}
          </div>
        </section>

        <section className="ph-section ph-section-surface" id="how">
          <div className="ph-wrap">
            <div className="ph-section-head ph-center">
              <span className="ph-eyebrow">{t("publicHome.how.eyebrow")}</span>
              <h2>{t("publicHome.how.title")}</h2>
              <p className="ph-section-lead">{t("publicHome.how.lead")}</p>
            </div>
            <div className="ph-steps-grid">
              {howSteps.map(({ title, body, icon: Icon }, index) => (
                <article className="ph-step-card" key={title}>
                  <span className="ph-step-num">{index + 1}</span>
                  <Icon className="ph-step-icon" aria-hidden="true" />
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ph-section" id="services">
          <div className="ph-wrap">
            <div className="ph-section-head">
              <span className="ph-eyebrow ph-eyebrow-green">{t("publicHome.services.eyebrow")}</span>
              <h2>{t("publicHome.services.title")}</h2>
            </div>
            <div className="ph-services-grid">
              {services.map(({ title, body, icon: Icon, cta }) => (
                <article className={`ph-service-card${cta ? " ph-service-cta" : ""}`} key={title}>
                  <span className="ph-service-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                  {cta && (
                    <PublicButton href="/onboarding/company" variant="blue">
                      {t("publicHome.action.registerCompany")}
                    </PublicButton>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ph-section ph-section-surface" id="audience">
          <div className="ph-wrap">
            <div className="ph-section-head ph-center">
              <span className="ph-eyebrow">{t("publicHome.audience.eyebrow")}</span>
              <h2>{t("publicHome.audience.title")}</h2>
              <p className="ph-section-lead">{t("publicHome.audience.lead")}</p>
            </div>
            <div className="ph-audience-grid">
              {audienceCards.map(({ icon: Icon, tone, title, body, points }) => (
                <article className="ph-audience-card" key={title}>
                  <div className={`ph-audience-head is-${tone}`}>
                    <span>
                      <Icon aria-hidden="true" />
                    </span>
                    <h3>{t(title)}</h3>
                  </div>
                  <div className="ph-audience-body">
                    <p>{t(body)}</p>
                    <ul>
                      {points.map((point) => (
                        <li key={point}>{t(point)}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ph-section ph-compliance" id="compliance">
          <div className="ph-wrap">
            <div className="ph-section-head ph-center">
              <span className="ph-eyebrow ph-eyebrow-white">{t("publicHome.compliance.eyebrow")}</span>
              <h2>{t("publicHome.compliance.title")}</h2>
            </div>
            <div className="ph-compliance-grid">
              <div className="ph-compliance-list">
                {complianceItems.map(({ icon: Icon, title, body }) => (
                  <article className="ph-compliance-card" key={title}>
                    <span>
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{t(title)}</h3>
                      <p>{t(body)}</p>
                    </div>
                  </article>
                ))}
                <p className="ph-compliance-note">{t("publicHome.compliance.disclaimer")}</p>
              </div>
              <div className="ph-vault" role="img" aria-label={t("publicHome.compliance.vaultAria")}>
                <h3>{t("publicHome.compliance.vaultTitle")}</h3>
                {vaultItems.map(({ icon: Icon, key }) => (
                  <div className="ph-vault-row" key={key}>
                    <span>
                      <Icon aria-hidden="true" />
                    </span>
                    <p>{t(key)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="ph-section" id="about">
          <div className="ph-wrap ph-about-grid">
            <div className="ph-about-copy">
              <span className="ph-eyebrow ph-eyebrow-green">{t("publicHome.about.eyebrow")}</span>
              <h2>{t("publicHome.about.title")}</h2>
              <p>{t("publicHome.about.body")}</p>
              <PublicButton href="/onboarding/company" variant="secondary">
                {t("publicHome.action.registerCompany")}
                <Arrow aria-hidden="true" />
              </PublicButton>
            </div>
            <div className="ph-about-list">
              {aboutItems.map(({ icon: Icon, title, body }) => (
                <article className="ph-about-item" key={title}>
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{t(title)}</h3>
                    <p>{t(body)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ph-section ph-section-surface" id="contact">
          <div className="ph-wrap">
            <div className="ph-section-head ph-center">
              <span className="ph-eyebrow">{t("publicHome.contact.eyebrow")}</span>
              <h2>{t("publicHome.contact.title")}</h2>
              <p className="ph-section-lead">{t("publicHome.contact.lead")}</p>
            </div>
            <div className="ph-contact-grid">
              <a className="ph-contact-card" href="https://wa.me/966504927090" target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                <h3>{t("publicHome.contact.whatsapp.title")}</h3>
                <p>{t("publicHome.contact.whatsapp.body")}</p>
              </a>
              <a className="ph-contact-card" href="mailto:info@tadweerah.com">
                <Mail aria-hidden="true" />
                <h3>{t("publicHome.contact.email.title")}</h3>
                <p>info@tadweerah.com</p>
              </a>
              <a className="ph-contact-card" href="mailto:info@tadweerah.com">
                <HelpCircle aria-hidden="true" />
                <h3>{t("publicHome.contact.support.title")}</h3>
                <p>{t("publicHome.contact.support.body")}</p>
              </a>
            </div>
            <div className="ph-contact-action">
              <PublicButton href="/onboarding/company" variant="primary">
                {t("publicHome.action.registerNow")}
              </PublicButton>
            </div>
          </div>
        </section>

        <section className="ph-final-cta" id="register">
          <div className="ph-wrap">
            <h2>{t("publicHome.final.title")}</h2>
            <p>{t("publicHome.final.body")}</p>
            <div className="ph-final-actions">
              <PublicButton href="/onboarding/company" variant="primary">
                {t("publicHome.action.registerCompany")}
              </PublicButton>
              <PublicButton href="https://wa.me/966504927090" variant="white" external>
                {t("publicHome.action.whatsapp")}
              </PublicButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="ph-footer">
        <div className="ph-wrap">
          <div className="ph-footer-grid">
            <div>
              <span className="ph-footer-chip">
                <img src={HOMEPAGE_LOCKUP} alt={t("publicHome.brand.alt")} />
              </span>
              <p>{t("publicHome.footer.tagline")}</p>
            </div>
            <nav aria-label={t("publicHome.footer.platform")}>
              <h3>{t("publicHome.footer.platform")}</h3>
              <a href="#how">{t("publicHome.nav.how")}</a>
              <a href="#services">{t("publicHome.nav.services")}</a>
              <a href="#audience">{t("publicHome.nav.audience")}</a>
              <a href="#about">{t("publicHome.nav.about")}</a>
            </nav>
            <nav aria-label={t("publicHome.footer.supportLegal")}>
              <h3>{t("publicHome.footer.supportLegal")}</h3>
              <a href="#contact">{t("publicHome.nav.contact")}</a>
              <a href="mailto:info@tadweerah.com">{t("publicHome.footer.support")}</a>
              <Link href="/terms">{t("publicHome.footer.terms")}</Link>
              <a href="mailto:info@tadweerah.com">{t("publicHome.footer.privacy")}</a>
            </nav>
          </div>
          <div className="ph-footer-bottom">
            <span>{t("publicHome.footer.rights")}</span>
            <span>{t("publicHome.footer.made")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
