import type { SceneConfig } from '../types';

/**
 * Template: executive-briefing
 *
 * A minimal CISO desk — a tablet, a nameplate, a notebook, and six pieces of
 * collateral laid out in a row. Where `ciso-table` is a working desk mid-
 * campaign, this one is a briefing: fewer objects, more space, one thing at a
 * time.
 *
 * WHAT MAKES THIS TEMPLATE DIFFERENT: none of the six documents carry printed
 * copy. Their covers are generic — a shield, a city photo, four icon rows, a
 * signature. That makes this the most reusable template of the three: the same
 * artwork serves a banking brief, a healthcare brief or a board pack, because
 * the labels come entirely from config rather than from the picture.
 *
 * The labels below are therefore defaults, not descriptions. Change them
 * freely; nothing in the artwork contradicts you.
 *
 * MAPPING RULE: a prop earns a hotspot when it carries content — printed copy,
 * a document, a screen, a person. Objects that are only set dressing (mugs,
 * pens, plants, staplers) stay decorative no matter how neat a metaphor they
 * would make. A visitor who clicks a mug and gets a modal learns that hotspots
 * on this scene are unpredictable, and stops trusting the ones that matter.
 *
 * Decorative here: both plants, the coffee cup and the pen.
 *
 * Coordinates are percentages of the 1536 × 1024 source. Open
 * `/executive-briefing?edit=1` to see the boxes over the artwork.
 *
 * NOTE ON ASSETS: paths under `/scene/shared/` are placeholders — every
 * hotspot responds, but the files need dropping in.
 */

/** The six collateral cards share a top and bottom edge. */
const DOC_ROW = { y: 48.3, h: 39.2 };

const docCard = (x: number, w: number) =>
  ({ layout: 'freeform', x, y: DOC_ROW.y, w, h: DOC_ROW.h }) as const;

