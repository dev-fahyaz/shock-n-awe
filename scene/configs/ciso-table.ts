import type { SceneConfig } from '../types';

/**
 * Template: ciso-table
 *
 * A CISO's desk during Security Awareness Month.
 *
 * COVERAGE: every printed element carrying a message is reachable — the title
 * block, all four sticky notes, every document and poster.
 *
 * MAPPING RULE: a prop earns a hotspot when it carries content — printed copy,
 * a document, a screen, a person. Objects that are only set dressing (mugs,
 * pens, plants, staplers) stay decorative no matter how neat a metaphor they
 * would make. A visitor who clicks a mug and gets a modal learns that hotspots
 * on this scene are unpredictable, and stops trusting the ones that matter.
 *
 * Decorative here: the plant, the mug, the pens and the highlighter.
 *
 * Coordinates are percentages of the 1536 × 1024 source. Open
 * `/security-awareness-month?edit=1` to see the boxes over the artwork.
 *
 * NOTE ON ASSETS: paths under `/scene/shared/` are placeholders — the scene
 * renders and every hotspot responds, but the documents themselves need to be
 * dropped in. Items pointing at live site routes work today.
 */
export const cisoTable: SceneConfig = {
  id: 'ciso-table',

  routes: [
    {
      site: 'asat',
      slug: 'security-awareness-month',
      canonical: true,
      indexable: true,
      status: 'live',
      publishedAt: '2026-08-30',
    },
  ],

  // The board is the plan; this desk is the kit it points at.
  parent: 'campaign-planner',

  preset: 'desk',
  layout: 'freeform',

  audience: {
    prefix: 'Prepared for',
    nameplate: 'Security Awareness Month Planners',
  },

  stage: {
    background: {
      src: '/scene/stages/ciso-table.webp',
      width: 1536,
      height: 1024,
      alt:
        'A security leader’s desk laid out for Security Awareness Month: a CISO ' +
        'nameplate, campaign strategy notebook, poster bundle on a tablet, a ' +
        'toolkit guide, communication plan, video concepts and a measurement ' +
        'clipboard.',
    },
    theme: 'dark',
    // No nameplate overlay: the artwork already carries a printed CISO plaque
    // and a title block. Text on top of printed text reads as a rendering bug.
    // The audience name still heads the mobile list.
  },

  chrome: 'full',

  banner: {
    text: 'Everything you need to plan, promote and measure Awareness Month.',
    cta: { label: 'Get the toolkit', href: '/request-demo' },
  },

  items: [
    /* ---------------- top band ---------------- */

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
      placement: { layout: 'freeform', x: 0.5, y: 1.2, w: 19.7, h: 8.6 },
    },

    {
      id: 'at-a-glance',
      kind: 'auto',
      label: 'Awareness Month at a glance',
      hint: 'The four-week plan',
      src: '/scene/shared/docs/awareness-month-at-a-glance.pdf',
      download: {
        href: '/scene/shared/docs/awareness-month-at-a-glance.pdf',
        filename: 'Awareness-Month-At-A-Glance.pdf',
      },
      placement: { layout: 'freeform', x: 70, y: 4.1, w: 22.5, h: 35 },
    },

    {
      id: 'programme-overview',
      kind: 'link',
      label: 'Cybersecurity Awareness Month 2026',
      hint: 'Open the programme page',
      href: '/cybersecurity-awareness-month-2026',
      placement: { layout: 'freeform', x: 91.1, y: 10.3, w: 7.8, h: 26.9 },
    },

    /* ---------------- second band ---------------- */

    {
      id: 'campaign-strategy',
      kind: 'auto',
      label: 'Campaign strategy',
      hint: 'Build awareness, change behaviour, reduce risk',
      src: '/scene/shared/docs/campaign-strategy.pdf',
      download: { href: '/scene/shared/docs/campaign-strategy.pdf' },
      placement: { layout: 'freeform', x: 26.4, y: 17.4, w: 22.3, h: 23.6 },
    },

    {
      id: 'key-message',
      kind: 'letter',
      label: 'The key message',
      hint: 'Read the note',
      bodyMdx: [
        '{{firstName}},',
        '',
        'Small actions today, big impact tomorrow.',
        '',
        'That is the whole campaign in one line. Every poster, every email and ' +
          'every sixty-second video below is built to land the same idea from a ' +
          'different angle — because a message people meet once is a message ' +
          'people forget.',
        '',
        'Consistent message, multiple touchpoints, measurable impact.',
      ].join('\n'),
      signature: { name: 'Aspire Tech', title: 'Security Awareness Training' },
      placement: { layout: 'freeform', x: 49, y: 18.1, w: 6.9, h: 12.7 },
    },

    {
      id: 'themes',
      kind: 'auto',
      label: 'The five campaign themes',
      hint: 'Think before you click, protect your data, and three more',
      src: '/scene/shared/docs/campaign-themes.pdf',
      placement: { layout: 'freeform', x: 56.1, y: 17.4, w: 9.8, h: 24.8 },
    },

    {
      id: 'poster-see-say',
      kind: 'auto',
      label: 'Poster — See Something, Say Something',
      hint: 'View the poster',
      src: '/scene/shared/posters/see-something-say-something.png',
      placement: { layout: 'freeform', x: 2.1, y: 26.9, w: 12.8, h: 17.9 },
    },

    /* ---------------- third band ---------------- */

    {
      id: 'poster-mfa',
      kind: 'auto',
      label: 'Poster — MFA: easy, fast, essential',
      hint: 'View the poster',
      src: '/scene/shared/posters/mfa.png',
      placement: { layout: 'freeform', x: 1.8, y: 52, w: 13.3, h: 15.6 },
    },

    // The tablet says DOWNLOAD BUNDLE, so it downloads. Anything else here
    // would contradict the artwork the visitor is looking at.
    {
      id: 'poster-bundle',
      kind: 'download',
      label: 'Security Awareness Month poster bundle',
      hint: 'Download all posters',
        download: {
          href: '/scene/shared/downloads/awareness-month-poster-bundle.zip',
          filename: 'Awareness-Month-Poster-Bundle.zip',
        },
      placement: { layout: 'freeform', x: 19.2, y: 40.8, w: 23, h: 33.6 },
    },

    {
      id: 'checklist',
      kind: 'auto',
      label: 'Launch checklist',
      hint: 'Leadership note, rewards, feedback loop, metrics',
      src: '/scene/shared/docs/launch-checklist.pdf',
      placement: { layout: 'freeform', x: 42.4, y: 45.1, w: 7.2, h: 13.5 },
    },

    {
      id: 'poster-preview',
      kind: 'auto',
      label: 'Poster bundle — sneak peek',
      hint: 'Preview four of the posters',
      src: '/scene/shared/posters/bundle-sneak-peek.png',
      placement: { layout: 'freeform', x: 49.8, y: 41.5, w: 17.4, h: 35.8 },
    },

    // The hero asset of this scene.
    {
      id: 'toolkit-guide',
      kind: 'auto',
      label: 'Security Awareness Toolkit Guide',
      hint: 'Overview, key messages, resources, activities, templates, FAQs',
      src: '/scene/shared/docs/security-awareness-toolkit-guide.pdf',
      download: {
        href: '/scene/shared/docs/security-awareness-toolkit-guide.pdf',
        filename: 'Security-Awareness-Toolkit-Guide.pdf',
      },
      placement: { layout: 'freeform', x: 67.8, y: 39.8, w: 26, h: 38.3 },
    },


    /* ---------------- title, mug and the sticky notes ---------------- */

    // The title block is the scene's own thesis; it deserves a door.
    {
      id: 'campaign-overview',
      kind: 'auto',
      label: 'Security Awareness Month — Secure today, stronger tomorrow',
      hint: 'Plan. Educate. Empower.',
      src: '/scene/shared/docs/awareness-month-overview.pdf',
      placement: { layout: 'freeform', x: 31.3, y: 2.4, w: 37.1, h: 14.2 },
    },

    {
      id: 'sticky-everyone',
      kind: 'letter',
      label: 'Everyone. Everywhere. Every day.',
      hint: 'Who this campaign is for',
      bodyMdx: [
        'Everyone. Everywhere. Every day.',
        '',
        'Awareness training fails when it is aimed at "users" — a group nobody ' +
          'believes they belong to. It works when the finance team, the board ' +
          'and the night shift each see themselves in it.',
        '',
        'That is why the audience row on the plan names five different groups ' +
          'rather than one.',
      ].join('\n'),
      signature: { name: 'Aspire Tech', title: 'Security Awareness Training' },
      placement: { layout: 'freeform', x: 85.3, y: 4.4, w: 7.5, h: 11.7 },
    },

    {
      id: 'sticky-behaviour',
      kind: 'letter',
      label: 'Behaviour change is our goal',
      hint: 'Not completion rates',
      bodyMdx: [
        'Behaviour change is our goal.',
        '',
        'Completion rate measures whether people clicked through a module. It ' +
          'is the easiest number to move and the least useful one to report.',
        '',
        'Phishing report rate is the number that matters: it only rises when ' +
          'somebody notices something, decides it is worth flagging, and trusts ' +
          'that flagging it will not make them look foolish. All three of those ' +
          'are culture, not training.',
      ].join('\n'),
      signature: { name: 'Aspire Tech', title: 'Security Awareness Training' },
      placement: { layout: 'freeform', x: 15.1, y: 28.1, w: 6.9, h: 9.8 },
    },

    {
      id: 'sticky-one-toolkit',
      kind: 'scene',
      label: 'One toolkit. Many possibilities.',
      hint: 'See the twelve-week campaign plan',
      targetId: 'campaign-planner',
      transition: 'zoom',
      placement: { layout: 'freeform', x: 82.8, y: 66.2, w: 6.5, h: 9.8 },
    },

    /* ---------------- bottom band ---------------- */

    {
      id: 'comms-plan',
      kind: 'auto',
      label: 'Communication plan',
      hint: 'Email, intranet, signage, Teams, talking points, social',
      src: '/scene/shared/docs/communication-plan.pdf',
      placement: { layout: 'freeform', x: 0.3, y: 72.5, w: 13.2, h: 19.1 },
    },

    // Paste a YouTube, Vimeo or Loom link here and it resolves to that
    // player; a direct mp4 plays natively. Nothing to change but the URL.
    {
      id: 'video-concepts',
      kind: 'auto',
      label: 'Video concepts — 60 seconds each',
      hint: 'Phishing, data protection, password security',
      src: '/scene/shared/video/awareness-month-concepts.mp4',
      poster: '/scene/shared/video/awareness-month-concepts-poster.jpg',
      placement: { layout: 'freeform', x: 13.8, y: 77, w: 19.5, h: 19 },
    },

    // The open notebook sits dead centre of the bottom band. Leaving it
    // decorative left a visible hole between two hotspots.
    {
      id: 'ideas-in-progress',
      kind: 'letter',
      label: 'Ideas in progress',
      hint: 'What we are working on next',
      bodyMdx: [
        'Ideas in progress',
        '',
        '· Interactive quiz',
        '· Department challenges',
        '· Security champions',
        '· Storytelling series',
        '· "Day in the life" videos',
        '',
        'Make security relatable. Make it stick. Make it part of our culture.',
        '',
        'None of these are new ideas. What makes them work is running them ' +
          'together, on a schedule people can predict, with the same message ' +
          'underneath each one.',
      ].join('\n'),
      signature: { name: 'Aspire Tech', title: 'Security Awareness Training' },
      placement: { layout: 'freeform', x: 36.6, y: 77.3, w: 20.2, h: 19.8 },
    },

    {
      id: 'priorities',
      kind: 'auto',
      label: 'Top priorities',
      hint: 'Engage, reduce risk, measure, build culture',
      src: '/scene/shared/docs/top-priorities.pdf',
      placement: { layout: 'freeform', x: 63.3, y: 78.3, w: 10.4, h: 18.6 },
    },

    {
      id: 'measure-success',
      kind: 'auto',
      label: 'How we measure success',
      hint: 'Participation, completion, report rate, behaviour change',
      src: '/scene/shared/docs/measure-success.pdf',
      placement: { layout: 'freeform', x: 74.1, y: 77, w: 17.2, h: 21.9 },
    },

    // Bottom-right is where a reader's eye lands last, so it holds the ask.
    {
      id: 'cta-aware-prepare-protect',
      kind: 'link',
      label: 'Aware. Prepare. Protect. — start your programme',
      hint: 'Book a walkthrough',
      href: '/request-demo',
      placement: { layout: 'freeform', x: 91.7, y: 86.7, w: 7.8, h: 10.2 },
    },
  ],

  seo: {
    title: 'Security Awareness Month toolkit for security leaders',
    description:
      'A complete Awareness Month campaign in one place: strategy, themes, ' +
      'poster bundle, communication plan, video concepts and the metrics that ' +
      'prove it worked.',
    ogImage: '/scene/stages/ciso-table-og.jpg',
    schema: 'CollectionPage',
  },

  tracking: { campaign: 'awareness-month-2026', source: 'linkedin' },
};
