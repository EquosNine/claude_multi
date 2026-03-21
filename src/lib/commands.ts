import type { SlashCommand } from './types';

export const SLASH_COMMANDS: SlashCommand[] = [
  // Client-side
  { cmd: "/clear",    desc: "Clear panel output",      cat: "client", type: "client" },
  { cmd: "/resume",   desc: "Resume a previous session", cat: "client", type: "client" },
  { cmd: "/help",     desc: "Show available commands",  cat: "client", type: "client" },

  // Dev tools
  { cmd: "/simplify",       desc: "Review code for reuse & quality",           cat: "dev", type: "skill" },
  { cmd: "/imma3-plan",     desc: "Plan features & generate tasks",            cat: "dev", type: "skill" },
  { cmd: "/imma3-execute",  desc: "Execute tasks with parallel agents",        cat: "dev", type: "skill" },
  { cmd: "/imma3-review",   desc: "Review code & capture learnings",           cat: "dev", type: "skill" },
  { cmd: "/claude-api",     desc: "Build apps with Claude API",                cat: "dev", type: "skill" },

  // EQUOS project
  { cmd: "/equos-spec-plan",    desc: "Create objective + context for a feature", cat: "equos", type: "skill" },
  { cmd: "/equos-spec-proceed", desc: "Generate task list from approved plan",    cat: "equos", type: "skill" },
  { cmd: "/equos-autopilot",    desc: "Execute tasks with parallel execution",    cat: "equos", type: "skill" },

  // SEO
  { cmd: "/seo-audit",          desc: "Full technical & on-page SEO audit",       cat: "seo", type: "skill" },
  { cmd: "/keyword-research",   desc: "Find keywords via SemRush",                cat: "seo", type: "skill" },
  { cmd: "/serp-analyzer",      desc: "Analyze Google search results",            cat: "seo", type: "skill" },
  { cmd: "/search-console",     desc: "Pull Google Search Console data",          cat: "seo", type: "skill" },
  { cmd: "/semrush-research",   desc: "SEO & competitive intelligence",           cat: "seo", type: "skill" },
  { cmd: "/backlink-audit",     desc: "Audit domain backlink profile",            cat: "seo", type: "skill" },
  { cmd: "/schema-markup",      desc: "Generate Schema.org JSON-LD",              cat: "seo", type: "skill" },
  { cmd: "/programmatic-seo",   desc: "SEO pages at scale",                       cat: "seo", type: "skill" },
  { cmd: "/seo-content-brief",  desc: "Create SEO content brief",                 cat: "seo", type: "skill" },

  // Content
  { cmd: "/write-blog",          desc: "Generate SEO-optimized blog post",        cat: "content", type: "skill" },
  { cmd: "/write-landing",       desc: "Create landing page copy",                cat: "content", type: "skill" },
  { cmd: "/copywriting",         desc: "Marketing copy for any page",             cat: "content", type: "skill" },
  { cmd: "/copy-editing",        desc: "Line-by-line copy editing",               cat: "content", type: "skill" },
  { cmd: "/content-strategy",    desc: "Build content strategy & clusters",       cat: "content", type: "skill" },
  { cmd: "/content-calendar",    desc: "Plan content & posting schedule",         cat: "content", type: "skill" },
  { cmd: "/content-gap-analysis",desc: "Find content gaps vs competitors",        cat: "content", type: "skill" },
  { cmd: "/content-repurposing", desc: "Repurpose content across formats",        cat: "content", type: "skill" },
  { cmd: "/lead-magnet",         desc: "Create lead magnets & gated content",     cat: "content", type: "skill" },
  { cmd: "/thread-writer",       desc: "Write viral threads & posts",             cat: "content", type: "skill" },

  // Ads & Paid
  { cmd: "/google-ads",         desc: "Write Google Ads copy & campaigns",        cat: "ads", type: "skill" },
  { cmd: "/google-ads-report",  desc: "Pull Google Ads performance data",         cat: "ads", type: "skill" },
  { cmd: "/facebook-ads",       desc: "Create Facebook/Meta ad campaigns",        cat: "ads", type: "skill" },
  { cmd: "/linkedin-ads",       desc: "Create LinkedIn ad campaigns",             cat: "ads", type: "skill" },
  { cmd: "/video-ad-analysis",  desc: "Analyze video ad creatives",               cat: "ads", type: "skill" },

  // Social
  { cmd: "/social-content",     desc: "Create social posts for all platforms",    cat: "social", type: "skill" },
  { cmd: "/linkedin-content",   desc: "Write LinkedIn posts & strategy",          cat: "social", type: "skill" },
  { cmd: "/bluesky",            desc: "Create Bluesky content",                   cat: "social", type: "skill" },
  { cmd: "/reddit-marketing",   desc: "Market on Reddit authentically",           cat: "social", type: "skill" },
  { cmd: "/podcast-marketing",  desc: "Plan & market a podcast",                  cat: "social", type: "skill" },
  { cmd: "/youtube-analytics",  desc: "Analyze YouTube performance",              cat: "social", type: "skill" },
  { cmd: "/newsletter",         desc: "Plan & grow email newsletter",             cat: "social", type: "skill" },

  // Marketing Strategy
  { cmd: "/competitor-analysis", desc: "Full competitor strategy breakdown",       cat: "strategy", type: "skill" },
  { cmd: "/growth-strategy",    desc: "Build growth strategy & metrics",           cat: "strategy", type: "skill" },
  { cmd: "/launch-strategy",    desc: "Plan product launch week-by-week",          cat: "strategy", type: "skill" },
  { cmd: "/demand-gen",         desc: "Build demand gen & pipeline strategy",      cat: "strategy", type: "skill" },
  { cmd: "/pricing-strategy",   desc: "Optimize pricing models & pages",           cat: "strategy", type: "skill" },
  { cmd: "/product-marketing",  desc: "Positioning, messaging, GTM",               cat: "strategy", type: "skill" },
  { cmd: "/icp-builder",        desc: "Define ideal customer profiles",            cat: "strategy", type: "skill" },
  { cmd: "/marketing-ideas",    desc: "139 proven marketing ideas",                cat: "strategy", type: "skill" },
  { cmd: "/ab-test-setup",      desc: "Design & analyze A/B tests",               cat: "strategy", type: "skill" },
  { cmd: "/brand-monitor",      desc: "Monitor brand mentions & sentiment",        cat: "strategy", type: "skill" },
  { cmd: "/referral-program",   desc: "Design referral & viral loops",             cat: "strategy", type: "skill" },
  { cmd: "/affiliate-marketing",desc: "Build affiliate program",                   cat: "strategy", type: "skill" },

  // CRO
  { cmd: "/page-cro",           desc: "Audit & optimize pages for conversion",    cat: "cro", type: "skill" },
  { cmd: "/signup-flow-cro",    desc: "Optimize signup conversion funnels",        cat: "cro", type: "skill" },
  { cmd: "/onboarding-cro",     desc: "Improve onboarding activation",            cat: "cro", type: "skill" },

  // Email
  { cmd: "/email-sequence",     desc: "Create email drip campaigns",              cat: "email", type: "skill" },
  { cmd: "/email-subject-lines",desc: "Generate & test email subjects",           cat: "email", type: "skill" },

  // Integrations
  { cmd: "/hubspot",            desc: "Manage HubSpot CRM & content",             cat: "integrations", type: "skill" },
  { cmd: "/apollo-outreach",    desc: "Research & enrich B2B leads",              cat: "integrations", type: "skill" },
  { cmd: "/google-analytics",   desc: "Pull GA4 reports & insights",              cat: "integrations", type: "skill" },
  { cmd: "/slack-bot",          desc: "Send messages to Slack",                   cat: "integrations", type: "skill" },
  { cmd: "/discord-bot",        desc: "Send content to Discord",                  cat: "integrations", type: "skill" },
  { cmd: "/telegram-bot",       desc: "Send content to Telegram",                cat: "integrations", type: "skill" },
  { cmd: "/feishu-lark",        desc: "Send messages to Feishu/Lark",            cat: "integrations", type: "skill" },
  { cmd: "/domain-research",    desc: "WHOIS & domain marketplace lookup",        cat: "integrations", type: "skill" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  client: "Panel",
  dev: "Development",
  equos: "EQUOS",
  seo: "SEO",
  content: "Content",
  ads: "Ads & Paid",
  social: "Social",
  strategy: "Strategy",
  cro: "CRO",
  email: "Email",
  integrations: "Integrations",
};

export const CATEGORY_COLORS: Record<string, string> = {
  client: "var(--text-dim)",
  dev: "var(--green)",
  equos: "var(--accent)",
  seo: "var(--orange)",
  content: "var(--blue)",
  ads: "#e879f9",
  social: "#22d3ee",
  strategy: "var(--orange)",
  cro: "var(--green)",
  email: "var(--blue)",
  integrations: "var(--text-dim)",
};
