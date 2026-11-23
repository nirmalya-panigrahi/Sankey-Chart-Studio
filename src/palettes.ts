import { Palette, SampleDataset } from './types';

export const EXECUTIVE_PALETTES: Palette[] = [
  {
    id: 'mckinsey-blues',
    name: 'McKinsey / Consulting Blues',
    colors: ['#003f5c', '#2f4b7c', '#665191', '#a05195', '#d45087', '#f95d6a'],
  },
  {
    id: 'corporate-emerald',
    name: 'Corporate Emerald & Slate',
    colors: ['#1b4332', '#2d6a4f', '#40916c', '#52b788', '#74c69d', '#334155'],
  },
  {
    id: 'terracotta-sand',
    name: 'Warm Terracotta & Sand',
    colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#6d597a'],
  },
  {
    id: 'monochrome-graphite',
    name: 'Monochrome Graphite',
    colors: ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
  },
  {
    id: 'vibrant-tech',
    name: 'Vibrant Tech',
    colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
  },
  {
    id: 'viridis-safe',
    name: 'Colorblind-Safe Viridis',
    colors: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  },
];

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'saas-pnl',
    name: 'SaaS Company P&L ($K)',
    title: 'FY2026 SaaS Income Statement Flow',
    subtitle: 'Revenue streams through gross margin and operating expense allocation ($ in thousands)',
    numberFormat: 'usd',
    rows: [
      { source: 'Enterprise SaaS', target: 'Total Revenue', value: 74000 },
      { source: 'Self-Serve Plans', target: 'Total Revenue', value: 32000 },
      { source: 'Advisory & Services', target: 'Total Revenue', value: 14000 },
      { source: 'Total Revenue', target: 'Gross Profit', value: 96000 },
      { source: 'Total Revenue', target: 'Cost of Revenue', value: 24000 },
      { source: 'Cost of Revenue', target: 'Cloud Hosting', value: 14500 },
      { source: 'Cost of Revenue', target: 'Support & Delivery', value: 9500 },
      { source: 'Gross Profit', target: 'Operating Income', value: 28500 },
      { source: 'Gross Profit', target: 'R&D Engineering', value: 29500 },
      { source: 'Gross Profit', target: 'Sales & Marketing', value: 26000 },
      { source: 'Gross Profit', target: 'General & Admin', value: 12000 },
      { source: 'Operating Income', target: 'Net Income', value: 21800 },
      { source: 'Operating Income', target: 'Income Tax', value: 6700 },
    ],
  },
  {
    id: 'gtm-funnel',
    name: 'Enterprise GTM Pipeline',
    title: 'Q3 Go-To-Market Pipeline Conversion',
    subtitle: 'Lead acquisition channels to qualified pipeline and closed-won ARR ($K)',
    numberFormat: 'compact',
    rows: [
      { source: 'Organic Search', target: 'Marketing Qualified', value: 4200 },
      { source: 'Outbound SDR', target: 'Marketing Qualified', value: 3100 },
      { source: 'Partner Ecosystem', target: 'Marketing Qualified', value: 1900 },
      { source: 'Events & Field', target: 'Marketing Qualified', value: 1400 },
      { source: 'Marketing Qualified', target: 'Sales Accepted', value: 6400 },
      { source: 'Marketing Qualified', target: 'Nurture / Disqualified', value: 4200 },
      { source: 'Sales Accepted', target: 'Closed Won', value: 2450 },
      { source: 'Sales Accepted', target: 'Active Pipeline', value: 2350 },
      { source: 'Sales Accepted', target: 'Closed Lost', value: 1600 },
    ],
  },
  {
    id: 'cloud-spend',
    name: 'Cloud Infrastructure Cost',
    title: 'Annual Cloud Infrastructure Allocation',
    subtitle: 'Engineering business units to compute, storage, and observability layers ($)',
    numberFormat: 'usd',
    rows: [
      { source: 'Core Platform', target: 'Compute & K8s', value: 480000 },
      { source: 'Core Platform', target: 'Managed Databases', value: 260000 },
      { source: 'Core Platform', target: 'Data Egress & CDN', value: 110000 },
      { source: 'Analytics Engine', target: 'Data Warehouse', value: 390000 },
      { source: 'Analytics Engine', target: 'Compute & K8s', value: 185000 },
      { source: 'Security & Ops', target: 'Observability & Logs', value: 145000 },
      { source: 'Compute & K8s', target: 'Production', value: 520000 },
      { source: 'Compute & K8s', target: 'Staging & CI', value: 145000 },
      { source: 'Managed Databases', target: 'Production', value: 215000 },
      { source: 'Managed Databases', target: 'Staging & CI', value: 45000 },
      { source: 'Data Warehouse', target: 'Production', value: 340000 },
      { source: 'Data Warehouse', target: 'R&D Sandbox', value: 50000 },
      { source: 'Data Egress & CDN', target: 'Production', value: 110000 },
      { source: 'Observability & Logs', target: 'Production', value: 145000 },
    ],
  },
  {
    id: 'regional-trade',
    name: 'Global Trade Matrix (Chord)',
    title: 'Cross-Regional Capital & Trade Flows',
    subtitle: 'Bidirectional quarterly trade volume across major economic corridors ($B)',
    numberFormat: 'usd',
    recommendedChartType: 'chord',
    rows: [
      { source: 'North America', target: 'Europe', value: 340 },
      { source: 'North America', target: 'APAC', value: 420 },
      { source: 'North America', target: 'Latin America', value: 210 },
      { source: 'Europe', target: 'North America', value: 390 },
      { source: 'Europe', target: 'APAC', value: 280 },
      { source: 'Europe', target: 'MEA', value: 175 },
      { source: 'APAC', target: 'North America', value: 510 },
      { source: 'APAC', target: 'Europe', value: 320 },
      { source: 'APAC', target: 'MEA', value: 195 },
      { source: 'Latin America', target: 'North America', value: 245 },
      { source: 'Latin America', target: 'Europe', value: 115 },
      { source: 'MEA', target: 'Europe', value: 160 },
      { source: 'MEA', target: 'APAC', value: 230 },
    ],
  },
  {
    id: 'ai-cloud-race',
    name: 'AI Cloud Share (Area Bump)',
    title: 'Enterprise AI & Cloud Infrastructure Revenue',
    subtitle: 'Rank trajectory and quarterly run-rate expansion across hyperscalers ($B)',
    numberFormat: 'usd',
    recommendedChartType: 'area-bump',
    rows: [
      { source: 'AWS', target: '2022', value: 78 },
      { source: 'AWS', target: '2023', value: 88 },
      { source: 'AWS', target: '2024', value: 102 },
      { source: 'AWS', target: '2025', value: 118 },
      { source: 'AWS', target: '2026', value: 134 },
      { source: 'Azure', target: '2022', value: 60 },
      { source: 'Azure', target: '2023', value: 76 },
      { source: 'Azure', target: '2024', value: 98 },
      { source: 'Azure', target: '2025', value: 124 },
      { source: 'Azure', target: '2026', value: 148 },
      { source: 'Google Cloud', target: '2022', value: 26 },
      { source: 'Google Cloud', target: '2023', value: 34 },
      { source: 'Google Cloud', target: '2024', value: 46 },
      { source: 'Google Cloud', target: '2025', value: 64 },
      { source: 'Google Cloud', target: '2026', value: 82 },
      { source: 'Oracle Cloud', target: '2022', value: 14 },
      { source: 'Oracle Cloud', target: '2023', value: 19 },
      { source: 'Oracle Cloud', target: '2024', value: 28 },
      { source: 'Oracle Cloud', target: '2025', value: 44 },
      { source: 'Oracle Cloud', target: '2026', value: 66 },
      { source: 'Legacy Hosting', target: '2022', value: 34 },
      { source: 'Legacy Hosting', target: '2023', value: 31 },
      { source: 'Legacy Hosting', target: '2024', value: 26 },
      { source: 'Legacy Hosting', target: '2025', value: 22 },
      { source: 'Legacy Hosting', target: '2026', value: 18 },
    ],
  },
];

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const expanded = trimmed
      .split('')
      .map((c) => c + c)
      .join('');
    return `#${expanded.toLowerCase()}`;
  }
  return null;
}

export function stripHash(hex: string): string {
  return hex.replace(/^#/, '').toUpperCase();
}
