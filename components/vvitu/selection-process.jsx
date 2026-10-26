'use client';
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SELECTION_STEPS } from './selection-process-data';

// The selection process, drawn as a funnel rather than a plain timeline.
//
// A list of eight stages would be accurate but would miss the point: this is a
// SELECTION, and the field narrows three times along the way. So the rail
// physically closes in — the backdrop tapers, each card past a gate pulls its
// right edge further in, and the spine thins — and the three shortlisting gates
// are drawn as bands across the rail rather than as another line of body copy.
//
// Single column at every width, on purpose. An alternating left/right timeline
// looks richer on a desktop, but it splits the eye across the centre line and
// the narrowing stops being readable — and most students open this on a phone,
// where alternating collapses to a single column anyway.
//
// Three layers of motion, in order of how loud they are:
//   1. AMBIENT — drifting orbs, radar rings and two wave bands behind
//      everything. Never competes with the text; it exists so a long scroll
//      through eight stages does not read as a static document.
//   2. SCROLL-LINKED — the spine fills as the rail travels, with a comet head
//      riding the fill. This is the progress bar through the funnel.
//   3. ON-REACH — whichever stage is nearest the middle of the screen is the
//      active one: its node wobbles once and keeps pulsing rings, its card
//      takes the accent border, a sheen sweeps across it and an accent bar
//      grows down its left edge. Exactly one stage is ever active.
//
// Nothing is scroll-jacked: the page scrolls at the speed the reader chose.

const ico = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.85, strokeLinecap: 'round', strokeLinejoin: 'round' };

