'use client'
import React, { useEffect, useRef, useCallback } from 'react';
import OfferDeck from './what-we-offer';

const IconGift = () => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
);

/**
 * "What We Offer" in its own window.
 *
 * ── Why a window and not the whole screen ───────────────────────────────
 * The previous build was a full-screen takeover built around giving the
 * photography the entire viewport. The photography could not carry it: the
 * sources are 1280x720 documentary frames, and edge to edge on a desktop
 * panel that is an upscale large enough to show the compression. See the long
 * note in what-we-offer.jsx.
 *
 * A window also costs nothing here. The deck inside fills whatever it is
 * given, the picture is capped either way, and keeping a visible edge means
 * the reader can always see they are in a layer over the site they came from.
 *
 * It stays a LAYER rather than a route: the reader opened it from a programme
 * card or a syllabus, and closing it should put them back exactly where they
 * were rather than make them find their place again.
 *
 * ── Why the page behind is locked ───────────────────────────────────────
 * Without it a wheel gesture that the deck does not consume scrolls the
 * landing page underneath, and closing lands the reader somewhere they never
 * went. The scrollbar that lock removes is replaced with padding so the
 * layout underneath does not jump sideways as this opens.
 */
const WhatWeOfferModal = ({ isOpen, onClose, programName, reduceMotion = false }) => {
    // Where the pointer went DOWN, not where it came up. A reader who starts a
    // drag inside the window — selecting a line of copy, nudging the rail —
    // and releases over the scrim has not asked to close anything.
    const downOnScrim = useRef(false);

    const onScrimDown = useCallback((e) => {
        downOnScrim.current = e.target === e.currentTarget;
    }, []);
    const onScrimUp = useCallback((e) => {
        if (downOnScrim.current && e.target === e.currentTarget) onClose();
        downOnScrim.current = false;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return undefined;
        const { body } = document;
        const prevOverflow = body.style.overflow;
        const prevPad = body.style.paddingRight;
        const bar = window.innerWidth - document.documentElement.clientWidth;
        body.style.overflow = 'hidden';
        if (bar > 0) body.style.paddingRight = `${bar}px`;
        return () => { body.style.overflow = prevOverflow; body.style.paddingRight = prevPad; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="vvitu-deck-scrim"
            role="presentation"
            onMouseDown={onScrimDown}
            onMouseUp={onScrimUp}
        >
            <div className="vvitu-deck-win" role="dialog" aria-modal="true" aria-label="What We Offer">
                <header className="vvitu-deck-top">
                    <span className="vvitu-deck-top-mark" aria-hidden="true"><IconGift /></span>
                    <span className="vvitu-deck-top-text">
                        <span className="vvitu-deck-top-eyebrow">Beyond the syllabus</span>
                        <span className="vvitu-deck-top-title">What We Offer</span>
                    </span>
                    {programName && <span className="vvitu-deck-top-prog">{programName}</span>}
                    <button
                        type="button"
                        className="vvitu-deck-top-close"
                        onClick={onClose}
                        aria-label="Close What We Offer"
                    >
                        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </header>

                <OfferDeck reduceMotion={reduceMotion} />
            </div>
        </div>
    );
};

export default WhatWeOfferModal;
