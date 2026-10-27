'use client'
import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import programsData from './programs-data';
import { withOrdinalSup } from './ordinal';
import ProgramDetailModal from './program-detail-modal';

// Custom Prev Arrow for Slick Carousel
function PrevArrow(props) {
    const { className, style, onClick } = props;
    return (
        <button
            type="button"
            className="vvitu-slick-arrow vvitu-slick-prev"
            style={{ ...style }}
            onClick={onClick}
            aria-label="Previous Program"
        >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
            </svg>
        </button>
    );
}

// Custom Next Arrow for Slick Carousel
function NextArrow(props) {
    const { className, style, onClick } = props;
    return (
        <button
            type="button"
            className="vvitu-slick-arrow vvitu-slick-next"
            style={{ ...style }}
            onClick={onClick}
            aria-label="Next Program"
        >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
            </svg>
        </button>
    );
}

// Resolve how many cards to show for a given viewport width.
// 1 card on phones, 2 on tablets, 3 on desktop.
const getSlidesToShow = (width) => {
    if (width <= 767) return 1;
    if (width <= 1199) return 2;
    return 3;
};

const Programs = ({ onOpenRegister }) => {
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Drive slidesToShow from the real viewport width ourselves.
    // react-slick's built-in `responsive` only reacts to matchMedia *change*
    // events and never checks the initial match on mount, so on a direct
    // mobile page load it stays stuck on the desktop default (3 cards).
    // SSR-safe: start at desktop default, then correct on mount (no hydration mismatch).
    const [slidesToShow, setSlidesToShow] = useState(3);

    useEffect(() => {
        const updateSlides = () => setSlidesToShow(getSlidesToShow(window.innerWidth));
        updateSlides(); // run immediately on mount — this is the piece slick misses
        window.addEventListener('resize', updateSlides);
        return () => window.removeEventListener('resize', updateSlides);
    }, []);

    const handleOpenProgram = (program) => {
        setSelectedProgram(program);
        setIsModalOpen(true);
    };

    const handleCloseProgram = () => {
        setIsModalOpen(false);
        setSelectedProgram(null);
    };

    // Open the registration form straight onto this program's intake.
    const handleRegister = (program) => {
        if (onOpenRegister) onOpenRegister(program.registrationKey || program.id);
    };

    // Slick Carousel settings — slidesToShow is computed above, not via `responsive`.
    const sliderSettings = {
        dots: false,
        infinite: true,
        speed: 500,
        slidesToShow,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 4500,
        pauseOnHover: true,
        pauseOnFocus: true,
        swipe: true,
        swipeToSlide: true,
        touchThreshold: 12,
        arrows: true,
        prevArrow: <PrevArrow />,
        nextArrow: <NextArrow />,
    };

    return (
        <section id="programs" className="vvitu-programs">
            <div className="vvitu-programs-container">
                {/* Section Header */}
                <div className="vvitu-section-title" data-sal="slide-up" data-sal-delay="100" data-sal-duration="800">
                    <h2>Programs We <span>Offer</span></h2>
                    <p>
                        Comprehensive engineering curriculums tailored from foundational coding
                        through advanced competitive programming to industry-ready development.
                    </p>
                </div>

                {/* 5-Card Slick Carousel */}
                <div className="vvitu-programs-carousel-wrapper">
                    {/* key={slidesToShow} forces a clean remount when the breakpoint
                        changes so react-slick re-measures the track from scratch —
                        without it, slick keeps the stale SSR (3-up) slide width and
                        overflows the viewport on mobile. */}
                    <Slider key={slidesToShow} {...sliderSettings}>
                        {programsData.map((program) => (
                            <div key={program.id} className="vvitu-program-slide-item">
                                <div className={`vvitu-program-card ${program.id} ${program.registrationsOpen ? 'is-open' : ''}`}>
                                    {/* Full-width Top Logo Banner */}
                                    <div className="vvitu-program-banner-wrapper">
                                        <img 
                                            src={program.banner} 
                                            alt={`${program.name} Banner`} 
                                            className="vvitu-program-banner-img"
                                        />
                                        {/* Status badge (left) and year pill (right) share one
                                            row, so a long year label can never collide with the
                                            badge on a narrow card. An ELIGIBILITY label is the
                                            exception and leaves this row entirely — see the
                                            banner-bottom block below for why. */}
                                        {/* A Coming Soon card carries no status badge and no year
                                            pill — the track isn't on offer, so an intake status and a
                                            year are both noise. Live cards keep the whole row. */}
                                        <div className="vvitu-program-banner-top">
                                            {!program.comingSoon && program.registrationsClosed && (
                                                <span className="vvitu-program-closed-badge">
                                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <rect x="4" y="10" width="16" height="10" rx="2" />
                                                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                                    </svg>
                                                    Registrations Closed
                                                </span>
                                            )}
                                            {/* Live intake: a green badge-button on the banner that opens
                                                the form directly on this program (mirrors the closed badge). */}
                                            {!program.comingSoon && program.registrationsOpen && (
                                                <button
                                                    type="button"
                                                    className="vvitu-program-open-badge"
                                                    onClick={() => handleRegister(program)}
                                                    aria-label={`Registrations are open now for ${program.name} — register`}
                                                >
                                                    <span className="vvitu-program-open-dot" aria-hidden="true" />
                                                    {/* "Registrations Open", not "Registrations are
                                                        open now": the longer line cost 235px of a
                                                        378px row on a 3-up desktop card and said
                                                        nothing more. The pulsing dot already carries
                                                        the "right now" part. */}
                                                    <span className="vvitu-program-open-text">Registrations Open</span>
                                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <path d="M5 12h14M13 6l6 6-6 6" />
                                                    </svg>
                                                </button>
                                            )}
                                            {/* The passout year, read as a quiet label. A program
                                                that sets `yearHighlight` puts its ELIGIBILITY in
                                                this field instead and renders it below rather than
                                                here, so this stays the quiet-label slot it was
                                                designed to be. */}
                                            {!program.comingSoon && !program.yearHighlight && (
                                                <span className="vvitu-program-year-pill">
                                                    {withOrdinalSup(program.year)}
                                                </span>
                                            )}
                                        </div>

                                        {/* ELIGIBILITY sits at the foot of the banner, not in the
                                            top row. Two emphatic chips cannot share that row: the
                                            status badge and this one consumed 100% of it at every
                                            width (378px of 378px on desktop, 328px of 328px on a
                                            phone), which forced "Exclusive for Hostelers" to wrap
                                            onto two ragged lines taller than the badge beside it.
                                            Down here it has the full card width, so it never wraps
                                            however long the label gets — and it lands directly
                                            above the tagline, so a day scholar reads "this batch
                                            is not for me" before reading what the batch teaches. */}
                                        {!program.comingSoon && program.yearHighlight && (
                                            <div className="vvitu-program-banner-bottom">
                                                <span className="vvitu-program-eligibility-chip">
                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                                                        <path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 16.6 6.4 19.9l1.3-6.4L3 9.2l6.3-.7z" />
                                                    </svg>
                                                    {withOrdinalSup(program.year)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Content Body */}
                                    <div className="vvitu-program-card-body">
                                        {program.tagline && (
                                            <span className="vvitu-program-tagline">{program.tagline}</span>
                                        )}
                                        <p className="vvitu-program-desc">{program.description}</p>

                                        {/* Action Buttons — an open intake gets a Register CTA beside the syllabus link */}
                                        <div className={`vvitu-program-card-footer ${program.registrationsOpen ? 'is-dual' : ''}`}>
                                            {program.registrationsOpen && (
                                                <button
                                                    type="button"
                                                    className="vvitu-program-btn vvitu-program-btn--register"
                                                    onClick={() => handleRegister(program)}
                                                >
                                                    Register Now <span>→</span>
                                                </button>
                                            )}
                                            {/* A track that isn't on offer has no syllabus to show
                                                yet, so Explore Syllabus is swapped for the frosted
                                                Coming Soon plate. It is a <span>, not a disabled
                                                <button> — there is no action to disable, and this
                                                keeps it out of the tab order entirely. */}
                                            {program.comingSoon ? (
                                                <span className="vvitu-program-btn vvitu-program-btn--soon" aria-label={`${program.name} — coming soon`}>
                                                    <span className="vvitu-soon-sheen" aria-hidden="true" />
                                                    <span className="vvitu-soon-label">
                                                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <circle cx="12" cy="12" r="9" />
                                                            <path d="M12 7v5l3 2" />
                                                        </svg>
                                                        Coming Soon
                                                    </span>
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="vvitu-program-btn"
                                                    onClick={() => handleOpenProgram(program)}
                                                >
                                                    Explore Syllabus <span>→</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Slider>
                </div>
            </div>

            {/* In-depth Program & Syllabus Modal */}
            <ProgramDetailModal
                program={selectedProgram}
                isOpen={isModalOpen}
                onClose={handleCloseProgram}
            />
        </section>
    );
};

export default Programs;
