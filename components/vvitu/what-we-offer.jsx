'use client'
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OFFER_TRACKS, OFFER_PLATFORMS, OFFER_ROADMAP } from './what-we-offer-data';

// ── Icons ────────────────────────────────────────────────────────────────
const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconSpark = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...ic} strokeWidth="2.1"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>);
const IconStar = () => (<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 16.6 6.4 19.9l1.3-6.4L3 9.2l6.3-.7z" /></svg>);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mediaFor = (stop, track) => (typeof stop.media === 'string' ? stop.media : stop.media[track]);

/**
 * The What We Offer roadmap — one straight line, left to right, with the
 * milestones alternating above and below it.
 *
 * ── Why a straight line and not the Z ───────────────────────────────────
 * A serpentine path has to be tall: every turn costs a row, and the rows plus
 * a spotlight did not fit the modal in one screen, so the roadmap could only
 * be found by scrolling past the spotlight — which is what made the section
 * feel stuck. A single horizontal line is one row high however many stops
 * hang off it, which leaves the spotlight the room it needs. Beginner on the
 * left, finish on the right, readable all at once.
 *
 * ── Why the fill is a transform and not an SVG dash ─────────────────────
 * A straight line can be filled by scaling a div on the X axis, which the
 * compositor handles on its own thread. There is no path to measure, nothing
 * to re-measure on resize, and nothing for a ResizeObserver to feed back into.
 *
 * ── Why the scroll handler does not call setState ───────────────────────
 * The fill is written straight onto the element's transform inside a rAF.
 * React state changes only when the ACTIVE MILESTONE changes — ten times
 * across the section rather than sixty times a second.
 */
const OfferRoadmap = ({ stops, track, scrollRef, reduceMotion }) => {
    const trackRef = useRef(null);
    const railRef = useRef(null);
    const fillRef = useRef(null);
    const nodeRefs = useRef([]);
    const activeRef = useRef(0);
    const rafRef = useRef(0);

    const [active, setActive] = useState(0);
    // The stage is sized to the space it actually has, never to a guess. A
    // hard-coded height is exactly what pushed the roadmap off the bottom of
    // the modal and left the reader scrolling to find it.
    const [stageH, setStageH] = useState(520);

    useLayoutEffect(() => {
        const container = scrollRef?.current;
        if (!container || typeof ResizeObserver === 'undefined') return undefined;
        const fit = () => {
            // A sliver left over so the stage reads as a panel inside the
            // scroller rather than as the scroller itself.
            // The floor must stay BELOW any realistic container height. A
            // floor of 360 made the stage taller than a 330px container on a
            // small phone — the one thing this measurement exists to prevent.
            const h = Math.max(240, container.clientHeight - 14);
            setStageH((prev) => (Math.abs(prev - h) < 2 ? prev : h));
        };
        const ro = new ResizeObserver(fit);
        ro.observe(container);
        fit();
        return () => ro.disconnect();
    }, [scrollRef]);

    // ── Scroll → fill + active milestone ────────────────────────────────
    useEffect(() => {
        const container = scrollRef?.current;
        const trackEl = trackRef.current;
        if (!container || !trackEl) return undefined;

        const read = () => {
            rafRef.current = 0;
            const tr = trackEl.getBoundingClientRect();
            const cr = container.getBoundingClientRect();
            // Measured against the CONTAINER's height: this section is the last
            // thing in the modal, so the scroller bottoms out before the track
            // has fully passed. Subtracting anything smaller asks for travel
            // that can never happen and strands the final milestone.
            const runway = trackEl.offsetHeight - container.clientHeight;
            const p = runway > 0 ? clamp((cr.top - tr.top) / runway, 0, 1) : 0;

            if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;

            // Milestone i sits at i/(n-1) along the line, so the highlight
            // fires as the fill reaches it rather than on an even split.
            const n = stops.length;
            const next = clamp(Math.round(p * (n - 1)), 0, n - 1);
            if (next !== activeRef.current) {
                activeRef.current = next;
                setActive(next);
            }
        };

        const onScroll = () => {
            if (rafRef.current) return;             // one read per frame
            rafRef.current = requestAnimationFrame(read);
        };

        read();
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', onScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [scrollRef, stops.length, stageH]);

    // Keep the active milestone in view when the line is wider than the stage.
    // Scrolling the rail sideways cannot fight the reader's vertical scroll.
    useEffect(() => {
        const rail = railRef.current;
        const el = nodeRefs.current[active];
        if (!rail || !el) return;
        if (rail.scrollWidth <= rail.clientWidth + 4) return;   // nothing to scroll
        rail.scrollTo({
            left: el.offsetLeft - rail.clientWidth / 2 + el.offsetWidth / 2,
            behavior: reduceMotion ? 'auto' : 'smooth'
        });
    }, [active, reduceMotion]);

    const stop = stops[active] || stops[0];
    const EASE = [0.16, 1, 0.3, 1];
    const swap = reduceMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
        : {
            initial: { opacity: 0, y: 12, scale: 0.99 },
            animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, ease: EASE } },
            exit: { opacity: 0, transition: { duration: 0.18, ease: 'linear' } }
        };

    return (
        <div
            ref={trackRef}
            className="vvitu-wwo-road"
            // Scroll distance: a little under half a stage per milestone, plus
            // one stage of run-out. Much more and the section reads as stuck —
            // the reader scrolls and scrolls while one panel sits there.
            style={{
                height: `${Math.round(stageH * (0.44 * stops.length + 1))}px`,
                '--wwo-stage-h': `${stageH}px`
            }}
        >
            <div className="vvitu-wwo-stage">

                {/* ── Spotlight ── */}
                <div className="vvitu-wwo-spot">
                    {/* Not mode="wait": that queues each exit before the next
                        enter, so a fast scroll leaves the spotlight several
                        milestones behind the line. These are stacked, so they
                        crossfade and the incoming one is correct at once. */}
                    <AnimatePresence initial={false}>
                        <motion.div key={stop.key} className="vvitu-wwo-spot-inner" {...swap}>
                            <figure className={`vvitu-wwo-spot-media ${stop.shot ? 'is-shot' : ''}`}>
                                <img src={mediaFor(stop, track)} alt={stop.alt} loading="lazy" decoding="async" />
                            </figure>

                            <div className="vvitu-wwo-spot-body">
                                <span className="vvitu-wwo-spot-step">
                                    <b>{String(active + 1).padStart(2, '0')}</b>
                                    <i>/ {String(stops.length).padStart(2, '0')}</i>
                                </span>
                                <span className="vvitu-wwo-spot-kicker">
                                    {stop.finale ? <IconStar /> : null}
                                    {stop.kicker}
                                </span>
                                <h4 className="vvitu-wwo-spot-title">{stop.label}</h4>
                                <p className="vvitu-wwo-spot-text">{stop.body}</p>

                                {stop.tracked && (
                                    <span className="vvitu-wwo-spot-track">
                                        <IconSpark />
                                        {track === 'ai'
                                            ? 'Run again on AI, with Anthropic and OpenAI access'
                                            : 'Run on the stack you are learning'}
                                    </span>
                                )}

                                {stop.platforms && (
                                    <ul className="vvitu-wwo-logos">
                                        {OFFER_PLATFORMS.map((p) => (
                                            <li key={p.key} title={p.name}>
                                                <img src={p.src} alt={p.name} loading="lazy" decoding="async" />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ── The line ── */}
                <div className="vvitu-wwo-rail" ref={railRef}>
                    <ol className="vvitu-wwo-line">
                        {/* The rule and its fill. Both are plain elements: a
                            straight line needs no path, and scaleX composites. */}
                        <span className="vvitu-wwo-line-bg" aria-hidden="true">
                            <span className="vvitu-wwo-line-fill" ref={fillRef} />
                        </span>

                        {stops.map((s, i) => {
                            const state = i === active ? 'is-active' : i < active ? 'is-done' : 'is-next';
                            // Alternating sides is what makes a one-row line
                            // readable: ten labels in a row would collide, five
                            // above and five below have twice the width each.
                            const side = i % 2 === 0 ? 'is-up' : 'is-down';
                            return (
                                <li
                                    key={s.key}
                                    ref={(el) => { nodeRefs.current[i] = el; }}
                                    className={`vvitu-wwo-ms ${side} ${state}`}
                                    aria-current={i === active ? 'step' : undefined}
                                >
                                    <span className="vvitu-wwo-ms-card">
                                        <span className="vvitu-wwo-ms-thumb">
                                            <img src={mediaFor(s, track)} alt="" loading="lazy" decoding="async" />
                                        </span>
                                        <span className="vvitu-wwo-ms-label">{s.label}</span>
                                    </span>
                                    <span className="vvitu-wwo-ms-stalk" aria-hidden="true" />
                                    <span className="vvitu-wwo-ms-dot" aria-hidden="true" />
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </div>
    );
};

/**
 * "What We Offer" — the closing section of the AI Ready syllabus view.
 * One roadmap, ten milestones, plus the track toggle that governs the three
 * stages which run twice.
 */
const WhatWeOffer = ({ reveal, reduceMotion, scrollRef }) => {
    const [track, setTrack] = useState(OFFER_TRACKS[0].key);
    const activeTrack = OFFER_TRACKS.find((t) => t.key === track) || OFFER_TRACKS[0];
    const EASE = [0.16, 1, 0.3, 1];

    return (
        <div className="vvitu-wwo" data-track={track}>
            <motion.div className="vvitu-wwo-head" {...reveal(0)}>
                <div className="vvitu-wwo-head-intro">
                    <span className="vvitu-wwo-eyebrow">Ten milestones, one year</span>
                    <h4 className="vvitu-wwo-h">The Roadmap</h4>
                </div>

                <div className="vvitu-wwo-toggle" role="radiogroup" aria-label="Choose a track">
                    {OFFER_TRACKS.map((t) => {
                        const on = t.key === track;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                aria-label={t.label}
                                className={`vvitu-wwo-toggle-btn ${on ? 'is-on' : ''}`}
                                onClick={() => setTrack(t.key)}
                            >
                                {on && (
                                    <motion.span
                                        layoutId="vvitu-wwo-thumb"
                                        className="vvitu-wwo-toggle-thumb"
                                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
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
            </motion.div>

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

            <OfferRoadmap
                stops={OFFER_ROADMAP}
                track={track}
                scrollRef={scrollRef}
                reduceMotion={reduceMotion}
            />
        </div>
    );
};

export default WhatWeOffer;
