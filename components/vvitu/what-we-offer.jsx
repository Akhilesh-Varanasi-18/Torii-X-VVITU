'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OFFER_PLATFORMS, OFFER_ROADMAP } from './what-we-offer-data';

// ── Icons ────────────────────────────────────────────────────────────────
const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconSpark = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...ic} strokeWidth="2.1"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>);
const IconStar = () => (<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 16.6 6.4 19.9l1.3-6.4L3 9.2l6.3-.7z" /></svg>);
const IconLeft = ({ s = 18 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...ic} strokeWidth="2.2"><path d="M15 5l-7 7 7 7" /></svg>);
const IconRight = ({ s = 18 }) => (<svg viewBox="0 0 24 24" width={s} height={s} {...ic} strokeWidth="2.2"><path d="M9 5l7 7-7 7" /></svg>);

// How long a photograph holds before the carousel advances on its own. Long
// enough to actually look at a frame; the filling bar under the picture is
// what makes the wait legible rather than arbitrary.
const HOLD_MS = 4200;

// The frame ratio a stop gets when it does not name one. Every photographic
// frame in this section is exactly 1280x720, so 16/9 is not a guess — it is
// the measured shape of all twenty-one of them.
const DEFAULT_RATIO = '16 / 9';

// The widest a picture is ever drawn, in CSS pixels, unless the stop overrides
// it. See the density note in what-we-offer-data.js: the sources are 1280px
// wide, so 760 keeps every photograph at 1.68x on a 1x screen and never asks
// the browser to invent detail that was never captured.
const DEFAULT_CAP = '760px';

const pad = (n) => String(n).padStart(2, '0');

/**
 * "What We Offer" as a milestone deck.
 *
 * ── Why a bounded deck and not a full-screen takeover ────────────────────
 * The previous build gave each milestone the whole viewport. It read well in
 * the abstract and badly in practice, for a reason that is measurable rather
 * than aesthetic: the source photographs are 1280x720. Edge to edge on a 1920
 * screen that is a 1.5x upscale, and on a 2x laptop panel far more — which is
 * exactly the magnification at which webp softness and compression blocking
 * stop being invisible. These are honest documentary frames, not studio
 * plates, and blowing them up was showing the file rather than the moment.
 *
 * So the picture is CAPPED (see DEFAULT_CAP) and the screen is filled with
 * everything else: the milestone rail, the journey spine, the typography and
 * the controls. Big canvas, contained photograph.
 *
 * ── Why one milestone at a time, with a rail ────────────────────────────
 * The ORDER is the argument — you pitch an idea, you build it, you exhibit it,
 * you compete, you are handed the platforms, and it ends with your name read
 * out. A grid of nine cards turns a year into a list of perks. A rail keeps the
 * sequence visible while still letting a reader jump straight to the one they
 * came for.
 *
 * ── Why the gallery runs itself ─────────────────────────────────────────
 * The frames inside one milestone are alternative views of a single moment,
 * not a sequence, so there is nothing for a reader to decide between them —
 * most will never click. They cycle on a timer, with arrows and a segmented
 * bar for anyone who wants to steer, and the timer holds while a pointer is
 * over the picture so it never moves out from under someone reading it.
 *
 * ── Why nothing here snaps or takes over the scroll ─────────────────────
 * The deck is exactly the height of its window and never scrolls as a whole.
 * The previous build's scroll-snapping was the source of most of its
 * responsive trouble: a chapter one pixel taller than the viewport made the
 * snap point unreachable. Fixed chrome plus one scrollable column cannot fail
 * that way.
 */
const OfferDeck = ({ reduceMotion = false }) => {
    const stops = OFFER_ROADMAP;
    const N = stops.length;

    const [i, setI] = useState(0);
    const [f, setF] = useState(0);
    const [paused, setPaused] = useState(false);
    // Bumped on every frame change, manual or automatic. It is what restarts
    // both the hold timer and the filling bar — a shared key, so the bar can
    // never be mid-fill while the timer that drives it has already been reset.
    const [tick, setTick] = useState(0);

    const stop = stops[i];
    const gallery = stop.gallery || [];
    const n = gallery.length;

    const fRef = useRef(0);
    const imgs = useRef({});
    const pills = useRef([]);
    const touch = useRef(null);

    // Photography is fetched for the milestone on screen and its two
    // neighbours. The set only grows: dropping a src again would just re-fetch
    // it the moment the reader stepped back.
    const [armed, setArmed] = useState(() => new Set([0, 1]));
    useEffect(() => {
        setArmed((prev) => {
            let next = prev;
            [i - 1, i, i + 1].forEach((k) => {
                if (k < 0 || k >= N || prev.has(k)) return;
                if (next === prev) next = new Set(prev);
                next.add(k);
            });
            return next;
        });
    }, [i, N]);

    const goTo = useCallback((k) => {
        const t = Math.min(N - 1, Math.max(0, k));
        setI((prev) => (prev === t ? prev : t));
    }, [N]);

    const pick = useCallback((k) => {
        if (n < 1) return;
        const t = ((k % n) + n) % n;
        fRef.current = t;
        setF(t);
        setTick((x) => x + 1);
    }, [n]);

    // A milestone always opens on its first frame, with a full hold ahead of
    // it rather than whatever was left of the previous one's.
    useEffect(() => { fRef.current = 0; setF(0); setTick((x) => x + 1); }, [i]);

    // ── The carousel runs itself ────────────────────────────────────────
    useEffect(() => {
        if (n < 2 || reduceMotion || paused) return undefined;
        let dead = false;
        const id = setTimeout(() => {
            const next = (fRef.current + 1) % n;
            const im = imgs.current[`${i}:${next}`];
            const go = () => {
                if (dead) return;
                fRef.current = next;
                setF(next);
                setTick((x) => x + 1);
            };
            // Decode first, swap second. Flipping the class and letting the
            // browser decode the bitmap in the same frame is a visible hitch
            // on the larger frames — space-5 is 162KB.
            if (im && typeof im.decode === 'function') im.decode().then(go, go);
            else go();
        }, HOLD_MS);
        return () => { dead = true; clearTimeout(id); };
    }, [i, n, reduceMotion, paused, tick]);

    // Keep the active pill in view. `block: 'nearest'` matters: without it a
    // horizontal rail will also scroll its ANCESTORS vertically to centre
    // itself, which drags the whole window.
    useEffect(() => {
        const el = pills.current[i];
        if (el && el.scrollIntoView) {
            el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [i, reduceMotion]);

    // Left/right walk the photographs, up/down walk the milestones. Splitting
    // them means neither gesture is ambiguous on a stop that has only one
    // frame, where left/right falls through to the milestones instead.
    useEffect(() => {
        const onKey = (e) => {
            if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); if (n > 1) pick(fRef.current + 1); else goTo(i + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); if (n > 1) pick(fRef.current - 1); else goTo(i - 1); }
            else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(i + 1); }
            else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(i - 1); }
            else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
            else if (e.key === 'End') { e.preventDefault(); goTo(N - 1); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [i, n, N, goTo, pick]);

    // Swipe. A horizontal drag across the picture is the gesture a phone
    // reader will try first, and the rail is the only other way to move.
    const onTouchStart = useCallback((e) => {
        const t = e.touches[0];
        touch.current = { x: t.clientX, y: t.clientY };
        // A finger resting on the picture holds it, exactly as a pointer does.
        setPaused(true);
    }, []);
    const onTouchEnd = useCallback((e) => {
        const s = touch.current;
        touch.current = null;
        // Released unconditionally, and this is the reason it is not left to
        // mouseleave: a tap on a touchscreen fires mouseenter and then never
        // fires the matching mouseleave until something else is tapped, so a
        // single swipe would otherwise stop the carousel for good.
        setPaused(false);
        if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        // A drag that is mostly vertical is the reader scrolling the panel,
        // not steering the carousel.
        if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
        const fwd = dx < 0;
        if (n > 1) pick(fRef.current + (fwd ? 1 : -1));
        else goTo(i + (fwd ? 1 : -1));
    }, [n, i, pick, goTo]);

    const hold = useCallback(() => setPaused(true), []);
    const release = useCallback(() => setPaused(false), []);

    // Set on the media COLUMN, not on the stage, because the filmstrip under
    // the stage has to be cut to the same shape — a 16/9 thumbnail of an 8/7
    // Golden Day card would crop the headline off it.
    const mediaStyle = {
        '--ratio': stop.ratio || DEFAULT_RATIO,
        '--cap': stop.cap || DEFAULT_CAP,
    };

    return (
        <div className="vvitu-deck">
            {/* ── the rail: every milestone, in order, always reachable ── */}
            <nav className="vvitu-deck-rail" aria-label="Milestones">
                <div className="vvitu-deck-rail-track">
                    {stops.map((s, k) => (
                        <button
                            key={s.key}
                            type="button"
                            ref={(el) => { pills.current[k] = el; }}
                            className={`vvitu-deck-pill ${k === i ? 'is-on' : ''} ${k < i ? 'is-done' : ''}`}
                            onClick={() => goTo(k)}
                            aria-current={k === i ? 'true' : undefined}
                        >
                            <b>{pad(k + 1)}</b>
                            <span>{s.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* ── the spine: the arc the nine milestones sit inside ──
                It replaces what used to be two whole screens — a "Beginner"
                opener and an "AI Ready Engineer" closer. The arc was worth
                keeping; two screens of it were not. */}
            <div className="vvitu-deck-spine" aria-hidden="true">
                <span className="vvitu-deck-spine-end">Beginner</span>
                <span className="vvitu-deck-spine-track">
                    <i style={{ transform: `scaleX(${(i + 1) / N})` }} />
                </span>
                <span className="vvitu-deck-spine-end is-goal">AI Ready Engineer</span>
            </div>

            {/* `key` on the body restarts its entrance animation, so a
                milestone change reads as a new page rather than as text
                silently rewriting itself in place. */}
            <div className="vvitu-deck-body" key={stop.key}>
                <div className="vvitu-deck-media" style={mediaStyle}>
                    <div className="vvitu-deck-shot">
                        {/* Arrows FLANK the picture rather than overlay it on
                            anything wider than a phone. A picture is drawn at
                            its own shape inside the stage, so an overlaid arrow
                            would sit at the stage edge and drift away from the
                            image on any ratio that is not the stage's. In the
                            gutter it is always the same distance from the eye. */}
                        {n > 1 && (
                            <button
                                type="button"
                                className="vvitu-deck-arrow is-prev"
                                onClick={() => pick(f - 1)}
                                aria-label="Previous photograph"
                            >
                                <IconLeft />
                            </button>
                        )}

                        <div
                            className="vvitu-deck-stage"
                            onMouseEnter={hold}
                            onMouseLeave={release}
                            onTouchStart={onTouchStart}
                            onTouchEnd={onTouchEnd}
                        >
                            {gallery.map((fr, j) => (
                                <figure
                                    key={fr.src}
                                    className={`vvitu-deck-frame ${j === f ? 'is-on' : ''}`}
                                    aria-hidden={j !== f}
                                >
                                    <img
                                        ref={(el) => { imgs.current[`${i}:${j}`] = el; }}
                                        src={fr.src}
                                        alt={j === f ? fr.alt : ''}
                                        decoding="async"
                                    />
                                </figure>
                            ))}
                        </div>

                        {n > 1 && (
                            <button
                                type="button"
                                className="vvitu-deck-arrow is-next"
                                onClick={() => pick(f + 1)}
                                aria-label="Next photograph"
                            >
                                <IconRight />
                            </button>
                        )}
                    </div>

                    {/* A filmstrip only where there is more than one frame. A
                        strip of one on a single-frame stop reads as a carousel
                        that failed to load. */}
                    {n > 1 && (
                        <div className="vvitu-deck-strip" role="tablist" aria-label={`${stop.label} photographs`}>
                            {gallery.map((fr, j) => (
                                <button
                                    key={fr.src}
                                    type="button"
                                    role="tab"
                                    aria-selected={j === f}
                                    aria-label={`Photograph ${j + 1} of ${n}`}
                                    className={`vvitu-deck-thumb ${j === f ? 'is-on' : ''}`}
                                    onClick={() => pick(j)}
                                    onMouseEnter={hold}
                                    onMouseLeave={release}
                                >
                                    {/* Same src as the stage: already fetched,
                                        already decoded, so the strip costs
                                        nothing beyond the paint. */}
                                    <img src={fr.src} alt="" decoding="async" />
                                    {j === f && (
                                        <i
                                            key={tick}
                                            style={{
                                                animationDuration: `${HOLD_MS}ms`,
                                                animationPlayState: paused || reduceMotion ? 'paused' : 'running',
                                            }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="vvitu-deck-say">
                    <span className="vvitu-deck-ghost" aria-hidden="true">{pad(i + 1)}</span>
                    <div className="vvitu-deck-say-inner">
                        <span className="vvitu-deck-kicker">
                            {stop.finale ? <IconStar /> : null}
                            {stop.kicker}
                        </span>
                        <h2 className="vvitu-deck-title">{stop.label}</h2>
                        <p className="vvitu-deck-text">{stop.body}</p>

                        {stop.tracked && (
                            <span className="vvitu-deck-chip">
                                <IconSpark />
                                Anthropic and OpenAI access, with an AI mentor on every team
                            </span>
                        )}

                        {stop.platforms && (
                            <ul className="vvitu-deck-logos">
                                {OFFER_PLATFORMS.map((p) => (
                                    <li key={p.key} title={p.name}>
                                        <img src={p.src} alt={p.name} decoding="async" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* ── milestone to milestone ── */}
            <div className="vvitu-deck-foot">
                {/* The visible label is hidden on a phone, where two milestone
                    names plus a counter will not share one line. The button is
                    still named — hence the aria-label, which is the only label
                    a screen reader or a 390px screen has. */}
                <button
                    type="button"
                    className="vvitu-deck-step"
                    onClick={() => goTo(i - 1)}
                    disabled={i === 0}
                    aria-label={i === 0 ? 'Previous milestone' : `Previous milestone: ${stops[i - 1].label}`}
                >
                    <IconLeft s={15} />
                    <span>{i === 0 ? 'Start' : stops[i - 1].label}</span>
                </button>

                <span className="vvitu-deck-of">
                    <b>{pad(i + 1)}</b> <i>/ {pad(N)}</i>
                </span>

                <button
                    type="button"
                    className="vvitu-deck-step is-next"
                    onClick={() => goTo(i + 1)}
                    disabled={i === N - 1}
                    aria-label={i === N - 1 ? 'Next milestone' : `Next milestone: ${stops[i + 1].label}`}
                >
                    <span>{i === N - 1 ? 'AI Ready Engineer' : stops[i + 1].label}</span>
                    <IconRight s={15} />
                </button>
            </div>

            {/* Neighbouring milestones are fetched out of sight so the first
                frame is already decoded by the time the reader arrives. */}
            <div className="vvitu-deck-pre" aria-hidden="true">
                {stops.map((s, k) => (
                    (k !== i && armed.has(k) && s.gallery && s.gallery[0])
                        ? <img key={s.key} src={s.gallery[0].src} alt="" decoding="async" />
                        : null
                ))}
            </div>
        </div>
    );
};

export default OfferDeck;
