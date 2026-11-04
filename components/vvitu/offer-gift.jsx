'use client'
import React from 'react';

/**
 * The "What We Offer" gift.
 *
 * ── Why this exists at all ──────────────────────────────────────────────
 * What We Offer is a property of the PROGRAMME, not of any one course, so as
 * a tab it was repeated identically inside every syllabus — and opening it
 * made the modal fold its own header and rail away mid-animation, which is
 * what made the tab change feel like it snagged. As its own window it is
 * stated once, and the thing that snagged no longer happens because there is
 * no chrome left to fold.
 *
 * ── Why a gift and not a button ─────────────────────────────────────────
 * A rail tab is a flat label among other flat labels; nothing about it says
 * "there is more here than the syllabus". A parcel that will not sit still
 * does, and it reads before any of its text is read.
 *
 * `tone="card"` sits on a programme card in the carousel and is the louder of
 * the two — it has to catch an eye that is scanning past. `tone="bar"` sits in
 * the syllabus footer, where the reader has already committed and only needs
 * to be told the thing exists.
 *
 * All of the motion is transform and opacity on pseudo-elements, so nothing
 * here can reflow the card it is pinned to. It is all suppressed under
 * prefers-reduced-motion — including the halo, which is the one thing here
 * that never stops moving on its own.
 */
const OfferGift = ({ onOpen, tone = 'card', label = 'What We Offer' }) => (
    <button
        type="button"
        className={`vvitu-gift vvitu-gift--${tone}`}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        aria-label={`${label} — open`}
    >
        {/* Two rings on one delay apart, so the halo reads as a pulse leaving
            the parcel rather than as a border that happens to throb. */}
        <span className="vvitu-gift-halo" aria-hidden="true" />
        <span className="vvitu-gift-halo is-late" aria-hidden="true" />

        <span className="vvitu-gift-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="4" rx="1" />
                <path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                <path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
            </svg>
        </span>

        {/* The bubble is always in the DOM and only animates its opacity and
            transform: building it on hover would cost a layout pass at exactly
            the moment the pointer is asking for a response. */}
        <span className="vvitu-gift-say" aria-hidden="true">{label}</span>
    </button>
);

export default OfferGift;