export const executiveBriefing: SceneConfig = {
  id: 'executive-briefing',

  routes: [
    {
      site: 'asat',
      slug: 'executive-briefing',
      canonical: true,
      indexable: true,
      status: 'live',
      publishedAt: '2026-08-30',
    },
  ],

  preset: 'desk',
  layout: 'freeform',

  audience: {
    prefix: 'Briefing prepared for',
    nameplate: 'Chief Information Security Officers',
  },

  stage: {
    background: {
      src: '/scene/stages/executive-briefing.webp',
      width: 1536,
      height: 1024,
      alt:
        'A minimal executive desk viewed from above: a CISO nameplate, a tablet ' +
        'playing a security video, a leather notebook, and six document covers ' +
        'laid out in a row.',
    },
    theme: 'dark',
    // The plaque reads "CISO / CHIEF INFORMATION SECURITY OFFICER" in the
    // artwork, so no overlay nameplate — printed text under rendered text
    // looks like a bug.
  },

  chrome: 'full',

  banner: {
    text: 'The short version: what we do, what it costs, what changes.',
    cta: { label: 'Book a walkthrough', href: '/request-demo' },
  },

  items: [
    /* ================= desk ================= */

    {
      id: 'ciso-card',
      kind: 'card',
      label: 'Your programme lead',
      hint: 'View contact details',
      person: {
        name: 'Adam Tanjil',
        title: 'CEO & Chairman, Aspire Tech',
        photo: '/scene/shared/people/adam-tanjil.jpg',
        email: 'tanjil@aspiretss.com',
        phones: [{ label: 'USA', number: '+1 (917) 600-9233' }],
        address: '11 Broadway, New York, NY 10004, USA',
        website: 'https://www.securityawarenesstraining.ai',
      },
      social: [
        {
          network: 'linkedin',
          href: 'https://www.linkedin.com/company/aspire-tech-security-awareness-training',
        },
      ],
      vcard: '/api/scene/vcard/ciso-card',
      placement: { layout: 'freeform', x: 9.8, y: 8.3, w: 17.1, h: 11.9 },
    },

    // The screen already shows a player at 02:45, so this has to be a video —
    // anything else contradicts what the visitor is looking at.
    {
      id: 'briefing-video',
      kind: 'auto',
      label: 'The two-minute briefing',
      hint: 'Watch before you read anything else',
      src: '/scene/shared/video/executive-briefing.mp4',
      poster: '/scene/shared/video/executive-briefing-poster.jpg',
      placement: { layout: 'freeform', x: 30.5, y: 3.5, w: 39.5, h: 40.5 },
    },

    {
      id: 'notebook',
      kind: 'auto',
      label: 'Cyber Security Awareness Handbook',
      hint: 'The reference, cover to cover',
      src: '/scene/shared/docs/handbook.pdf',
      download: {
        href: '/scene/shared/docs/handbook.pdf',
        filename: 'Aspire-Cyber-Security-Awareness-Handbook.pdf',
        sizeLabel: '583 B',
      },
      placement: { layout: 'freeform', x: 74.2, y: 6.1, w: 13.8, h: 35.7 },
    },

    /* ================= the six documents ================= */

    {
      id: 'doc-executive-brief',
      kind: 'auto',
      label: 'Executive brief',
      hint: 'Two pages, no jargon',
      src: '/scene/shared/docs/executive-brief.pdf',
      download: {
        href: '/scene/shared/docs/executive-brief.pdf',
        filename: 'Aspire-Executive-Brief.pdf',
      },
      placement: docCard(2.3, 15.8),
    },

    {
      id: 'doc-company-overview',
      kind: 'auto',
      label: 'Company overview',
      hint: 'Who we are and who we work with',
      src: '/scene/shared/docs/company-overview.pdf',
      placement: docCard(19.9, 15.3),
    },

    {
      id: 'doc-capabilities',
      kind: 'auto',
      label: 'What the platform does',
      hint: 'Training, simulation, reporting, support',
      src: '/scene/shared/docs/capabilities.pdf',
      placement: docCard(35.7, 15.8),
    },

    // The signature printed on this cover makes it a letter; a PDF viewer
    // would be the wrong frame for it.
    {
      id: 'doc-letter',
      kind: 'letter',
      label: 'A note from the team',
      hint: 'Why we built this the way we did',
      letterheadSrc: '/scene/shared/letterhead-aspire.svg',
      bodyMdx: [
        'Dear {{firstName}},',
        '',
        'Most security awareness programmes fail quietly. Completion hits ' +
          'ninety-five per cent, the board sees a green number, and the next ' +
          'breach still starts with somebody clicking something on a Tuesday ' +
          'morning.',
        '',
        'We built this platform around the number that actually moves: how ' +
          'often your people report something suspicious. That figure only ' +
          'rises when three things are true — they noticed, they judged it ' +
          'worth flagging, and they trusted that flagging it would not make ' +
          'them look foolish.',
        '',
        'The first is training. The other two are culture, and they take longer.',
        '',
        'Everything on this desk exists to shorten that second part.',
      ].join('\n'),
      signature: { name: 'Adam Tanjil', title: 'CEO & Chairman, Aspire Tech' },
      placement: docCard(51.6, 14.3),
    },

    {
      id: 'doc-assurance',
      kind: 'auto',
      label: 'Compliance & certifications',
      hint: 'ISO 27001, SOC 2, GDPR and the rest',
      src: '/scene/shared/docs/compliance-and-certifications.pdf',
      placement: docCard(66.5, 15),
    },

    {
      id: 'doc-reporting',
      kind: 'auto',
      label: 'Reporting & measurement',
      hint: 'What lands on the board pack',
      src: '/scene/shared/docs/reporting-and-measurement.pdf',
      placement: docCard(82.2, 15.4),
    },
  ],

  seo: {
    title: 'Security awareness training — executive briefing',
    description:
      'The short version for security leaders: a two-minute video, a two-page ' +
      'brief, and the compliance, capability and reporting detail behind it.',
    ogImage: '/scene/stages/executive-briefing-og.jpg',
    schema: 'CollectionPage',
  },

  tracking: { campaign: 'executive-briefing', source: 'linkedin' },
};
