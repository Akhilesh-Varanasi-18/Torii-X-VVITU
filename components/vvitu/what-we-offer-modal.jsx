'use client'
import React, { useEffect, useRef } from 'react';
import WhatWeOffer from './what-we-offer';

const IconGift = () => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
);

/**
 * "What We Offer" in a window of its own.
 *
 * ── Why this is not a tab any more ──────────────────────────────────────
 * It describes the PROGRAMME, not a course, so as a rail tab it was repeated
 * identically inside every syllabus — the same content filed under five
 * different courses. Worse, opening it folded the modal's header and section
 * rail away to make room, which changed the scroll container's height while
 * the roadmap was measuring itself against that very height. That is what the
 * tab change snagged on, and it is also what made the roadmap's travel need a
 * `Math.min` guard (see what-we-offer.jsx): the stage grew past what the
 * scroller could ever give it.
 *
 * In its own window there is no chrome to fold, so the container height is
 * fixed for the whole life of the view and the measurement is honest.
 *
 * ── Why it carries its own scroller ─────────────────────────────────────
 * The roadmap is scroll-driven and takes `scrollRef`. Here that is this
 * window's own body, which means the roadmap can no longer be affected by —
 * or affect — whatever else happens to be open behind it.
 */
const WhatWeOfferModal = ({ isOpen, onClose, programName, reduceMotion = false }) => {
    const bodyRef = useRef(null);

    // Esc closes. Registered only while open so it cannot shadow the Esc of
    // whatever is underneath once this has gone.
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // The roadmap measures itself against this body on mount, so it has to
    // start from the top — reopening at a stale offset would have it compute
    // a run it has already partly used.
    useEffect(() => {
        if (isOpen && bodyRef.current) bodyRef.current.scrollTop = 0;
    }, [isOpen]);

    if (!isOpen) return null;

    const reveal = (delay = 0, y = 14) => ({
        initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y },
        whileInView: { opacity: 1, y: 0 },
        viewport: { root: bodyRef, once: true, margin: '0px 0px -8% 0px' },
        transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] },
    });

    return (
        <div className="vvitu-offer-overlay" onClick={onClose}>
            <div
                className="vvitu-offer-window"
                role="dialog"
                aria-modal="true"
                aria-label="What We Offer"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="vvitu-offer-bar">
                    <span className="vvitu-offer-bar-mark" aria-hidden="true"><IconGift /></span>
                    <div className="vvitu-offer-bar-text">
                        <span className="vvitu-offer-bar-eyebrow">Beyond the syllabus</span>
                        <h3 className="vvitu-offer-bar-title">What We Offer</h3>
                    </div>
                    {programName && <span className="vvitu-offer-bar-prog">{programName}</span>}
                    <button
                        type="button"
                        className="vvitu-offer-close"
                        onClick={onClose}
                        aria-label="Close What We Offer"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                <div className="vvitu-offer-body" ref={bodyRef}>
                    <WhatWeOffer reveal={reveal} reduceMotion={reduceMotion} scrollRef={bodyRef} />
                </div>
            </div>
        </div>
    );
};

export default WhatWeOfferModal;
