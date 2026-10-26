// Shared external links. Kept in one place so a changed invite link only needs
// updating here rather than in the header, the mobile nav, and the success screen.
//
// ⚠️ TODO(VVITU): none of the WhatsApp groups below exist yet. SRKR's invites were
// deliberately removed rather than left in place — a live link here would drop a
// VVITU student into another college's group, which is worse than no link at all.
// Fill each one in as it is created; nothing else needs changing, because every
// "Join" CTA on the site asks `isWhatsAppLinkReady()` and renders a non-clickable
// "coming soon" state until the URL is real.

// A link only counts as ready when it is an actual invite. Both '' ("not created
// yet") and '#' ("placeholder") mean the same thing to the UI.
export const isWhatsAppLinkReady = (url) => typeof url === 'string' && url.trim() !== '' && url.trim() !== '#';

// Main community "welcome" link — the entry point for all official updates.
// Pending: VVITU will supply this.
export const WHATSAPP_COMMUNITY_URL = '';

// Year-wise WhatsApp groups shown under the "Year-wise Groups" tab of the
// community pop-up. Not created yet — '#' renders them as "coming soon".
export const FIRST_YEAR_WHATSAPP_URL = '#';
export const SECOND_YEAR_WHATSAPP_URL = '#';

// Program-specific group a student is asked to join right after registering.
// Wired to the program through `whatsappGroup` in lib/registration-schema.js.
export const MOON_CODER_WHATSAPP_URL = '';

// Drives the year-wise group list in the community pop-up. Add a 3rd/4th year
// entry here and it appears automatically — no component change needed: the
// modal raises the ordinal suffix itself, so "3rd Year …" renders as 3ʳᵈ Year.
// `groupName` is the group's real name in WhatsApp, shown so a student can
// confirm they landed in the right place before tapping Join. It is deliberately
// absent until each group exists — the "coming soon" row must not claim a name
// that nobody can search for yet.
export const WHATSAPP_YEAR_GROUPS = [
    { id: 'first-year', label: '1st Year WhatsApp Group', year: '1st Year', url: FIRST_YEAR_WHATSAPP_URL },
    { id: 'second-year', label: '2nd Year WhatsApp Group', year: '2nd Year', url: SECOND_YEAR_WHATSAPP_URL }
];

// Partner sites the header logos link out to.
export const TORIIMINDS_URL = 'https://toriiminds.com/';
export const VVITU_COLLEGE_URL = 'https://www.vvitu.ac.in/';
