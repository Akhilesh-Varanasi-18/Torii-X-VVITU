'use client'
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OFFER_TRACKS, OFFER_PLATFORMS, OFFER_ROADMAP } from './what-we-offer-data';

// ── Icons ────────────────────────────────────────────────────────────────
const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconSpark = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...ic} strokeWidth="2.1"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>);
const IconStar = () => (<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 16.6 6.4 19.9l1.3-6.4L3 9.2l6.3-.7z" /></svg>);
const IconCheck = () => (<svg viewBox="0 0 24 24" width="11" height="11" {...ic} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mediaFor = (stop, track) => (typeof stop.media === 'string' ? stop.media : stop.media[track]);

// ── Layout rules ─────────────────────────────────────────────────────────
// How many stops sit on one row of the Z. Below `RAIL_AT` the Z cannot exist
// honestly — ten nodes across a phone would be 30px apart — so the path
// straightens into a horizontal filmstrip that scrolls itself to keep the
// active stop centred. Same mechanic, same fill, a shape that fits.
const RAIL_AT = 560;
const perRowFor = (w) => (w >= 1040 ? 5 : w >= 780 ? 4 : w >= RAIL_AT ? 3 : 0);

/**
 * Serpentine placement. Even rows run left→right, odd rows right→left, which
 * is what makes the path a Z — and it also means the last node of one row and
 * the first of the next share a column, so every turn is a clean vertical drop
 * rather than a diagonal.
 */
const cellFor = (i, perRow) => {
    const row = Math.floor(i / perRow);
    const within = i % perRow;
    return { row, col: row % 2 === 0 ? within : perRow - 1 - within };
};

/**
 * An SVG path through the given points with rounded corners.
 *
 * Built from MEASURED node centres rather than from a hand-written path, so
 * the line lands exactly on the nodes at any width, with any number of stops,
 * without a magic number anywhere.
 */
function roundedPath(points, radius) {
    if (points.length < 2) return '';
    const n = (v) => Math.round(v * 10) / 10;
    const parts = [`M ${n(points[0].x)} ${n(points[0].y)}`];
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const cur = points[i];
        const next = points[i + 1];
        const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
        // Never round more than half a segment, or two corners on a short run
        // would overlap and the line would visibly kink.
        const r = Math.min(radius, inLen / 2, outLen / 2);
        if (r < 1) { parts.push(`L ${n(cur.x)} ${n(cur.y)}`); continue; }
        const a = { x: cur.x + ((prev.x - cur.x) / inLen) * r, y: cur.y + ((prev.y - cur.y) / inLen) * r };
        const b = { x: cur.x + ((next.x - cur.x) / outLen) * r, y: cur.y + ((next.y - cur.y) / outLen) * r };
        parts.push(`L ${n(a.x)} ${n(a.y)}`, `Q ${n(cur.x)} ${n(cur.y)} ${n(b.x)} ${n(b.y)}`);
    }
    const last = points[points.length - 1];
    parts.push(`L ${n(last.x)} ${n(last.y)}`);
    return parts.join(' ');
}

/**
 * The What We Offer roadmap.
 *
 * Ten stops on one Z-shaped path. Scrolling fills the line; when the line
 * reaches a stop that stop lights up, its thumbnail rises out of the row, and
 * the spotlight above swaps to its photograph and description. Scroll on and
 * it settles back to a lit thumbnail while the next one takes the light.
 *
 * ── Why the scroll handler does not call setState ────────────────────────
 * The fill is written straight onto the path's `strokeDashoffset` inside a
 * rAF. Routing a per-frame value through React would re-render ten nodes and
 * a spotlight sixty times a second, which is exactly the lag and tracking
 * drift this has to avoid. React state changes only when the ACTIVE STOP
 * changes — ten times over the whole section.
 */
const OfferRoadmap = ({ stops, track, scrollRef, reduceMotion }) => {
    const trackRef = useRef(null);
    const stageRef = useRef(null);
    const fieldRef = useRef(null);
    const lineRef = useRef(null);
    const railRef = useRef(null);
    const wrapRef = useRef(null);
    const nodeRefs = useRef([]);
    const activeRef = useRef(0);
    const rafRef = useRef(0);

    const [perRow, setPerRow] = useState(5);
    const [geom, setGeom] = useState({ d: '', w: 0, h: 0, marks: [] });
    const [active, setActive] = useState(0);
    const isRail = perRow === 0;

    // ── Measure: node centres → path ────────────────────────────────────
    const measure = useCallback(() => {
        const field = fieldRef.current;
        if (!field) return;
        const fr = field.getBoundingClientRect();
        const pts = nodeRefs.current.slice(0, stops.length).map((el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left - fr.left + r.width / 2, y: r.top - fr.top + r.height / 2 };
        });
        if (pts.some((p) => !p)) return;

        // Cumulative straight-line distance to each node, as a fraction of the
        // whole run. The corner rounding shortens the path by a hair; scaling
        // these fractions to the rendered length keeps each node's arrival
        // aligned with the line actually touching it.
        const segs = [0];
        for (let i = 1; i < pts.length; i++) {
            segs.push(segs[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        }
        const total = segs[segs.length - 1] || 1;
        const d = roundedPath(pts, isRail ? 0 : 26);
        const w = Math.round(fr.width * 10) / 10;
        const h = Math.round(fr.height * 10) / 10;
        const marks = segs.map((v) => v / total);

        // Bail out when nothing actually moved.
        //
        // This runs from a ResizeObserver, and handing back a fresh object every
        // time made it a feedback loop: setGeom → re-render → the observer fires
        // on a sub-pixel difference → setGeom again. Wide layouts settled on an
        // exact number and survived it; the phone filmstrip, whose width is
        // content-derived, never settled and blew the render-depth limit — the
        // whole modal failed to open. Returning the previous object makes React
        // skip the render, which ends the loop whatever retriggered it. The
        // rounding above stops sub-pixel jitter counting as a change.
        setGeom((prev) =>
            prev.d === d && prev.w === w && prev.h === h ? prev : { d, w, h, marks }
        );
    }, [stops.length, isRail]);

    // The breakpoint is measured from the WRAPPER, never from the field.
    //
    // The field's width is an OUTPUT of the breakpoint: the grid makes it the
    // width of its container, the phone filmstrip makes it `max-content`, which
    // is far wider. Measuring the breakpoint from it therefore oscillated —
    // narrow → rail → field becomes wide → wide enough for the grid → narrow
    // again — flipping every frame until React gave up and the modal failed to
    // open at all. The wrapper is sized by the stage and does not move, so it
    // is the only honest ruler here. (The window is not: this is inside a modal.)
    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap || typeof ResizeObserver === 'undefined') return undefined;
        const apply = () => {
            setPerRow(perRowFor(wrap.getBoundingClientRect().width));
            measure();
        };
        const ro = new ResizeObserver(apply);
        ro.observe(wrap);
        apply();
        return () => ro.disconnect();
    }, [measure]);

    useLayoutEffect(() => { measure(); }, [perRow, measure]);

    // ── Scroll → fill + active stop ─────────────────────────────────────
    useEffect(() => {
        const container = scrollRef?.current;
        const trackEl = trackRef.current;
        const stageEl = stageRef.current;
        if (!container || !trackEl || !stageEl) return undefined;

        const read = () => {
            rafRef.current = 0;
            const tr = trackEl.getBoundingClientRect();
            const cr = container.getBoundingClientRect();
            // Distance the sticky stage has travelled through its track.
            //
            // Measured against the CONTAINER's height, not the stage's. The
            // roadmap is the last thing in the modal, so the scroll container
            // bottoms out while the track still has (container - stage) of
            // height left below the stage. Subtracting the stage height asks
            // for travel the container can never deliver, and the final stop
            // is simply never reached — the line stopped a hair short and the
            // tenth stop never lit. Subtracting the container height makes the
            // last reachable scroll position exactly progress 1.
            const runway = trackEl.offsetHeight - container.clientHeight;
            const travelled = cr.top - tr.top;
            const p = runway > 0 ? clamp(travelled / runway, 0, 1) : 0;

            const line = lineRef.current;
            if (line) {
                const L = line.getTotalLength();
                line.style.strokeDasharray = `${L}`;
                line.style.strokeDashoffset = `${L * (1 - p)}`;
            }

            // The stop is reached when the line arrives at it, not on an even
            // split of the scroll — so the highlight and the line agree.
            const marks = geom.marks;
            let next = 0;
            for (let i = 0; i < marks.length; i++) if (p >= marks[i] - 0.001) next = i;
            if (next !== activeRef.current) {
                activeRef.current = next;
                setActive(next);
            }
        };

        const onScroll = () => {
            if (rafRef.current) return;              // coalesce to one read per frame
            rafRef.current = requestAnimationFrame(read);
        };

        read();
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', onScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [scrollRef, geom.marks]);

    // On the phone filmstrip, keep the active thumbnail in view. Scrolling the
    // rail horizontally never moves the page, so this cannot fight the user's
    // vertical scroll.
    useEffect(() => {
        if (!isRail) return;
        const rail = railRef.current;
        const el = nodeRefs.current[active];
        if (!rail || !el) return;
        rail.scrollTo({
            left: el.offsetLeft - rail.clientWidth / 2 + el.offsetWidth / 2,
            behavior: reduceMotion ? 'auto' : 'smooth'
        });
    }, [active, isRail, reduceMotion]);

    const stop = stops[active] || stops[0];
    const cols = isRail ? stops.length : perRow;

    const EASE = [0.16, 1, 0.3, 1];
    const swap = reduceMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
        : {
            initial: { opacity: 0, y: 12, scale: 0.99 },
            animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, ease: EASE } },
            // Leaves faster than it arrives, so two panels are never both
            // half-visible for long enough to read as a double exposure.
            exit: { opacity: 0, transition: { duration: 0.18, ease: 'linear' } }
        };

    return (
        <div
            ref={trackRef}
            className={`vvitu-wwo-road ${isRail ? 'is-rail' : ''}`}
            // One screenful of scrolling per stop, plus a screen of run-out so
            // the last stop can be read before the section releases.
            style={{ '--stops': stops.length }}
        >
            <div ref={stageRef} className="vvitu-wwo-stage">

                {/* ── The spotlight ── */}
                <div className="vvitu-wwo-spot">
                    {/* NOT mode="wait". That waits for each exit to finish
                        before the next enters, so scrolling quickly through ten
                        stops queues ten 0.42s animations and the spotlight ends
                        up several stops behind the line — the exact tracking lag
                        this has to avoid. The panels are absolutely positioned
                        on top of each other, so they can simply crossfade: the
                        incoming one is correct immediately and the outgoing one
                        fades out underneath it. */}
                    <AnimatePresence initial={false}>
                        <motion.div key={stop.key} className="vvitu-wwo-spot-inner" {...swap}>
                            <figure className={`vvitu-wwo-spot-media ${stop.shot ? 'is-shot' : ''}`}>
                                <img src={mediaFor(stop, track)} alt={stop.alt} loading="lazy" decoding="async" />
                                <figcaption className="vvitu-wwo-spot-index">
                                    <span>{String(active + 1).padStart(2, '0')}</span>
                                    <small>/ {String(stops.length).padStart(2, '0')}</small>
                                </figcaption>
                            </figure>

                            <div className="vvitu-wwo-spot-body">
                                <span className="vvitu-wwo-spot-kicker">
                                    {stop.finale ? <IconStar /> : null}
                                    {stop.kicker}
                                </span>
                                <h4 className="vvitu-wwo-spot-title">{stop.label}</h4>
                                <p className="vvitu-wwo-spot-text">{stop.body}</p>

                                {stop.tracked && (
                                    <span className="vvitu-wwo-spot-track">
                                        <IconSpark />
                                        {track === 'ai' ? 'Run again on AI, with Anthropic and OpenAI access' : 'Run on the stack you are learning'}
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

                {/* ── The path ── */}
                <div
                    className={`vvitu-wwo-pathwrap ${isRail ? 'is-rail' : ''}`}
                    ref={(el) => { wrapRef.current = el; railRef.current = el; }}
                >
                    <div
                        className="vvitu-wwo-field"
                        ref={fieldRef}
                        style={{ '--cols': cols }}
                    >
                        {/* Drawn behind the nodes, sized to the measured field,
                            so it can never drift out of register with them. */}
                        <svg
                            className="vvitu-wwo-svg"
                            viewBox={`0 0 ${geom.w || 1} ${geom.h || 1}`}
                            width={geom.w || 1}
                            height={geom.h || 1}
                            aria-hidden="true"
                            preserveAspectRatio="none"
                        >
                            <path className="vvitu-wwo-line-bg" d={geom.d} />
                            <path className="vvitu-wwo-line" ref={lineRef} d={geom.d} />
                        </svg>

                        <ol className="vvitu-wwo-nodes">
                            {stops.map((s, i) => {
                                const { row, col } = cellFor(i, perRow || 1);
                                const state = i === active ? 'is-active' : i < active ? 'is-done' : 'is-next';
                                return (
                                    <li
                                        key={s.key}
                                        ref={(el) => { nodeRefs.current[i] = el; }}
                                        className={`vvitu-wwo-node ${state}`}
                                        style={isRail ? undefined : { gridRow: row + 1, gridColumn: col + 1 }}
                                        aria-current={i === active ? 'step' : undefined}
                                    >
                                        <span className="vvitu-wwo-node-thumb">
                                            <img src={mediaFor(s, track)} alt="" loading="lazy" decoding="async" />
                                            <span className="vvitu-wwo-node-tick" aria-hidden="true"><IconCheck /></span>
                                        </span>
                                        <span className="vvitu-wwo-node-label">{s.label}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * "What We Offer" — the closing section of the AI Ready syllabus view.
 *
 * One roadmap, ten stops, plus the track toggle that governs the three stages
 * which run twice. See what-we-offer-data.js for why the order is the point.
 */
const WhatWeOffer = ({ reveal, reduceMotion, scrollRef }) => {
    const [track, setTrack] = useState(OFFER_TRACKS[0].key);
    const activeTrack = OFFER_TRACKS.find((t) => t.key === track) || OFFER_TRACKS[0];
    const EASE = [0.16, 1, 0.3, 1];

    return (
        <div className="vvitu-wwo" data-track={track}>
            <motion.div className="vvitu-wwo-head" {...reveal(0)}>
                <div className="vvitu-wwo-head-intro">
                    <span className="vvitu-wwo-eyebrow">Ten stops, one year</span>
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

            {/* Min-height reserved so swapping this line cannot nudge the
                roadmap below it. */}
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
