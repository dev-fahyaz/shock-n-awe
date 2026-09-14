import type { SceneItem } from '../types';

/**
 * Shared item library.
 *
 * The same handbook appears on the desk, pinned to the board and on the office
 * shelf. Define it ONCE here and reference it by key from any scene, on either
 * brand. Update it here and every scene it appears in updates.
 *
 * Items that are genuinely one-off (a letter written for a single campaign)
 * belong inline in that scene's config, not here.
 */

export const LIBRARY = {
  /* ---------------- Documents ---------------- */

  handbook: {
    id: 'handbook',
    kind: 'pdf',
    label: 'Cyber Security Awareness Handbook',
    hint: 'Read the handbook',
    src: '/scene/shared/docs/handbook.pdf',
    download: {
      href: '/scene/shared/docs/handbook.pdf',
      filename: 'Aspire-Cyber-Security-Awareness-Handbook.pdf',
      sizeLabel: '583 B',
    },
  },

  socBrochure: {
    id: 'soc-brochure',
    kind: 'pdf',
    label: 'Aspire Security Operations Center (A-SOC)',
    hint: 'Read the SOC-as-a-Service brochure',
    src: '/scene/shared/docs/a-soc-brochure.pdf',
    download: {
      href: '/scene/shared/docs/a-soc-brochure.pdf',
      sizeLabel: '589 B',
    },
  },

  buyersGuide: {
    id: 'buyers-guide',
    kind: 'pdf',
    label: "The Business Owners' Guide to I.T. Support Services and Fees",
    hint: 'Read the buyer’s guide',
    src: '/scene/shared/docs/it-buyers-guide.pdf',
    download: {
      href: '/scene/shared/docs/it-buyers-guide.pdf',
      sizeLabel: '590 B',
    },
  },

  criticalQuestions: {
    id: 'critical-questions',
    kind: 'pdf',
    label: '21 Critical I.T. Security Questions',
    hint: 'Read the education guide',
    src: '/scene/shared/docs/21-critical-questions.pdf',
    download: {
      href: '/scene/shared/docs/21-critical-questions.pdf',
      sizeLabel: '596 B',
    },
  },

  digitalShield: {
    id: 'digital-shield',
    kind: 'pdf',
    label: 'Aspire Digital Shield — Monthly Newsletter',
    hint: 'Read this month’s newsletter',
    src: '/scene/shared/docs/aspire-digital-shield.pdf',
  },

  competitorComparison: {
    id: 'competitor-comparison',
    kind: 'pdf',
    label: 'Aspire Tech vs. the Gartner Top 3',
    hint: 'Compare the platforms',
    src: '/scene/shared/docs/competitor-comparison.pdf',
    download: {
      href: '/scene/shared/docs/competitor-comparison.pdf',
      sizeLabel: '596 B',
    },
  },

  /* ---------------- Live pages ---------------- */

  /**
   * A live embed rather than a snapshot. The reference implementation's
   * flipbook of this page has already drifted from the real thing — different
   * salary range, different review count, stale vendor branding.
   */
  trainingProgramme: {
    id: 'training-programme',
    kind: 'embed',
    label: 'Cybersecurity Certification Programme',
    hint: 'Browse the programme',
    src: 'https://aspiretss.com/cybersecurity-certification-new-york',
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups',
  },

  pricing: {
    id: 'pricing',
    kind: 'link',
    label: 'Pricing and packages',
    hint: 'See pricing',
    href: '/pricing',
    target: '_self',
  },

  /* ---------------- Contact ---------------- */

  ceoCard: {
    id: 'ceo-card',
    kind: 'card',
    label: 'Adam Tanjil — CEO & Chairman',
    hint: 'View the business card',
    person: {
      name: 'Adam Tanjil',
      title: 'CEO & Chairman',
      photo: '/scene/shared/people/adam-tanjil.jpg',
      email: 'tanjil@aspiretss.com',
      phones: [
        { label: 'USA', number: '+1 (917) 600-9233' },
        { label: 'BD', number: '+88 01711 506834' },
      ],
      address: '11 Broadway, New York, NY 10004, USA',
      website: 'https://aspiretss.com',
    },
    social: [
      {
        network: 'linkedin',
        href: 'https://www.linkedin.com/company/aspire-tech-services-and-solution-limited',
      },
      { network: 'facebook', href: 'https://www.facebook.com/aspiretss' },
      { network: 'twitter', href: 'https://twitter.com/AspireTechServ3' },
    ],
    vcard: '/api/scene/vcard/ceo-card',
  },

  /* ---------------- Media ---------------- */

  overviewVideo: {
    id: 'overview-video',
    kind: 'video',
    label: 'How Aspire trains your people',
    hint: 'Watch the overview',
    src: '/scene/shared/video/overview.mp4',
    poster: '/scene/shared/video/overview-poster.webp',
    captions: [
      { src: '/scene/shared/video/overview.en.vtt', srclang: 'en', label: 'English' },
    ],
    autoplayMuted: true,
  },

  voiceNote: {
    id: 'voice-note',
    kind: 'audio',
    label: 'A message from the team',
    hint: 'Listen to the message',
    src: '/scene/shared/audio/message.mp3',
    transcript:
      'Thanks for stopping by. Everything on this desk is yours to explore — ' +
      'the handbook, the security questions, and the programme details. ' +
      'If anything raises a question, the card on the right has our direct line.',
  },
} satisfies Record<string, SceneItem>;

export type LibraryKey = keyof typeof LIBRARY;

export const getLibraryItem = (key: string): SceneItem | undefined =>
  (LIBRARY as Record<string, SceneItem>)[key];
