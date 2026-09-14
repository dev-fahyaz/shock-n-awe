import type { SceneConfig } from '../types';

/**
 * The first scene: an executive desk aimed at financial-services security
 * leaders in New York.
 *
 * Hotspot percentages match the prop positions drawn in
 * `public/scene/stages/walnut-desk.svg`. Use `?edit=1` in development to drag
 * them and copy the updated numbers back here.
 */
export const nycDesk: SceneConfig = {
  id: 'nyc-financial-desk',

  routes: [
    {
      site: 'asat',
      slug: 'nyc-security-desk',
      canonical: true,
      indexable: true,
      status: 'live',
      publishedAt: '2026-08-30',
    },
    {
      site: 'aspire',
      slug: 'nyc-desk',
      // Not canonical and not indexable — the ASAT route above owns the
      // search listing, so these two never compete with each other.
      indexable: false,
      status: 'live',
    },
  ],

  preset: 'desk',
  layout: 'freeform',

  audience: {
    prefix: 'Customized for the desk of',
    nameplate: 'Financial Services Security Leaders',
  },

  stage: {
    background: {
      src: '/scene/stages/walnut-desk.svg',
      width: 2400,
      height: 1400,
      alt:
        'An executive desk viewed from above, with a monitor, phone, business ' +
        'card, printed letter and several brochures laid out on a leather pad.',
    },
    theme: 'walnut',
    // The drawn desk leaves the plaque blank for exactly this.
    nameplate: { layout: 'freeform', x: 5, y: 4, w: 21, h: 9 },
  },

  chrome: 'full',

  banner: {
    text: 'Reduce phishing risk across your workforce in 90 days.',
    cta: { label: 'Book a walkthrough', href: '/request-demo' },
  },

  items: [
    // Monitor — the opening move.
    {
      ref: 'overviewVideo',
      placement: { layout: 'freeform', x: 34, y: 5, w: 30, h: 37 },
    },

    // Business card, top right.
    {
      ref: 'ceoCard',
      placement: { layout: 'freeform', x: 71.5, y: 7, w: 17, h: 13, rotate: -3 },
    },

    // Phone, left edge.
    {
      ref: 'voiceNote',
      placement: { layout: 'freeform', x: 7.5, y: 17, w: 10, h: 29, rotate: 4 },
    },

    // Programme brochure — a LIVE embed, so it can never go stale.
    {
      ref: 'trainingProgramme',
      placement: { layout: 'freeform', x: 66, y: 25, w: 19, h: 34, rotate: 5 },
    },

    // The letter is written for this campaign only, so it lives inline
    // rather than in the shared library.
    {
      id: 'nyc-letter',
      kind: 'letter',
      label: 'A note from Adam Tanjil',
      hint: 'Read the letter',
      letterheadSrc: '/scene/shared/letterhead-aspire.svg',
      bodyMdx: [
        'Dear {{firstName}},',
        '',
        'Ninety per cent of the breaches we are called into started with one ' +
          'person clicking one thing. Not a firewall gap. A Tuesday morning and ' +
          'a convincing email.',
        '',
        'That is the part most security budgets underfund, and it is the part ' +
          'we fix. Aspire runs continuous, role-aware awareness training with ' +
          'phishing simulations built from the lures actually circulating in ' +
          'your sector — not last year’s generic templates.',
        '',
        'Everything on this desk is yours. The handbook covers the threat ' +
          'landscape as it stands today. The 21 questions are the ones I would ' +
          'ask any vendor, including us.',
        '',
        'If you would rather just talk, my direct line is on the card.',
      ].join('\n'),
      signature: { name: 'Adam Tanjil', title: 'CEO & Chairman, Aspire Tech' },
      placement: { layout: 'freeform', x: 33, y: 47, w: 23, h: 45, rotate: -2 },
    },

    // Buyer's guide, lower left.
    {
      ref: 'buyersGuide',
      placement: { layout: 'freeform', x: 5.5, y: 51, w: 19, h: 33, rotate: -6 },
    },

    // Bottom row of folder documents.
    {
      ref: 'handbook',
      placement: { layout: 'freeform', x: 60, y: 64, w: 12, h: 25 },
    },
    {
      ref: 'socBrochure',
      placement: { layout: 'freeform', x: 73.5, y: 64, w: 12, h: 25 },
    },
    {
      ref: 'criticalQuestions',
      placement: { layout: 'freeform', x: 87, y: 64, w: 11, h: 25 },
    },
  ],

  seo: {
    title: 'Security Awareness Training for New York Financial Services',
    description:
      'A working desk of resources for financial-services security leaders: ' +
      'the awareness handbook, 21 vendor questions, SOC-as-a-Service and the ' +
      'NYC certification programme.',
    ogImage: '/scene/stages/walnut-desk-og.png',
    schema: 'CollectionPage',
  },

  tracking: { campaign: 'nyc-financial-2026', source: 'linkedin' },
};
