'use client'
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OFFER_TRACKS, OFFER_PLATFORMS, OFFER_ROADMAP } from './what-we-offer-data';

// ── Icons ────────────────────────────────────────────────────────────────
const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconSpark = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...ic} strokeWidth="2.1"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>);
const IconStar = () => (<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 16.6 6.4 19.9l1.3-6.4L3 9.2l6.3-.7z" /></svg>);

// The two bookends. Drawn rather than photographed: they are symbols, not
// moments, and a line icon stays crisp at any size and takes the track's own
// colour. Swap in artwork or a Lottie later without touching the layout.
//
// START — a student at a desk over an open book.
const IconBeginner = () => (
    <svg viewBox="0 0 24 24" width="26" height="26" {...ic} strokeWidth="1.7">
        <circle cx="12" cy="6.4" r="3" />
        <path d="M6.6 13.4a5.6 5.6 0 0 1 10.8 0" />
        <path d="M3.5 16.5h17M4.6 16.5v3.2a.8.8 0 0 0 .8.8h13.2a.8.8 0 0 0 .8-.8v-3.2" />
    </svg>
);
// FINISH — the AI Ready programme's own chip mark, so the journey ends on the
// badge the student has been working toward.
const IconEngineer = () => (
    <svg viewBox="0 0 24 24" width="26" height="26" {...ic} strokeWidth="1.7">
        <rect x="5" y="5" width="14" height="14" rx="2.4" />
        <rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1" />
        <path d="M9.5 2.2v2.6M14.5 2.2v2.6M9.5 19.2v2.6M14.5 19.2v2.6M19.2 9.5h2.6M19.2 14.5h2.6M2.2 9.5h2.6M2.2 14.5h2.6" />
    </svg>
);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mediaFor = (stop, track) => (typeof stop.media === 'string' ? stop.media : stop.media[track]);

/**
 * The What We Offer roadmap — one straight line from Beginner to AI Ready
 * Engineer, with the milestones alternating above and below it.
 *
 * ── Why every spotlight panel is mounted at once ────────────────────────
 * They used to mount and unmount as the active milestone changed, which meant
 * a fresh <img> decode on every change — a visible hitch mid-scroll, exactly
 * the "stuck" feeling to avoid. All panels now live in the DOM from the start
 * and only their opacity changes, so the browser has already decoded every
 * photograph before it is ever shown and the crossfade is a pure compositor
 * job. It also removes AnimatePresence's per-change bookkeeping from the
 * scroll path entirely.
 *
 * ── Why the fill and the dots agree ─────────────────────────────────────
 * With the two bookends there are `stops + 2` columns, so milestone k sits at
 * (k+1)/(stops+1) along the line. The active milestone is whichever the fill
 * has actually REACHED — a floor, not a round. Rounding lit a milestone when
 * the fill was still half a gap short of its dot, which is why the indicator
 * looked like it was filling to the wrong place.
 *
 * ── Why the scroll handler does not call setState ───────────────────────
 * The fill is written straight onto the element's transform inside a rAF.
 * React state changes only when the reached count changes — nine times across
 * the whole section rather than sixty times a second.
 */
const OfferRoadmap = ({ stops, track, scrollRef, reduceMotion }) => {
    const trackRef = useRef(null);
    const railRef = useRef(null);
    const fillRef = useRef(null);
    const nodeRefs = useRef([]);
    const reachedRef = useRef(0);
    const rafRef = useRef(0);

    // How many points on the line the fill has passed: 0 at the Beginner cap,
    // `stops + 1` once it touches the AI Ready Engineer cap.
    const [reached, setReached] = useState(0);
    const [stageH, setStageH] = useState(520);

    const SEGMENTS = stops.length + 1;                  // gaps between the caps
    const active = clamp(reached - 1, 0, stops.length - 1);
    const finished = reached >= SEGMENTS;

    useLayoutEffect(() => {
        const container = scrollRef?.current;
        if (!container || typeof ResizeObserver === 'undefined') return undefined;
        const fit = () => {
            // The floor must stay BELOW any realistic container height, or the
            // stage ends up taller than the box it is measuring itself into.
            const h = Math.max(240, container.clientHeight - 14);
            setStageH((prev) => (Math.abs(prev - h) < 2 ? prev : h));
        };
        const ro = new ResizeObserver(fit);
        ro.observe(container);
        fit();
        return () => ro.disconnect();
    }, [scrollRef]);

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
            // has fully passed.
            const runway = trackEl.offsetHeight - container.clientHeight;
            const p = runway > 0 ? clamp((cr.top - tr.top) / runway, 0, 1) : 0;

            if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;

            const next = clamp(Math.floor(p * SEGMENTS + 1e-6), 0, SEGMENTS);
            if (next !== reachedRef.current) {
                reachedRef.current = next;
                setReached(next);
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
    }, [scrollRef, SEGMENTS, stageH]);

    // Keep the active milestone in view when the line is wider than the stage.
    useEffect(() => {
        const rail = railRef.current;
        const el = nodeRefs.current[active];
        if (!rail || !el) return;
        if (rail.scrollWidth <= rail.clientWidth + 4) return;    // nothing to scroll
        const want = el.offsetLeft - rail.clientWidth / 2 + el.offsetWidth / 2;
        // A tolerance so a one-pixel difference does not start a smooth-scroll
        // animation on every frame, which is its own kind of judder.
        if (Math.abs(rail.scrollLeft - want) < 8) return;
        rail.scrollTo({ left: want, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [active, reduceMotion]);

    return (
        <div
            ref={trackRef}
            className="vvitu-wwo-road"
            // Scroll distance: a little under half a stage per milestone, plus
            // one stage of run-out.
            style={{
                height: `${Math.round(stageH * (0.44 * stops.length + 1))}px`,
                '--wwo-stage-h': `${stageH}px`
            }}
        >
            <div className="vvitu-wwo-stage">

                {/* ── Spotlight: every panel mounted, one visible ── */}
                <div className="vvitu-wwo-spot">
                    {stops.map((s, i) => (
                        <div
                            key={s.key}
                            className={`vvitu-wwo-spot-inner ${i === active ? 'is-on' : ''}`}
                            aria-hidden={i !== active}
                        >
                            <figure className={`vvitu-wwo-spot-media ${s.shot ? 'is-shot' : ''}`}>
                                <img src={mediaFor(s, track)} alt={s.alt} decoding="async" />
                            </figure>

                            <div className="vvitu-wwo-spot-body">
                                <span className="vvitu-wwo-spot-step">
                                    <b>{String(i + 1).padStart(2, '0')}</b>
                                    <i>/ {String(stops.length).padStart(2, '0')}</i>
                                </span>
                                <span className="vvitu-wwo-spot-kicker">
                                    {s.finale ? <IconStar /> : null}
                                    {s.kicker}
                                </span>
                                <h4 className="vvitu-wwo-spot-title">{s.label}</h4>
                                <p className="vvitu-wwo-spot-text">{s.body}</p>

                                {s.tracked && (
                                    <span className="vvitu-wwo-spot-track">
                                        <IconSpark />
                                        Anthropic and OpenAI access, with an AI mentor on every team
                                    </span>
                                )}

                                {s.platforms && (
                                    <ul className="vvitu-wwo-logos">
                                        {OFFER_PLATFORMS.map((p) => (
                                            <li key={p.key} title={p.name}>
                                                <img src={p.src} alt={p.name} decoding="async" />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── The line ── */}
                <div className="vvitu-wwo-rail" ref={railRef}>
                    {/* --wwo-cols tells the rule how far in to start and stop:
                        two caps plus the milestones, all the same width. */}
                    <ol className="vvitu-wwo-line" style={{ '--wwo-cols': stops.length + 2 }}>
                        <span className="vvitu-wwo-line-bg" aria-hidden="true">
                            <span className="vvitu-wwo-line-fill" ref={fillRef} />
                        </span>

                        {/* Where the student starts. */}
                        <li className="vvitu-wwo-cap is-start is-done">
                            <span className="vvitu-wwo-cap-badge"><IconBeginner /></span>
                            <span className="vvitu-wwo-cap-label">Beginner</span>
                        </li>

                        {stops.map((s, i) => {
                            const state = i === active ? 'is-active' : i < active ? 'is-done' : 'is-next';
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
                                            <img src={mediaFor(s, track)} alt="" decoding="async" />
                                        </span>
                                        <span className="vvitu-wwo-ms-label">{s.label}</span>
                                    </span>
                                    <span className="vvitu-wwo-ms-stalk" aria-hidden="true" />
                                    <span className="vvitu-wwo-ms-dot" aria-hidden="true" />
                                </li>
                            );
                        })}

                        {/* Where they finish. */}
                        <li className={`vvitu-wwo-cap is-end ${finished ? 'is-done' : ''}`}>
                            <span className="vvitu-wwo-cap-badge"><IconEngineer /></span>
                            {/* No dot. A cap's dot was positioned at the centre
                                of its own column — exactly where the badge sits
                                — so it painted a filled circle on top of the
                                icon. The badge IS the endpoint marker. */}
                            <span className="vvitu-wwo-cap-label">AI Ready Engineer</span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

/**
 * "What We Offer" — the closing section of the AI Ready syllabus view.
 */
const WhatWeOffer = ({ reveal, reduceMotion, scrollRef }) => {
    // AI ONLY (2026-11-04). VVITU dropped the Technology run, so there is no
    // longer a choice to offer: the roadmap is the AI journey, beginning to
    // end. The track is PINNED rather than deleted — OFFER_TRACKS and the
    // per-stop { tech, ai } photographs are untouched, so restoring the toggle
    // means uncommenting the block below and giving `track` its state back.
    // A toggle with one option is not a toggle, it is a label.
    const track = 'ai';
    // const [track, setTrack] = useState(OFFER_TRACKS[0].key);
    // const activeTrack = OFFER_TRACKS.find((t) => t.key === track) || OFFER_TRACKS[0];
    const EASE = [0.16, 1, 0.3, 1];

    return (
        <div className="vvitu-wwo" data-track={track}>
            <motion.div className="vvitu-wwo-head" {...reveal(0)}>
                <div className="vvitu-wwo-head-intro">
                    <span className="vvitu-wwo-eyebrow">Beginner to AI Ready Engineer</span>
                    <h4 className="vvitu-wwo-h">The Roadmap</h4>
                </div>

                {/* PARKED with the Technology track — see the note at the top
                    of this component. The markup is in git history. */}
            </motion.div>

            {/* The track note is parked too: it read "the same three stages,
                run again on AI", which only means anything when there are two
                runs to compare. */}

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
