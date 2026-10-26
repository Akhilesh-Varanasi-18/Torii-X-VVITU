'use client'
import React, { useState, useEffect } from 'react';
import VvituHeader from './vvitu-header';
import WhoWeAre from './who-we-are';
import Programs from './programs';
import Courses from './courses';
import SelectionProcess from './selection-process';
// "Meet Our Team" is switched off for the VVITU launch — team.jsx and
// team-data.js are untouched and the portfolio pages under public/portfolios/
// are still served. See the restore note at the <Team /> render below.
// import Team from './team';
import VvituFooter from './vvitu-footer';
import RegistrationModal from './registration-modal';
import AnnouncementModal from './announcement-modal';
import WhatsAppCommunityModal from './whatsapp-community-modal';

const VvituMain = () => {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    // Which intake the form should open on. A program card passes its key; the
    // header / hero buttons pass nothing (or a click event) and get the default.
    const [registerProgram, setRegisterProgram] = useState(null);
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
    // The live announcement now comes from the admin dashboard, not a hardcoded
    // file — null until it's fetched (or if nothing is currently published).
    const [announcement, setAnnouncement] = useState(null);

    // Always land on the hero on load/refresh. Two things are handled here:
    // 1) Disable the browser's scroll restoration so a refresh doesn't drop the
    //    user back to wherever they were (e.g. the footer/contact section).
    // 2) The Courses section renders full-height on the server and then collapses
    //    on mount, shifting lower sections up — resetting to top avoids the page
    //    settling on the wrong section after that shift.
    useEffect(() => {
        if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
    }, []);

    // Fetch whatever announcement is currently live from the admin dashboard.
    // Auto-open it once per visitor per announcement id — dismissing one stores
    // its id, so refreshes/returns don't nag, but a *new* announcement (a new
    // id) always gets shown even if an older one was already dismissed.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/announcements/active', { cache: 'no-store' });
                const json = await res.json();
                if (cancelled || !json?.announcement) return;
                setAnnouncement(json.announcement);

                let seen = null;
                try { seen = window.localStorage.getItem('vvitu_announcement_seen'); } catch { /* private mode */ }
                if (seen !== json.announcement.id) {
                    window.setTimeout(() => { if (!cancelled) setIsAnnouncementOpen(true); }, 600);
                }
            } catch { /* no announcement — fail silently, nothing to show */ }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleOpenRegister = (programKey) => {
        setRegisterProgram(typeof programKey === 'string' ? programKey : null);
        setIsRegisterOpen(true);
    };
    const handleCloseRegister = () => setIsRegisterOpen(false);

    const handleOpenAnnouncement = () => setIsAnnouncementOpen(true);
    const handleCloseAnnouncement = () => {
        setIsAnnouncementOpen(false);
        try {
            if (announcement) window.localStorage.setItem('vvitu_announcement_seen', announcement.id);
        } catch { /* private mode — it'll just re-open next visit */ }
    };

    const handleOpenWhatsApp = () => setIsWhatsAppOpen(true);
    const handleCloseWhatsApp = () => setIsWhatsAppOpen(false);

    // From the announcement pop-up: dismiss it first, then surface the community
    // chooser so the two modals never stack on top of each other.
    const handleJoinCommunityFromAnnouncement = () => {
        handleCloseAnnouncement();
        setIsWhatsAppOpen(true);
    };

    return (
        <div className="vvitu-landing">
            <VvituHeader
                onOpenRegister={handleOpenRegister}
                onOpenAnnouncements={handleOpenAnnouncement}
                onOpenWhatsApp={handleOpenWhatsApp}
                announcementCount={announcement ? 1 : 0}
            />
            <WhoWeAre onOpenRegister={handleOpenRegister} />
            <Programs onOpenRegister={handleOpenRegister} />
            <Courses onOpenRegister={handleOpenRegister} />
            <SelectionProcess />
            {/* MEET OUR TEAM — disabled for the VVITU launch.
                To restore, uncomment all four of these together, or the nav
                links will point at a section that isn't on the page:
                  1. the `import Team` above
                  2. this <Team /> render
                  3. the 'Our Team' entry in navItems (components/vvitu/vvitu-header.jsx)
                  4. the 'Team' entry in navLinks (components/vvitu/vvitu-footer.jsx) */}
            {/* <Team /> */}
            <div id="contact">
                <VvituFooter />
            </div>

            {/* Student Registration Modal Pop-up */}
            <RegistrationModal
                isOpen={isRegisterOpen}
                onClose={handleCloseRegister}
                initialProgramKey={registerProgram}
            />

            {/* Announcement Pop-up (auto-opens once; reopen via header bell) */}
            <AnnouncementModal
                isOpen={isAnnouncementOpen}
                onClose={handleCloseAnnouncement}
                onJoinCommunity={handleJoinCommunityFromAnnouncement}
                announcement={announcement}
            />

            {/* WhatsApp community chooser (Community + Year-wise Groups tabs) */}
            <WhatsAppCommunityModal
                isOpen={isWhatsAppOpen}
                onClose={handleCloseWhatsApp}
            />
        </div>
    );
};

export default VvituMain;
