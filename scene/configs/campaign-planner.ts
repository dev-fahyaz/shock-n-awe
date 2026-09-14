import type { Placement, SceneConfig, SceneItem } from '../types';

/**
 * Template: campaign-planner
 *
 * A framed campaign board — five phases across, five rows down, plus a right
 * rail and a timeline. Structurally the opposite of a desk: nothing is
 * scattered, everything is a cell.
 *
 * It still uses the `freeform` strategy, not `grid`. The distinction is where
 * the pixels come from: `grid` draws its own cards in CSS, this one is a
 * photograph of a board and the hotspots sit over it.
 *
 * COVERAGE: every printed element is reachable. Row labels open that row across
 * all five phases; individual cells open one phase's slice of it. So a visitor
 * can read down a column (one phase, end to end) or across a row (one
 * discipline, all phases), which is how people actually use a board like this.
 *
 * MAPPING RULE: a prop earns a hotspot when it carries content — printed copy,
 * a document, a screen, a person. Objects that are only set dressing (mugs,
 * pens, plants, staplers) stay decorative no matter how neat a metaphor they
 * would make. A visitor who clicks a mug and gets a modal learns that hotspots
 * on this scene are unpredictable, and stops trusting the ones that matter.
 *
 * Coordinates are percentages of the 1536 × 1024 source. Open
 * `/campaign-planner?edit=1` to see the boxes over the artwork.
 *
 * NOTE ON ASSETS: paths under `/scene/shared/` are placeholders — every
 * hotspot responds, but the files need dropping in.
 */

/* ------------------------------------------------------------------ *
 * Grid geometry — one place to nudge, rather than forty-six
 * ------------------------------------------------------------------ */

const COL = {
  plan: { x: 16.3, w: 12.2 },
  launch: { x: 29.4, w: 12.3 },
  engage: { x: 42.6, w: 12.4 },
  reinforce: { x: 55.7, w: 12.4 },
  measure: { x: 68.7, w: 12.1 },
} as const;

type ColKey = keyof typeof COL;

/** The left-hand label column. */
const LABEL_COL = { x: 8.3, w: 7.5 };

/** Vertical bands. `y`/`h` describe the visible card, not the row gutter. */
const ROW = {
  phases: { y: 17.4, h: 19.2 },
  assets: { y: 37.5, h: 11.8 },
  activities: { y: 51.6, h: 10.5 },
  audience: { y: 64.5, h: 5.4 },
  metrics: { y: 72.1, h: 8.5 },
} as const;

type RowKey = keyof typeof ROW;

/** Row-label cells sit shorter than their row, aligned to the printed text. */
const LABEL_Y: Record<RowKey, { y: number; h: number }> = {
  phases: { y: 21.5, h: 7.0 },
  assets: { y: 39.0, h: 6.5 },
  activities: { y: 51.6, h: 5.5 },
  audience: { y: 64.9, h: 4.0 },
  metrics: { y: 72.3, h: 5.5 },
};

/** Two asset chips stack inside each column of the assets row. */
const CHIP_INSET = 0.8;
const CHIP = { 1: { y: 38.9, h: 4.5 }, 2: { y: 44.6, h: 4.5 } } as const;

const cell = (c: ColKey, r: RowKey): Placement => ({
  layout: 'freeform',
  x: COL[c].x,
  y: ROW[r].y,
  w: COL[c].w,
  h: ROW[r].h,
});

const rowLabel = (r: RowKey): Placement => ({
  layout: 'freeform',
  x: LABEL_COL.x,
  y: LABEL_Y[r].y,
  w: LABEL_COL.w,
  h: LABEL_Y[r].h,
});

const chip = (c: ColKey, slot: 1 | 2): Placement => ({
  layout: 'freeform',
  x: COL[c].x + CHIP_INSET,
  y: CHIP[slot].y,
  w: COL[c].w - CHIP_INSET * 2,
  h: CHIP[slot].h,
});

/** The five pillar rows inside the dark right-hand card. */
const pillar = (index: 0 | 1 | 2 | 3 | 4): Placement => ({
  layout: 'freeform',
  x: 81.9,
  y: 50.8 + index * 5.65,
  w: 11.2,
  h: 4.4,
});

/* ------------------------------------------------------------------ *
 * Row content — keeps the item list readable
 * ------------------------------------------------------------------ */

type Placed = SceneItem & { placement: Placement };

