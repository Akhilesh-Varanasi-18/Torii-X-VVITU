'use client'
import React, { useState, useEffect, useRef } from 'react';
import { TORIIMINDS_URL, VVITU_COLLEGE_URL } from '../../lib/site-config';

const navItems = [
    { label: 'Who We Are', href: '#who-we-are' },
    { label: 'Programs', href: '#programs' },
    { label: 'Courses', href: '#courses' },
    { label: 'Selection Process', href: '#selection-process' },
    // "Meet Our Team" is switched off for the VVITU launch, so its nav entry is
    // parked here rather than deleted. Restore it by uncommenting this line *and*
    // the <Team /> render in components/vvitu/index.jsx — the two have to come
    // back together, or this link scrolls to a section that isn't mounted.
    // { label: 'Our Team', href: '#team' },
    { label: 'Contact Us', href: '#contact' },
];

// Scroll-spy and smooth-scroll measure against the bar's height, so these must
// stay in step with --vvitu-header-h in the HEADER GEOMETRY block at the bottom
// of _vvitu-sections.scss, which is the single source of truth for the rest.
//
// They came down from 100/84 when the college lockup was swapped for its
// mark-only variant: the old artwork carried two lines of fine print that were
// illegible at any sane header height, and dropping them let the bar lose 20%
// of its height without the mark itself shrinking much.
const HEADER_HEIGHT = 80;
const HEADER_HEIGHT_MOBILE = 70;

const VvituHeader = ({ onOpenRegister, onOpenAnnouncements, onOpenWhatsApp, announcementCount = 0 }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('');
    const isAutoScrolling = useRef(false);
    const scrollUnlockTimer = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);

            if (isAutoScrolling.current) return;

            // Detect active section
            const sections = navItems.map(item => item.href.substring(1));
            for (let i = sections.length - 1; i >= 0; i--) {
                const el = document.getElementById(sections[i]);
                if (el && el.getBoundingClientRect().top <= 150) {
                    setActiveSection(sections[i]);
                    break;
                }
            }
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('scrollend', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scrollend', handleScroll);
            window.clearTimeout(scrollUnlockTimer.current);
        };
    }, []);

    const handleNavClick = (e, href) => {
        e.preventDefault();
        setMobileOpen(false);
        setActiveSection(href.substring(1));
        const el = document.querySelector(href);
        if (el) {
            isAutoScrolling.current = true;
            window.clearTimeout(scrollUnlockTimer.current);
            // Clear the fixed header, plus a little breathing room so the
            // section heading doesn't sit flush against the bar.
            const offset = (window.innerWidth <= 767 ? HEADER_HEIGHT_MOBILE : HEADER_HEIGHT) + 8;
            const top = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
            scrollUnlockTimer.current = window.setTimeout(() => {
                isAutoScrolling.current = false;
            }, 1200);
        }
    };

    return (
        <>
            <header className="vvitu-header" style={isScrolled ? { boxShadow: 'var(--vvitu-shadow-hover)' } : {}}>
                <div className="vvitu-header-container">
                    <div className="vvitu-collab-brand" aria-label="ToriiMinds and Vasireddy Venkatadri International Technological University collaboration">
                        <a
                            href={TORIIMINDS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vvitu-brand-logo vvitu-brand-logo-torii"
                            aria-label="Visit ToriiMinds website"
                        >
                            <img src="/assets/images/vvitu/project-images/logo-white.png" alt="ToriiMinds" />
                        </a>
                        <span className="vvitu-brand-separator" aria-hidden="true">X</span>
                        <a
                            href={VVITU_COLLEGE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vvitu-brand-logo vvitu-brand-logo-college"
                            aria-label="Visit Vasireddy Venkatadri International Technological University website"
                        >
                            {/* Background-knocked PNG at 560px — roughly 7x the
                                rendered width, so it stays crisp on 3x screens.

                                The MARK-ONLY variant: the official lockup with
                                its two lines of fine print ("Vasireddy Venkatadri
                                / International Technological University") cut off,
                                leaving the globe, VVIT and UNIVERSITY. 1.293:1
                                rather than the full lockup's 1.092:1.

                                The fine print was never readable here — ~4px a
                                line at header scale — and it was the only reason
                                the bar had to be 100px tall. Dropping it makes the
                                legible part 18.8% larger at the same rendered
                                height, which is what paid for the shorter bar.

                                The institution's full name still reaches screen
                                readers through `alt` below; it is only the
                                *picture* of it that is gone.

                                `vvitu-logo.png` next to this file is the complete
                                lockup, if it is ever wanted back — swap the src
                                and raise --vvitu-mark-h, nothing else. */}
                            <img src="/assets/images/vvitu/project-images/vvitu-logo-mark.png" alt="Vasireddy Venkatadri International Technological University" />
                        </a>
                    </div>

                    <ul className="vvitu-nav">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <a
                                    href={item.href}
                                    className={activeSection === item.href.substring(1) ? 'active' : ''}
                                    onClick={(e) => handleNavClick(e, item.href)}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    {/* Stays visible in the header at every breakpoint — never
                        collapses into the hamburger menu. */}
                    <div className="vvitu-header-actions">
                        {announcementCount > 0 && (
                            <div className="vvitu-notify-wrap">
                                <button
                                    type="button"
                                    className="vvitu-btn-notify"
                                    onClick={() => onOpenAnnouncements && onOpenAnnouncements()}
                                    aria-label={`View ${announcementCount} ${announcementCount === 1 ? 'announcement' : 'announcements'}`}
                                    title="Announcements"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                    <span className="vvitu-notify-ping" aria-hidden="true" />
                                </button>

                                {/* Eye-catching bouncing flag so the announcement never goes unnoticed. */}
                                <button
                                    type="button"
                                    className="vvitu-notify-flag"
                                    onClick={() => onOpenAnnouncements && onOpenAnnouncements()}
                                    aria-hidden="true"
                                    tabIndex={-1}
                                >
                                    <span className="vvitu-notify-flag-dot" />
                                    <span>New Announcement{announcementCount === 1 ? '' : 's'}</span>
                                </button>
                            </div>
                        )}
                        <button
                            type="button"
                            className="vvitu-btn-whatsapp"
                            onClick={() => onOpenWhatsApp && onOpenWhatsApp()}
                            aria-label="Join Official WhatsApp Community"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span>Join Community</span>
                        </button>
                        <button 
                            type="button" 
                            className="vvitu-btn-login"
                            onClick={() => onOpenRegister && onOpenRegister()}
                        >
                            Register
                        </button>
                    </div>

                    <button
                        className={`vvitu-mobile-toggle ${mobileOpen ? 'open' : ''}`}
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </header>

            <div className={`vvitu-mobile-nav ${mobileOpen ? 'open' : ''}`}>
                <ul>
                    {/* Section links only — Register and Join Community live
                        permanently in the header, so duplicating them here would
                        give the same action two places to live. */}
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <a href={item.href} onClick={(e) => handleNavClick(e, item.href)}>
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="vvitu-header-spacer"></div>
        </>
    );
};

export default VvituHeader;