const ICONS = {
    campus: (<svg {...ico}><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9.5 21v-5h5v5" /><path d="M9.5 12h.01M14.5 12h.01" /></svg>),
    form: (<svg {...ico}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></svg>),
    monitor: (<svg {...ico}><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8 21h8M12 17v4" /><path d="m10.5 8.5 3.5 2-3.5 2v-4Z" /></svg>),
    code: (<svg {...ico}><path d="m9 17-5-5 5-5M15 7l5 5-5 5" /><path d="m13 4-2 16" /></svg>),
    shield: (<svg {...ico}><path d="M12 3 5 6v5.5c0 4.3 2.9 8.2 7 9.5 4.1-1.3 7-5.2 7-9.5V6l-7-3Z" /><path d="m9.3 12 1.9 1.9 3.5-3.6" /></svg>),
    mic: (<svg {...ico}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" /><path d="M12 18v3M9 21h6" /></svg>),
    chat: (<svg {...ico}><path d="M20 15a2.5 2.5 0 0 1-2.5 2.5H8L4 21V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5Z" /><path d="M9 9h6M9 12.5h4" /></svg>),
    trophy: (<svg {...ico}><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" /><path d="M12 14v3M9 21h6l-1-4h-4l-1 4Z" /></svg>)
};

const IconGate = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 7 7 6 7-6" />
        <path d="m5 13 7 6 7-6" opacity="0.45" />
    </svg>
);

// Two seamless wave bands for the ambient layer.
//
// The trick that makes the loop invisible: draw the path over SIX periods
// (2880 user units) inside a 1440-wide viewBox, then slide it left by exactly
// ONE period. At the end of the cycle the path is identical to its start, so
// the animation restarts with no visible jump. Relative curve commands (c / s)
// make the repetition a single .repeat().
const wavePath = (period, amp, baseline) => {
    const q = period / 4;
    const seg = `c ${q} ${-amp} ${q * 2} ${-amp} ${q * 2} 0 s ${q * 2} ${amp} ${q * 2} 0 `;
    return `M 0 ${baseline} ` + seg.repeat(Math.ceil(2880 / period)) + 'L 2880 240 L 0 240 Z';
};

const WAVE_SLOW = wavePath(480, 34, 128);
const WAVE_FAST = wavePath(360, 22, 158);

const SelectionProcess = () => {
    const sectionRef = useRef(null);
    const railRef = useRef(null);
    const rowRefs = useRef([]);

    // Which stage is currently nearest the middle of the screen. -1 until the
    // first measurement, which is also what the server renders — so hydration
    // matches and no card flashes an active state before any scrolling.
    const [activeIdx, setActiveIdx] = useState(-1);

    // The ambient layer is expensive to run forever on a phone, so its
    // animations are paused in CSS until the section is actually on screen.
    const [isLive, setIsLive] = useState(false);

    // Ties the spine's fill to how far the rail has travelled up the viewport.
    // The offsets start the fill once the rail's top is about two-thirds up the
    // screen and finish it before the last card leaves, so the line is full
    // exactly when the final stage is being read — not a screen too late.
    const { scrollYProgress } = useScroll({
        target: railRef,
        offset: ['start 78%', 'end 88%']
    });
    const fillHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

    // ── On-reach: pick the one stage closest to the middle of the viewport ──
    //
    // Deliberately NOT an IntersectionObserver per row. An observer fires on
    // crossings, so two tall cards can both be "intersecting" at once and a
    // short gate band can slip between two callbacks — neither gives a single
    // unambiguous answer. Distance-to-centre does, and for eight rows it costs
    // nothing to compute.
    //
    // The observer's only job is deciding whether to listen at all: the scroll
    // handler is attached when the section comes into view and removed when it
    // leaves, so scrolling the rest of the page runs no code from here.
    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return undefined;

        let queued = false;

        const measure = () => {
            queued = false;
            const mid = window.innerHeight / 2;
            let best = -1;
            let bestDist = Infinity;

            rowRefs.current.forEach((el, i) => {
                if (!el) return;
                const r = el.getBoundingClientRect();
                // Skip rows that are entirely off screen, so scrolling past the
                // section cannot hand the highlight to a row nobody can see.
                if (r.bottom < 0 || r.top > window.innerHeight) return;
                const d = Math.abs((r.top + r.bottom) / 2 - mid);
                if (d < bestDist) { bestDist = d; best = i; }
            });

            // Nothing on screen → keep the last highlight rather than dropping
            // every card back to its resting state in the middle of a scroll.
            setActiveIdx((prev) => (best === -1 ? prev : best));
        };

        const onScroll = () => {
            if (queued) return;
            queued = true;
            window.requestAnimationFrame(measure);
        };

        const io = new IntersectionObserver(([entry]) => {
            setIsLive(entry.isIntersecting);
            if (entry.isIntersecting) {
                window.addEventListener('scroll', onScroll, { passive: true });
                window.addEventListener('resize', onScroll, { passive: true });
                measure();
            } else {
                window.removeEventListener('scroll', onScroll);
                window.removeEventListener('resize', onScroll);
            }
        }, { rootMargin: '140px 0px 140px 0px' });

        io.observe(section);

        return () => {
            io.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    // Reveal used by every card and gate. framer-motion applies the visitor's
    // reduced-motion preference to these itself — measured: with the preference
    // on, every row lands at its final state with no travel. The one thing it
    // does NOT handle is the scroll-linked spine below, which it simply freezes
    // at 0% — that is covered in CSS instead.
    const reveal = (delay = 0) => ({
        initial: { opacity: 0, y: 26 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }
    });

    return (
        <section
            id="selection-process"
            className={`vvitu-sp${isLive ? ' is-live' : ''}`}
            ref={sectionRef}
        >
            {/* ── Ambient layer ──────────────────────────────────────────────
                Everything in here is decorative and transform/opacity-only, so
                it composites on the GPU and never reflows the page. Paused
                unless .is-live, and switched off entirely under
                prefers-reduced-motion. */}
            <div className="vvitu-sp-ambient" aria-hidden="true">
                <span className="vvitu-sp-orb vvitu-sp-orb-1" />
                <span className="vvitu-sp-orb vvitu-sp-orb-2" />
                <span className="vvitu-sp-orb vvitu-sp-orb-3" />

                {/* Radar rings — the radiating circles. Three rings per cluster,
                    each starting a third of a cycle apart so the cluster emits
                    continuously instead of in bursts. */}
                <span className="vvitu-sp-radar vvitu-sp-radar-a"><i /><i /><i /></span>
                <span className="vvitu-sp-radar vvitu-sp-radar-b"><i /><i /><i /></span>
                <span className="vvitu-sp-radar vvitu-sp-radar-c"><i /><i /><i /></span>

                <svg className="vvitu-sp-waves" viewBox="0 0 1440 240" preserveAspectRatio="none" focusable="false">
                    <path className="vvitu-sp-wave vvitu-sp-wave-1" d={WAVE_SLOW} />
                    <path className="vvitu-sp-wave vvitu-sp-wave-2" d={WAVE_FAST} />
                </svg>
            </div>

            <div className="vvitu-sp-container">
                <div className="vvitu-section-title">
                    <h2>Selection <span>Process</span></h2>
                    <p>
                        Eight stages from the orientation to the final list — three of them
                        narrow the field. Here is exactly what each one asks of you.
                    </p>
                </div>

                <div className="vvitu-sp-meta" role="list">
                    <span role="listitem"><strong>8</strong> Stages</span>
                    <i aria-hidden="true" />
                    <span role="listitem"><strong>3</strong> Assessment Rounds</span>
                    <i aria-hidden="true" />
                    <span role="listitem"><strong>3</strong> Shortlisting Gates</span>
                </div>

                <div className="vvitu-sp-rail" ref={railRef}>
                    {/* The funnel itself: a tapering wash behind the cards. Purely
                        decorative — the narrowing is also carried by the card insets,
                        so nothing is lost if this does not paint. */}
                    <div className="vvitu-sp-funnel" aria-hidden="true" />

                    <div className="vvitu-sp-spine" aria-hidden="true">
                        {/* Height is scroll-linked. Under prefers-reduced-motion
                            framer-motion freezes this at 0%, so the stylesheet
                            forces it to full — see the rule on this class. The
                            comet head is a ::after on the fill, so it rides the
                            bottom edge for free. */}
                        <motion.span className="vvitu-sp-spine-fill" style={{ height: fillHeight }} />
                    </div>

                    <ol className="vvitu-sp-list">
                        {SELECTION_STEPS.map((s, i) => (
                            <li
                                key={s.id}
                                className={[
                                    'vvitu-sp-item',
                                    `tier-${s.tier}`,
                                    s.accent ? 'is-accent' : '',
                                    s.isFinal ? 'is-final' : '',
                                    activeIdx === i ? 'is-inview' : ''
                                ].filter(Boolean).join(' ')}
                            >
                                {s.gate && (
                                    <motion.p className="vvitu-sp-gate" {...reveal()} viewport={{ once: true, amount: 0.6 }}>
                                        <IconGate />
                                        <span>{s.gate}</span>
                                    </motion.p>
                                )}

                                <motion.div
                                    className="vvitu-sp-row"
                                    ref={(el) => { rowRefs.current[i] = el; }}
                                    {...reveal()}
                                    viewport={{ once: true, amount: 0.25 }}
                                >
                                    <span className="vvitu-sp-node" aria-hidden="true">
                                        <span className="vvitu-sp-node-icon">{ICONS[s.icon]}</span>
                                        <span className="vvitu-sp-node-step">{s.step}</span>
                                    </span>

                                    <article className="vvitu-sp-card">
                                        <header className="vvitu-sp-card-head">
                                            {s.kicker && <span className="vvitu-sp-kicker">{s.kicker}</span>}
                                            <h3 className="vvitu-sp-title">
                                                <span className="vvitu-sp-title-step">{s.step}</span>
                                                {s.title}
                                            </h3>
                                        </header>

                                        {s.badges && (
                                            <ul className="vvitu-sp-badges">
                                                {s.badges.map((b) => (
                                                    <li key={b.label}>
                                                        <small>{b.label}</small>
                                                        <strong>{b.value}</strong>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {s.summary && <p className="vvitu-sp-summary">{s.summary}</p>}

                                        {s.chips && (
                                            <div className="vvitu-sp-chips">
                                                <span className="vvitu-sp-chips-label">{s.chipsLabel}</span>
                                                <ul>
                                                    {s.chips.map((c) => <li key={c}>{c}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {s.note && (
                                            <p className="vvitu-sp-note">
                                                <svg viewBox="0 0 24 24" width="15" height="15" {...{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} aria-hidden="true">
                                                    <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
                                                </svg>
                                                <span>{s.note}</span>
                                            </p>
                                        )}

                                        {s.channels && (
                                            <ul className="vvitu-sp-channels" aria-label="How this reaches you">
                                                {s.channels.map((c) => <li key={c}>{c}</li>)}
                                            </ul>
                                        )}

                                        {s.outcome && (
                                            <p className="vvitu-sp-outcome">
                                                <svg viewBox="0 0 24 24" width="15" height="15" {...{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.3, strokeLinecap: 'round', strokeLinejoin: 'round' }} aria-hidden="true">
                                                    <path d="m5 13 4 4L19 7" />
                                                </svg>
                                                <span>{s.outcome}</span>
                                            </p>
                                        )}
                                    </article>
                                </motion.div>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
};

export default SelectionProcess;