const doc = (
  id: string,
  label: string,
  hint: string,
  file: string,
  placement: Placement,
): Placed => ({
  id,
  kind: 'auto',
  label,
  hint,
  src: `/scene/shared/docs/${file}`,
  placement,
});

const PHASES: { key: ColKey; n: number; name: string; weeks: string; blurb: string }[] = [
  { key: 'plan', n: 1, name: 'Plan', weeks: 'weeks 1–2', blurb: 'Lay the foundation: goals, audience, key messages' },
  { key: 'launch', n: 2, name: 'Launch', weeks: 'weeks 3–4', blurb: 'Kick off with impact and excitement' },
  { key: 'engage', n: 3, name: 'Engage', weeks: 'weeks 5–8', blurb: 'Deliver content and drive participation' },
  { key: 'reinforce', n: 4, name: 'Reinforce', weeks: 'weeks 9–10', blurb: 'Reinforce behaviours with reminders, stories, challenges' },
  { key: 'measure', n: 5, name: 'Measure', weeks: 'weeks 11–12', blurb: 'Measure impact, celebrate success, optimise' },
];

const ACTIVITIES: Record<ColKey, string> = {
  plan: 'Define objectives · Identify audience · Build content plan · Prepare assets',
  launch: 'Executive kickoff · Send launch email · Publish posters · Share on channels',
  engage: 'Weekly topics · Run quizzes · Share real stories · Encourage participation',
  reinforce: 'Run challenges · Share success stories · Send reminders · Manager engagement',
  measure: 'Track participation · Measure behaviour · Collect feedback · Report results',
};

const AUDIENCE: Record<ColKey, string> = {
  plan: 'Leadership · IT & security teams',
  launch: 'All employees, company wide',
  engage: 'Employees · People managers',
  reinforce: 'High-risk groups · Department leads',
  measure: 'Leadership · Security champions',
};

const METRICS: Record<ColKey, string> = {
  plan: 'Plan completed · Assets ready · Channels confirmed',
  launch: 'Launch reach · Email open rate · Intranet views',
  engage: 'Content engagement · Quiz participation · Behaviour adoption',
  reinforce: 'Challenge participation · Story submissions · Repeat engagement',
  measure: 'Training completion · Survey score · Risk reduction',
};

const PILLARS = [
  { id: 'think-before-you-click', name: 'Think Before You Click', sub: 'Stay alert to phishing threats' },
  { id: 'protect-your-data', name: 'Protect Your Data', sub: 'Keep company data secure' },
  { id: 'secure-every-device', name: 'Secure Every Device', sub: 'Lock it. Update it. Protect it.' },
  { id: 'speak-up-report-it', name: 'Speak Up, Report It', sub: 'Report suspicious activity' },
  { id: 'stronger-together', name: 'Stronger Together', sub: 'We all play a role in security' },
] as const;

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

