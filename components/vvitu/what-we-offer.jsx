'use client'
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    OFFER_TRACKS,
    OFFER_JOURNEY,
    OFFER_PLATFORMS,
    OFFER_BEYOND,
    OFFER_TOOLKIT,
    OFFER_FINALE
} from './what-we-offer-data';

// ── Icons ────────────────────────────────────────────────────────────────
const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconTrophy = () => (<svg viewBox="0 0 24 24" width="18" height="18" {...ic}><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 6h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4" /><path d="M7 6H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4" /></svg>);
const IconLink = () => (<svg viewBox="0 0 24 24" width="18" height="18" {...ic}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>);
const IconRocket = () => (<svg viewBox="0 0 24 24" width="18" height="18" {...ic}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0Z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>);
const IconBadge = () => (<svg viewBox="0 0 24 24" width="18" height="18" {...ic}><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>);
const IconCheck = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...ic} strokeWidth="2.8"><polyline points="20 6 9 17 4 12" /></svg>);
const IconSpark = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...ic} strokeWidth="2.1"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>);
const IconStar = () => (<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 16.6 6.4 19.9l1.3-6.4L3 9.2l6.3-.7z" /></svg>);
const ICONS = { trophy: <IconTrophy />, link: <IconLink />, rocket: <IconRocket />, badge: <IconBadge /> };

// A thin browser chrome around a product screenshot. Without it a UI
// screenshot dropped straight onto a page reads as part of the page rather
// than as a picture of another product.
const BrowserFrame = ({ src, alt, children }) => (
    <div className="vvitu-wwo-browser">
        <div className="vvitu-wwo-browser-bar" aria-hidden="true">
            <span /><span /><span />
        </div>
        <img className="vvitu-wwo-browser-shot" src={src} alt={alt} loading="lazy" decoding="async" />
        {children}
    </div>
);

/**
 * "What We Offer" — the closing section of the AI Ready syllabus view.
 *
 * Four acts; see what-we-offer-data.js for why they are ordered as they are.
 *
 * The only interactive piece is the journey's track toggle. It is built so
 * that NOTHING IN THE LAYOUT MOVES when it flips: the three cards keep their
 * position and size, and only the photographs crossfade and the accent colour
 * transitions. A toggle that reflowed the grid would read as a page change
 * rather than as two views of one thing, which is the whole point of it.
 */
const WhatWeOffer = ({ reveal, reduceMotion }) => {
    const [track, setTrack] = useState(OFFER_TRACKS[0].key);
    const activeTrack = OFFER_TRACKS.find((t) => t.key === track) || OFFER_TRACKS[0];

    // One easing for everything in the section, so the toggle, the reveals and
    // the hovers all feel like the same object.
    // The photograph crossfade is done in CSS (see .vvitu-wwo-step-img), not
    // here — it has to be a property transition on already-mounted elements,
    // not a mount/unmount, or the incoming image has nothing painted yet.
    const EASE = [0.16, 1, 0.3, 1];

    return (
        <div className="vvitu-wwo" data-track={track}>

            {/* ─────────── ACT 1 — the project journey ─────────── */}
            <motion.div className="vvitu-wwo-journey" {...reveal(0)}>
                <div className="vvitu-wwo-journey-head">
                    <div className="vvitu-wwo-journey-intro">
                        <span className="vvitu-wwo-eyebrow">Three stages, run twice</span>
                        <h4 className="vvitu-wwo-h">The Project Journey</h4>
                    </div>

                    {/* The toggle. A real radiogroup, not two buttons that look
                        like one — the two tracks are mutually exclusive views
                        of the same three stages, and arrow keys should work. */}
                    <div className="vvitu-wwo-toggle" role="radiogroup" aria-label="Choose a track">
                        {OFFER_TRACKS.map((t) => {
                            const on = t.key === track;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    // The label exists twice in the DOM — full
                                    // text, and a short form CSS swaps in below
                                    // 360px. Both are read out otherwise, so
                                    // the button names itself ("AI", not
                                    // "AIAI") and the visual spans are hidden
                                    // from the accessibility tree.
                                    aria-label={t.label}
                                    className={`vvitu-wwo-toggle-btn ${on ? 'is-on' : ''}`}
                                    onClick={() => setTrack(t.key)}
                                >
                                    {/* The thumb is a single shared element that
                                        slides between the two options, rather
                                        than a background that fades in on each.
                                        layoutId does the travel. */}
                                    {on && (
                                        <motion.span
                                            layoutId="vvitu-wwo-thumb"
                                            className="vvitu-wwo-toggle-thumb"
                                            transition={reduceMotion
                                                ? { duration: 0 }
                                                : { type: 'spring', stiffness: 420, damping: 36 }}
                                        />
                                    )}
                                    <span className="vvitu-wwo-toggle-label" aria-hidden="true">
                                        <span className="vvitu-wwo-toggle-full">{t.label}</span>
                                        <span className="vvitu-wwo-toggle-short">{t.short}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* The note is the only copy that differs between tracks, so it
                    carries the "what changes" message and crossfades on its own.
                    Its box is min-height'd in CSS so the swap cannot nudge the
                    cards below it. */}
                <div className="vvitu-wwo-tracknote">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.p
                            key={track}
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                            transition={{ duration: reduceMotion ? 0.15 : 0.32, ease: EASE }}
                        >
                            {activeTrack.note}
                        </motion.p>
                    </AnimatePresence>
                </div>

                <ol className="vvitu-wwo-steps">
                    {OFFER_JOURNEY.map((step, i) => (
                        <li key={step.key} className="vvitu-wwo-step">
                            <div className="vvitu-wwo-step-media">
                                {/* BOTH tracks' photographs are mounted, stacked
                                    in the same box, and crossfaded by opacity.
                                    Swapping the src on toggle looked right in
                                    the DOM but flashed an empty box on screen:
                                    the second track's images only begin loading
                                    at the moment of the flip, and a freshly
                                    requested image has not decoded by the time
                                    the frame paints. Mounting both lets the
                                    browser fetch them together when the section
                                    scrolls into view, so the toggle is a pure
                                    opacity transition with nothing to wait for.
                                    Opacity, never `display: none` — a hidden
                                    image is not in the viewport and lazy
                                    loading would never fire for it. */}
                                {OFFER_TRACKS.map((t) => {
                                    const on = t.key === track;
                                    return (
                                        <img
                                            key={t.key}
                                            className={`vvitu-wwo-step-img ${on ? 'is-on' : ''}`}
                                            src={step.media[t.key]}
                                            alt={on ? step.alt : ''}
                                            aria-hidden={on ? undefined : 'true'}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    );
                                })}
                                <span className="vvitu-wwo-step-no" aria-hidden="true">{step.no}</span>
                                {/* Only the AI track carries this, and it is the
                                    one substantive difference between the two
                                    runs — so it is a badge, not a footnote. */}
                                <AnimatePresence>
                                    {track === 'ai' && (
                                        <motion.span
                                            className="vvitu-wwo-step-ai"
                                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.95 }}
                                            transition={{ duration: reduceMotion ? 0.15 : 0.38, ease: EASE }}
                                        >
                                            <IconSpark /> AI-assisted
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="vvitu-wwo-step-body">
                                <span className="vvitu-wwo-step-lead">{step.lead}</span>
                                <h5 className="vvitu-wwo-step-name">{step.name}</h5>
                                <p className="vvitu-wwo-step-text">{step.body}</p>
                                <ul className="vvitu-wwo-step-points">
                                    {step.points.map((p) => (
                                        <li key={p}><span className="vvitu-wwo-tick"><IconCheck /></span>{p}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Connector to the next stage. Decorative, and the
                                last card does not get one. */}
                            {i < OFFER_JOURNEY.length - 1 && (
                                <span className="vvitu-wwo-step-link" aria-hidden="true" />
                            )}
                        </li>
                    ))}
                </ol>
            </motion.div>

            {/* ─────────── ACT 2 — beyond the classroom ─────────── */}
            <motion.div className="vvitu-wwo-block" {...reveal(0.05)}>
                <div className="vvitu-wwo-block-head">
                    <span className="vvitu-wwo-eyebrow">Alongside the syllabus</span>
                    <h4 className="vvitu-wwo-h">Beyond the Classroom</h4>
                </div>

                <div className="vvitu-wwo-grid">
                    {OFFER_BEYOND.map((item) => (
                        <article
                            key={item.key}
                            className={`vvitu-wwo-tile ${item.span === 'wide' ? 'is-wide' : ''}`}
                        >
                            <div className={`vvitu-wwo-tile-media ${item.shot ? 'is-shot' : ''}`}>
                                <img src={item.media} alt={item.alt} loading="lazy" decoding="async" />
                            </div>
                            <div className="vvitu-wwo-tile-body">
                                <span className="vvitu-wwo-tile-ic">{ICONS[item.icon]}</span>
                                <span className="vvitu-wwo-eyebrow">{item.eyebrow}</span>
                                <h5 className="vvitu-wwo-tile-title">{item.title}</h5>
                                <p className="vvitu-wwo-tile-text">{item.body}</p>

                                {item.platforms && (
                                    <ul className="vvitu-wwo-logos">
                                        {OFFER_PLATFORMS.map((p) => (
                                            <li key={p.key} title={p.name}>
                                                <img src={p.src} alt={p.name} loading="lazy" decoding="async" />
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {item.tags && (
                                    <ul className="vvitu-wwo-tags">
                                        {item.tags.map((t) => <li key={t}>{t}</li>)}
                                    </ul>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </motion.div>

            {/* ─────────── ACT 3 — the toolkit ─────────── */}
            <motion.div className="vvitu-wwo-block" {...reveal(0.05)}>
                <div className="vvitu-wwo-block-head">
                    <span className="vvitu-wwo-eyebrow">Logins you get on day one</span>
                    <h4 className="vvitu-wwo-h">Your Toolkit</h4>
                </div>

                <div className="vvitu-wwo-tools">
                    {OFFER_TOOLKIT.map((tool) => (
                        <article key={tool.key} className="vvitu-wwo-tool">
                            <div className="vvitu-wwo-tool-shot">
                                {/* No phone overlay. One was tried here for Myna
                                    and removed: its own marketing shot already
                                    pictures the product on a laptop AND two
                                    phones, so a second phone was redundant, and
                                    at this size it landed on top of the
                                    headline. The "Web + mobile app" tag says it
                                    without covering anything. */}
                                <BrowserFrame src={tool.shot} alt={tool.alt} />
                            </div>
                            <div className="vvitu-wwo-tool-body">
                                <span className="vvitu-wwo-tool-kind">{tool.kind}</span>
                                <h5 className="vvitu-wwo-tool-name">{tool.name}</h5>
                                <p className="vvitu-wwo-tool-text">{tool.body}</p>
                                <ul className="vvitu-wwo-tags">
                                    {tool.tags.map((t) => <li key={t}>{t}</li>)}
                                </ul>
                            </div>
                        </article>
                    ))}
                </div>
            </motion.div>

            {/* ─────────── ACT 4 — Golden Day ─────────── */}
            <motion.div className="vvitu-wwo-finale" {...reveal(0.05)}>
                <div className="vvitu-wwo-finale-media">
                    <img src={OFFER_FINALE.media} alt={OFFER_FINALE.alt} loading="lazy" decoding="async" />
                </div>
                <div className="vvitu-wwo-finale-body">
                    <span className="vvitu-wwo-eyebrow">{OFFER_FINALE.eyebrow}</span>
                    <h4 className="vvitu-wwo-finale-title"><IconStar /> {OFFER_FINALE.title}</h4>
                    <p className="vvitu-wwo-finale-text">{OFFER_FINALE.body}</p>
                    <ul className="vvitu-wwo-awards">
                        {OFFER_FINALE.awards.map((a) => (
                            <li key={a.key}>
                                <strong>{a.label}</strong>
                                <span>{a.note}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </motion.div>
        </div>
    );
};

export default WhatWeOffer;
