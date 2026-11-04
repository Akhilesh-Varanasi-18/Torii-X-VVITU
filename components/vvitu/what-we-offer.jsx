'use client'
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { OFFER_PLATFORMS, OFFER_ROADMAP } from './what-we-offer-data';

// ── Icons ────────────────────────────────────────────────────────────────
const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconSpark = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...ic} strokeWidth="2.1"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>);
const IconStar = () => (<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 16.6 6.4 19.9l1.3-6.4L3 9.2l6.3-.7z" /></svg>);

// The two bookends. Drawn rather than photographed: they are symbols, not
// moments, and a line icon stays crisp at any size and takes the theme colour.
//
// START — a student at a desk over an open book.
const IconBeginner = () => (
    <svg viewBox="0 0 24 24" width="22" height="22" {...ic} strokeWidth="1.7">
        <circle cx="12" cy="6.4" r="3" />
        <path d="M6.6 13.4a5.6 5.6 0 0 1 10.8 0" />
        <path d="M3.5 16.5h17M4.6 16.5v3.2a.8.8 0 0 0 .8.8h13.2a.8.8 0 0 0 .8-.8v-3.2" />
    </svg>
);
// FINISH — the AI Ready programme's own chip mark, so the journey ends on the
// badge the student has been working toward.
const IconEngineer = () => (
    <svg viewBox="0 0 24 24" width="22" height="22" {...ic} strokeWidth="1.7">
        <rect x="5" y="5" width="14" height="14" rx="2.4" />
        <rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1" />
        <path d="M9.5 2.2v2.6M14.5 2.2v2.6M9.5 19.2v2.6M14.5 19.2v2.6M19.2 9.5h2.6M19.2 14.5h2.6M2.2 9.5h2.6M2.2 14.5h2.6" />
    </svg>
);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// How long a frame holds before the deck advances. Short enough that a stop
// with five frames shows them all while the reader is still on it, long enough
// to actually look at one.
const HOLD_MS = 1500;

// Which stops get their photography loaded: the active one and its immediate
// neighbours. Arming one stop AHEAD is what buys the next deck time to fetch
// and decode before it is ever shown, without paying for all 27 frames the
// moment the tab opens — which is what made the tab change feel heavy.
const PRELOAD_RADIUS = 1;

/**
 * The What We Offer roadmap — one vertical line from Beginner to AI Ready
 * Engineer down the left, and the active stop's photography on the right.
 *
 * ── Why vertical, and why not a half-and-half split ─────────────────────
 * The modal is 1200px wide by at most 90vh, so with the header folded the
 * stage is roughly 1150x800 — wide and short. Splitting that down the middle
 * gives the picture half a ~575x780 box, which is PORTRAIT, and 36 of the 46
 * photographs in this section are 3:2 or 16:9. Every one of them would have
 * had to letterbox into ~400px of dead space or lose 60% of itself to a crop.
 * A narrow rail for the line and the rest for the picture keeps the frame at
 * the shape the photography already is.
 *
 * ── Why the stop changes on scroll but the frames change on a timer ─────
 * The stops are a sequence the reader is walking, so scroll drives them —
 * that is the whole metaphor, and it keeps the fill honest. The frames WITHIN
 * a stop are not a sequence; they are alternative views of one moment. Giving
 * them scroll distance too would mean Project Space (five frames) demanded
 * five times the scrolling of Startup Chamber (one), which makes the fill
 * crawl on some stops and jump on others. A timer decouples the two: every
 * stop costs the same scroll, and a stop with more photography simply shows
 * more of it while you are there.
 *
 * ── Why a frame swap waits on decode() ──────────────────────────────────
 * Flipping a class and letting the browser decode the new bitmap in the same
 * frame is exactly the stutter this section already had once. img.decode()
 * resolves only when the bitmap is ready to paint, so the class flip happens
 * on a frame where there is no work left to do and the crossfade is pure
 * compositor. Every frame is also mounted from the start, so the bytes are
 * long since fetched by the time any of this runs.
 *
 * ── Why the scroll handler does not call setState ───────────────────────
 * The fill is written straight onto the element's transform inside a rAF.
 * React state changes only when the reached count changes — ten times across
 * the whole section rather than sixty times a second.
 */
const OfferRoadmap = ({ stops, scrollRef, reduceMotion }) => {
    const trackRef = useRef(null);
    const railRef = useRef(null);
    const fillRef = useRef(null);
    const nodeRefs = useRef([]);
    const imgRefs = useRef({});
    const reachedRef = useRef(0);
    const frameRef = useRef(0);
    const rafRef = useRef(0);

    // How many points on the line the fill has passed: 0 at the Beginner cap,
    // `stops + 1` once it touches the AI Ready Engineer cap.
    const [reached, setReached] = useState(0);
    const [stageH, setStageH] = useState(520);
    const [frame, setFrame] = useState(0);
    const [held, setHeld] = useState(false);
    const [nudge, setNudge] = useState(0);

    // Stops whose photography has been requested. It only ever grows: once a
    // frame has been fetched, dropping its src again would just make it
    // re-fetch on the way back up.
    const [armed, setArmed] = useState(() => new Set([0]));
    // Nothing beyond the very first frame is requested until the tab has
    // finished arriving. Mounting 27 images into the same frame as the modal's
    // header-and-rail fold is what made that transition stutter.
    const [warm, setWarm] = useState(false);

    const SEGMENTS = stops.length + 1;                  // gaps between the caps
    const active = clamp(reached - 1, 0, stops.length - 1);
    const finished = reached >= SEGMENTS;
    const stop = stops[active] || stops[0];
    const frames = stop.gallery || [];
    const count = frames.length;

    useEffect(() => {
        const ric = typeof window !== 'undefined' && window.requestIdleCallback
            ? window.requestIdleCallback
            : (fn) => setTimeout(fn, 180);
        const cic = typeof window !== 'undefined' && window.cancelIdleCallback
            ? window.cancelIdleCallback
            : clearTimeout;
        const id = ric(() => setWarm(true));
        return () => cic(id);
    }, []);

    useEffect(() => {
        if (!warm) return;
        setArmed((prev) => {
            let next = prev;
            for (let i = active - PRELOAD_RADIUS; i <= active + PRELOAD_RADIUS; i++) {
                if (i < 0 || i >= stops.length || prev.has(i)) continue;
                if (next === prev) next = new Set(prev);
                next.add(i);
            }
            return next;
        });
    }, [active, warm, stops.length]);

    // A frame is requested if its stop is armed. The active stop's FIRST frame
    // is always requested, armed or not, so the panel is never blank on
    // arrival even before the idle callback has run.
    const wants = useCallback(
        (i, j) => (i === active && j === 0) || armed.has(i),
        [active, armed]
    );

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

    // ── The one piece of geometry everything here agrees on ─────────────
    //
    // THE RUNWAY IS THE SMALLER OF TWO THINGS, and it has to be.
    //
    // The obvious one is the road's own length past the viewport. On its own
    // that is wrong here: entering this tab folds the modal's header and
    // section rail away, which grows container.clientHeight, which grows the
    // stage, which grows the road — and the chrome comes back on the way out.
    // So the road can reserve more travel than the scroller will ever hand it,
    // and the fill tops out short. Measured before the fix: it stopped between
    // 0.73 and 0.93 depending on width, the last stop never lit at 1440, 1024,
    // 430, 390 or 360, and the AI Ready Engineer cap never lit at ANY width.
    //
    // The second is the scrolling actually left below the road's top.
    // (maxScroll - scrollTop) + passed is constant for a given layout —
    // scrolling down by n adds n to `passed` and takes n off the remainder —
    // so this does not wobble frame to frame; it just refuses to promise
    // travel that does not exist.
    const metrics = useCallback(() => {
        const container = scrollRef?.current;
        const trackEl = trackRef.current;
        if (!container || !trackEl) return null;
        const tr = trackEl.getBoundingClientRect();
        const cr = container.getBoundingClientRect();
        const passed = cr.top - tr.top;
        const maxScroll = container.scrollHeight - container.clientHeight;
        const runway = Math.min(
            trackEl.offsetHeight - container.clientHeight,
            (maxScroll - container.scrollTop) + passed
        );
        return { container, passed, runway, roadTop: container.scrollTop - passed };
    }, [scrollRef]);

    // ── Scroll → fill + reached ─────────────────────────────────────────
    useEffect(() => {
        const container = scrollRef?.current;
        if (!container || !trackRef.current) return undefined;

        const read = () => {
            rafRef.current = 0;
            const m = metrics();
            if (!m) return;
            const p = m.runway > 0 ? clamp(m.passed / m.runway, 0, 1) : 0;

            // scaleY, not scaleX — the line runs down now. transform-origin is
            // set in CSS so this stays a one-property write.
            if (fillRef.current) fillRef.current.style.transform = `scaleY(${p})`;

            // The epsilon is 1e-3, not 1e-6: the last boundary is only crossed
            // when p lands on exactly 1, and a scroller that stops on a
            // fractional pixel leaves it at 0.9999. That rounding is the
            // difference between the end cap lighting and never lighting.
            const next = clamp(Math.floor(p * SEGMENTS + 1e-3), 0, SEGMENTS);
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
    }, [scrollRef, SEGMENTS, stageH, metrics]);

    // ── Click a stop to travel to it ────────────────────────────────────
    // Lands in the MIDDLE of that stop's segment rather than on its leading
    // edge: the edge is the boundary the floor is computed against, so a
    // click that lands exactly on it is one rounded pixel away from selecting
    // the stop before. The middle is unambiguous.
    const goTo = useCallback((i) => {
        const m = metrics();
        if (!m || m.runway <= 0) return;
        const target = (i + 1.5) / SEGMENTS;
        m.container.scrollTo({
            top: Math.round(m.roadTop + target * m.runway),
            behavior: reduceMotion ? 'auto' : 'smooth'
        });
    }, [metrics, SEGMENTS, reduceMotion]);

    // A new stop always opens on its first frame, or the deck would come in
    // mid-sequence from wherever the previous stop happened to stop.
    useEffect(() => {
        frameRef.current = 0;
        setFrame(0);
    }, [active]);

    // ── Frame cycling ───────────────────────────────────────────────────
    const show = useCallback((next) => {
        frameRef.current = next;
        setFrame(next);
    }, []);

    // A manual change restarts the hold, so a frame the reader just chose does
    // not get taken away a few hundred milliseconds later by a timer that was
    // already most of the way through its interval.
    const pick = useCallback((next) => {
        show(next);
        setNudge((n) => n + 1);
    }, [show]);

    const step = useCallback((dir) => {
        if (count < 2) return;
        pick((frameRef.current + dir + count) % count);
    }, [count, pick]);

    useEffect(() => {
        // One frame is not a carousel, and a reader who has asked for less
        // motion has asked for exactly this.
        if (count < 2 || reduceMotion || held) return undefined;
        let dead = false;
        const id = setInterval(() => {
            const next = (frameRef.current + 1) % count;
            const img = imgRefs.current[`${active}:${next}`];
            const go = () => { if (!dead) show(next); };
            // Decode first, swap second. If decode is unavailable or rejects
            // (a decoding error, a detached node), fall through and swap
            // anyway — a hitch beats a deck that silently stops moving.
            if (img && typeof img.decode === 'function') img.decode().then(go, go);
            else go();
        }, HOLD_MS);
        return () => { dead = true; clearInterval(id); };
    }, [active, count, reduceMotion, held, show, nudge]);

    // Keep the active stop in view when the line is taller than the rail.
    useEffect(() => {
        const rail = railRef.current;
        const el = nodeRefs.current[active];
        if (!rail || !el) return;
        if (rail.scrollHeight <= rail.clientHeight + 4) return;   // nothing to scroll
        const want = el.offsetTop - rail.clientHeight / 2 + el.offsetHeight / 2;
        // A tolerance so a one-pixel difference does not start a smooth-scroll
        // animation on every frame, which is its own kind of judder.
        if (Math.abs(rail.scrollTop - want) < 8) return;
        rail.scrollTo({ top: want, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [active, reduceMotion]);

    return (
        <div
            ref={trackRef}
            className="vvitu-wwo-road"
            // Scroll distance: a little under half a stage per stop, plus one
            // stage of run-out. Every stop costs the same, whatever its frame
            // count — see the note on the timer above.
            style={{
                height: `${Math.round(stageH * (0.44 * stops.length + 1))}px`,
                '--wwo-stage-h': `${stageH}px`
            }}
        >
            <div className="vvitu-wwo-stage">

                {/* ── LEFT: the line ── */}
                <div className="vvitu-wwo-rail" ref={railRef}>
                    {/* --wwo-rows tells the rule how far in to start and stop:
                        two caps plus the stops, all the same height. */}
                    <ol className="vvitu-wwo-line" style={{ '--wwo-rows': stops.length + 2 }}>
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
                            return (
                                <li
                                    key={s.key}
                                    ref={(el) => { nodeRefs.current[i] = el; }}
                                    className={`vvitu-wwo-ms ${state}`}
                                    aria-current={i === active ? 'step' : undefined}
                                >
                                    {/* The whole row is the target, dot included,
                                        so the hit area is the full width of the
                                        rail rather than a 13px circle. */}
                                    <button
                                        type="button"
                                        className="vvitu-wwo-ms-hit"
                                        onClick={() => goTo(i)}
                                        aria-label={`Go to ${s.label}`}
                                    >
                                        <span className="vvitu-wwo-ms-dot" aria-hidden="true" />
                                        <span className="vvitu-wwo-ms-card">
                                            <span className="vvitu-wwo-ms-no">{String(i + 1).padStart(2, '0')}</span>
                                            <span className="vvitu-wwo-ms-label">{s.label}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}

                        {/* Where they finish. The badge IS the endpoint marker,
                            so this carries no dot — one drawn at the centre of
                            its own row would paint straight over the icon. */}
                        <li className={`vvitu-wwo-cap is-end ${finished ? 'is-done' : ''}`}>
                            <span className="vvitu-wwo-cap-badge"><IconEngineer /></span>
                            <span className="vvitu-wwo-cap-label">AI Ready Engineer</span>
                        </li>
                    </ol>
                </div>

                {/* ── RIGHT: the stage. Every panel mounted, one visible. ── */}
                <div
                    className="vvitu-wwo-show"
                    onMouseEnter={() => setHeld(true)}
                    onMouseLeave={() => setHeld(false)}
                >
                    {stops.map((s, i) => {
                        const g = s.gallery || [];
                        const n = g.length;
                        const on = i === active;
                        return (
                            <div
                                key={s.key}
                                className={`vvitu-wwo-panel ${on ? 'is-on' : ''}`}
                                aria-hidden={!on}
                            >
                                <div className={`vvitu-wwo-deck ${n > 1 ? 'has-deck' : ''}`}>
                                  {/* The ratio box. Frames and arrows both sit
                                      inside it so the arrows land on the
                                      picture's own edges, not the deck's.
                                      16:9 unless the stop asks otherwise —
                                      Golden Day's frames are composed cards,
                                      not photographs, and a 16:9 crop would
                                      take their headline off. */}
                                  <div
                                    className="vvitu-wwo-fit"
                                    style={s.ratio ? { '--wwo-ratio': s.ratio } : undefined}
                                  >
                                    {g.map((f, j) => {
                                        // Distance forward from the visible frame, so
                                        // the deck always reads front -> back in the
                                        // order the frames will actually arrive.
                                        const off = n ? (j - (on ? frame : 0) + n) % n : 0;
                                        const pos = off === 0 ? 'is-front'
                                            : off === 1 ? 'is-peek1'
                                                : off === 2 ? 'is-peek2' : 'is-back';
                                        return (
                                            <figure
                                                key={f.src}
                                                className={`vvitu-wwo-frame ${pos} ${f.fit === 'contain' ? 'is-shot' : ''}`}
                                            >
                                                {wants(i, j) && (
                                                    <img
                                                        ref={(el) => { imgRefs.current[`${i}:${j}`] = el; }}
                                                        src={f.src}
                                                        alt={off === 0 ? f.alt : ''}
                                                        decoding="async"
                                                    />
                                                )}
                                            </figure>
                                        );
                                    })}

                                    {/* Arrows, so it is obvious there is more than
                                        one photograph here. Only on a stop that has
                                        more than one — an arrow that cannot go
                                        anywhere is worse than no arrow. */}
                                    {n > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                className="vvitu-wwo-arrow is-prev"
                                                onClick={() => step(-1)}
                                                aria-label="Previous photograph"
                                                tabIndex={on ? 0 : -1}
                                            >
                                                <svg viewBox="0 0 24 24" width="17" height="17" {...ic}><path d="M15 5l-7 7 7 7" /></svg>
                                            </button>
                                            <button
                                                type="button"
                                                className="vvitu-wwo-arrow is-next"
                                                onClick={() => step(1)}
                                                aria-label="Next photograph"
                                                tabIndex={on ? 0 : -1}
                                            >
                                                <svg viewBox="0 0 24 24" width="17" height="17" {...ic}><path d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </>
                                    )}
                                  </div>
                                </div>

                                <div className="vvitu-wwo-note">
                                    <span className="vvitu-wwo-note-kicker">
                                        {s.finale ? <IconStar /> : null}
                                        {s.kicker}
                                    </span>
                                    <h4 className="vvitu-wwo-note-title">{s.label}</h4>
                                    <p className="vvitu-wwo-note-text">{s.body}</p>

                                    {s.tracked && (
                                        <span className="vvitu-wwo-note-track">
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

                                    {/* A counter only where there is something to
                                        count. One frame renders as a plain hero. */}
                                    {n > 1 && (
                                        <div className="vvitu-wwo-ticks" role="tablist" aria-label={`${s.label} photographs`}>
                                            {g.map((f, j) => (
                                                <button
                                                    key={f.src}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={on && j === frame}
                                                    aria-label={`Photograph ${j + 1} of ${n}`}
                                                    className={`vvitu-wwo-tick ${on && j === frame ? 'is-on' : ''}`}
                                                    onClick={() => pick(j)}
                                                    tabIndex={on ? 0 : -1}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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
    // end. The track is PINNED rather than deleted — OFFER_TRACKS is untouched,
    // so restoring the toggle means giving `track` its state back.
    // A toggle with one option is not a toggle, it is a label.
    const track = 'ai';

    return (
        <div className="vvitu-wwo" data-track={track}>
            <motion.div className="vvitu-wwo-head" {...reveal(0)}>
                <div className="vvitu-wwo-head-intro">
                    <span className="vvitu-wwo-eyebrow">Beginner to AI Ready Engineer</span>
                    <h4 className="vvitu-wwo-h">The Roadmap</h4>
                </div>
            </motion.div>

            <OfferRoadmap
                stops={OFFER_ROADMAP}
                scrollRef={scrollRef}
                reduceMotion={reduceMotion}
            />
        </div>
    );
};

export default WhatWeOffer;