export const campaignPlanner: SceneConfig = {
  id: 'campaign-planner',

  routes: [
    {
      site: 'asat',
      slug: 'campaign-planner',
      canonical: true,
      indexable: true,
      status: 'live',
      publishedAt: '2026-08-30',
    },
  ],

  preset: 'board',
  layout: 'freeform',

  audience: {
    prefix: 'Campaign plan for',
    nameplate: 'Security Awareness Month',
  },

  stage: {
    background: {
      src: '/scene/stages/campaign-planner.webp',
      width: 1536,
      height: 1024,
      alt:
        'A framed campaign planning board for Security Awareness Month, laid ' +
        'out as five phases — Plan, Launch, Engage, Reinforce and Measure — ' +
        'across rows for campaign assets, key activities, audience and success ' +
        'metrics, with a timeline along the bottom.',
    },
    theme: 'light',
    // Title, subtitle and logo are printed on the board; no overlay nameplate.
  },

  chrome: 'full',

  banner: {
    text: 'Twelve weeks, five phases, every asset in one place.',
    cta: { label: 'Plan your campaign', href: '/request-demo' },
  },

  items: [
    /* ================= header ================= */

    {
      id: 'brand',
      kind: 'link',
      label: 'Aspire TSS — Securing Tomorrow, Together',
      hint: 'Visit the programme',
      href: '/',
      placement: { layout: 'freeform', x: 6.5, y: 5.7, w: 17, h: 6.5 },
    },

    doc(
      'campaign-overview',
      'Security Awareness Month — the whole campaign',
      'Plan. Educate. Empower. Protect.',
      'awareness-month-overview.pdf',
      { layout: 'freeform', x: 26, y: 6.1, w: 44.9, h: 9.6 },
    ),

    {
      id: 'campaign-goal',
      kind: 'letter',
      label: 'Our goal',
      hint: 'Why this campaign exists',
      bodyMdx: [
        '{{firstName}},',
        '',
        'Build a security-first culture where every employee takes ownership of ' +
          'security, every day.',
        '',
        'That is the goal, and it is deliberately not "reduce click rate by ' +
          'thirty per cent". A number moves for a quarter. A culture holds when ' +
          'the campaign ends, which is the only test that matters.',
        '',
        'Everything on this board is in service of that one sentence.',
      ].join('\n'),
      signature: { name: 'Aspire Tech', title: 'Security Awareness Training' },
      placement: { layout: 'freeform', x: 81.3, y: 5.4, w: 11.5, h: 14.6 },
    },

    /* ================= row labels — a row across all phases ================= */

    doc(
      'row-phases',
      'All five campaign phases',
      'The twelve-week arc, end to end',
      'campaign-phases.pdf',
      rowLabel('phases'),
    ),

    /**
     * The assets row label is the one place on this board that names the
     * toolkit as a whole, so it becomes the door to the desk scene where all
     * of it lives — the board is the plan, the desk is the kit.
     */
    {
      id: 'open-toolkit-desk',
      kind: 'scene',
      label: 'Open the full toolkit',
      hint: 'Every asset, laid out on the desk',
      targetId: 'ciso-table',
      transition: 'zoom',
      placement: rowLabel('assets'),
    },

    doc(
      'row-activities',
      'Key activities across every phase',
      'What the team actually does, week by week',
      'key-activities.pdf',
      rowLabel('activities'),
    ),
    doc(
      'row-audience',
      'Audience map',
      'Who each phase is aimed at',
      'audience-map.pdf',
      rowLabel('audience'),
    ),
    doc(
      'row-metrics',
      'Success metrics',
      'What we measure, and why those numbers',
      'success-metrics.pdf',
      rowLabel('metrics'),
    ),

    /* ================= row 1 — phase headers ================= */

    ...PHASES.map(p =>
      doc(
        `phase-${p.key}`,
        `Phase ${p.n} — ${p.name} (${p.weeks})`,
        p.blurb,
        `phase-${p.n}-${p.key}.pdf`,
        cell(p.key, 'phases'),
      ),
    ),

    /* ================= row 2 — campaign assets ================= */

    {
      id: 'asset-teaser-poster',
      kind: 'auto',
      label: 'Campaign teaser poster',
      hint: 'Download the poster',
      src: '/scene/shared/posters/campaign-teaser.png',
      placement: chip('plan', 1),
    },
    {
      id: 'asset-email-announcement',
      kind: 'auto',
      label: 'Email announcement',
      hint: 'The announcement template',
      src: '/scene/shared/docs/email-announcement.docx',
      placement: chip('plan', 2),
    },

    // Paste a YouTube, Vimeo or Loom URL here and it resolves to that player.
    {
      id: 'asset-launch-video',
      kind: 'auto',
      label: 'Launch video',
      hint: 'Watch the kickoff film',
      src: '/scene/shared/video/launch.mp4',
      placement: chip('launch', 1),
    },
    {
      id: 'asset-kickoff-email',
      kind: 'auto',
      label: 'Kickoff email & intranet post',
      hint: 'Both templates',
      src: '/scene/shared/docs/kickoff-email-and-intranet.docx',
      placement: chip('launch', 2),
    },

    {
      id: 'asset-weekly-tips',
      kind: 'auto',
      label: 'Weekly tips',
      hint: 'Eight weeks of ready-to-send tips',
      src: '/scene/shared/docs/weekly-tips.pdf',
      placement: chip('engage', 1),
    },
    {
      id: 'asset-quizzes',
      kind: 'auto',
      label: 'Quizzes & mini challenges',
      hint: 'Run them as-is or edit',
      src: '/scene/shared/docs/quizzes-and-challenges.pdf',
      placement: chip('engage', 2),
    },

    {
      id: 'asset-success-stories',
      kind: 'auto',
      label: 'Success stories',
      hint: 'Real reports, told well',
      src: '/scene/shared/docs/success-stories.pdf',
      placement: chip('reinforce', 1),
    },
    {
      id: 'asset-infographics',
      kind: 'auto',
      label: 'Infographics & reminders',
      hint: 'Signage and screensaver pack',
      src: '/scene/shared/downloads/infographics-and-reminders.zip',
      placement: chip('reinforce', 2),
    },

    {
      id: 'asset-impact-report',
      kind: 'auto',
      label: 'Impact report template',
      hint: 'What you present at the end',
      src: '/scene/shared/docs/impact-report-template.pptx',
      placement: chip('measure', 1),
    },
    {
      id: 'asset-survey',
      kind: 'auto',
      label: 'Survey & feedback',
      hint: 'Questions that produce usable answers',
      src: '/scene/shared/docs/survey-and-feedback.pdf',
      placement: chip('measure', 2),
    },

    /* ================= row 3 — key activities ================= */

    ...PHASES.map(p =>
      doc(
        `activities-${p.key}`,
        `${p.name} — key activities`,
        ACTIVITIES[p.key],
        `activities-${p.key}.pdf`,
        cell(p.key, 'activities'),
      ),
    ),

    /* ================= row 4 — audience ================= */

    ...PHASES.map(p =>
      doc(
        `audience-${p.key}`,
        `${p.name} — audience`,
        AUDIENCE[p.key],
        `audience-${p.key}.pdf`,
        cell(p.key, 'audience'),
      ),
    ),

    /* ================= row 5 — success metrics ================= */

    ...PHASES.map(p =>
      doc(
        `metrics-${p.key}`,
        `${p.name} — success metrics`,
        METRICS[p.key],
        `metrics-${p.key}.pdf`,
        cell(p.key, 'metrics'),
      ),
    ),

    /* ================= right rail ================= */

    doc(
      'top-priorities',
      'Top priorities',
      'Engage, reduce risk, measure, build culture',
      'top-priorities.pdf',
      { layout: 'freeform', x: 81.1, y: 23.4, w: 12.7, h: 19.5 },
    ),

    doc(
      'campaign-pillars',
      'The five campaign pillars',
      'The message underneath every asset',
      'campaign-pillars.pdf',
      { layout: 'freeform', x: 80.7, y: 43.8, w: 13.3, h: 6.4 },
    ),

    // Each pillar is a distinct theme with its own poster and tip sheet, so
    // each gets its own hotspot rather than hiding inside the card.
    ...PILLARS.map((p, i) =>
      doc(
        `pillar-${p.id}`,
        p.name,
        p.sub,
        `pillar-${p.id}.pdf`,
        pillar(i as 0 | 1 | 2 | 3 | 4),
      ),
    ),

    /* ================= bottom ================= */

    {
      id: 'timeline',
      kind: 'auto',
      label: 'Twelve-week timeline',
      hint: 'The whole campaign on one page',
      src: '/scene/shared/docs/campaign-timeline.pdf',
      download: {
        href: '/scene/shared/docs/campaign-timeline.pdf',
        filename: 'Awareness-Month-Timeline.pdf',
      },
      placement: { layout: 'freeform', x: 8.5, y: 83.8, w: 68.4, h: 9 },
    },

    {
      id: 'closing-note',
      kind: 'letter',
      label: 'Small actions. Big impact. Stronger together.',
      hint: 'The line the whole campaign hangs on',
      bodyMdx: [
        'Small actions. Big impact. Stronger together.',
        '',
        'Three sentences, on a sticky note, at the bottom of a board that took ' +
          'twelve weeks to plan. That is not an accident.',
        '',
        'Everything above — the phases, the assets, the metrics — exists to make ' +
          'one idea survive contact with a busy Tuesday. If a colleague can ' +
          'repeat the line back to you in November, the campaign worked.',
      ].join('\n'),
      signature: { name: 'Aspire Tech', title: 'Security Awareness Training' },
      placement: { layout: 'freeform', x: 78, y: 82.8, w: 13.2, h: 12.7 },
    },
  ],

  seo: {
    title: 'Security Awareness Month campaign planner',
    description:
      'A twelve-week Awareness Month campaign in five phases — plan, launch, ' +
      'engage, reinforce, measure — with every asset, audience and success ' +
      'metric mapped out.',
    ogImage: '/scene/stages/campaign-planner-og.jpg',
    schema: 'CollectionPage',
  },

  tracking: { campaign: 'awareness-month-2026', source: 'linkedin' },
};
