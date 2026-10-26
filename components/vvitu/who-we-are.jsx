 'use client';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Slide order tells the collaboration story in four beats:
// 1) credibility & launch, 2) the year-wise program ladder,
// 3) where and what students learn on, 4) outcomes and the people behind it.
const gallerySlides = [
	['Visionary_Leadership_hq.jpg', 'Visionary Leadership', 'Guided by industry visionaries and academic leaders shaping future-ready talent.'],
	// Official MOU slide hidden for now — the photo on file is SRKR's signing,
	// not VVITU's. Restore this line once the VVITU MOU photo is available
	// (drop it in about_torii/ and point `Official_MOU.jpg` at it).
	// ['Official_MOU.jpg', 'Official MOU', 'Strategic institutional collaboration with VVITU to deliver enterprise tech excellence.'],
	['Prarambh_Event.jpg', 'Prarambh Launch', 'Our grand launch ceremony welcoming an entire engineering cohort into the ToriiMinds journey.'],
	['Bamboo_Coder.jpeg', 'Bamboo Coder', '1st Year foundation track mastering computational logic and hands-on coding in C.'],
	['SkillUp_Coder.jpeg', 'SkillUp Coder', '2nd Year problem-solving track mastering Data Structures, Algorithms & LeetCode patterns.'],
	['AI_Ready_Engineer.jpeg', 'AI Ready Engineer Program', '2nd Year industry track covering problem solving & DSA, advanced competitive programming, full stack development and Google Flutter.'],
	['Moon_Coder.jpeg', 'Moon Coder', 'Elite platform for learning advanced problem-solving methods. (Exclusive for 2029 Passouts)'],
	['Owl_coder.jpeg', 'Owl Coder', 'Elite platform for advanced coders and competitive champions. (Exclusive for 2028 Passouts)'],
	['owl_coder_Ai_Integrated_coding_platform.jpeg', 'Owl Coder AI Platform', 'AI-integrated coding platform delivering guided problem sets, live evaluation, and contest-grade practice for our competitive champions.'],
	['Our_Class_Rooms.jpg', 'Our Classrooms', 'Modern smart classrooms where every student learns hands-on with live mentor guidance.'],
	['Myna_AI_integrated_communication_platform.jpg', 'Myna AI Platform', 'AI-powered communication coach with 25 LSRW modules building interview and placement readiness.'],
	['Torii_Connect_Stalls.jpeg', 'Torii Connect Expo', 'Interactive domain stalls where students explore Data Structures, Java, DBMS, and hiring roles.'],
	['certifications.JPG', 'Global Certifications', 'Industry-recognized credentials in AWS Cloud, ServiceNow, Claude AI & DevOps.'],
	// Supplied as "Proud AI Technology Partners.png" (1738x905, 1.92:1) — the
	// card is 16:10, so object-fit: cover would have sheared 8.3% off each side,
	// killing both sparkle clusters and leaving the badges flush with the frame.
	// Padded to a true 16:10 instead: the poster's top and bottom rows were
	// measured flat and stable 30px inward, so extending them adds 90px of its
	// own gradient above and 91px below with no visible seam and nothing cropped.
	// Supersedes Our_AI_Partners.jpeg, whose Claude badge still read
	// "Partner Network / Member" rather than "Certified Services Partner".
	['Proud_AI_Technology_Partners.jpg', 'Our AI Technology Partners', 'Officially partnered with Anthropic (Claude) & OpenAI — enterprise-grade AI tools and certification pathways powering every ToriiMinds classroom.'],
	['torii_team.JPG', 'Torii Team', 'Dedicated mentors, platform architects, and industry practitioners driving student transformation.'],
].map(([file, title, caption]) => ({ image: `/assets/images/vvitu/project-images/about_torii/${file}`, title, caption }));

export default function WhoWeAre() {
	const [activeSlide, setActiveSlide] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const prefersReduced = useReducedMotion();

	// useReducedMotion() cannot know the visitor's preference during the server
	// render, so it reports false there and (for a visitor who has the setting
	// on) true on the client. The slide `animate` props below are derived from
	// it, which made the server and the first client render disagree about every
	// card's transform — a React hydration mismatch that threw away the
	// server-rendered gallery and rebuilt it, for exactly the visitors least able
	// to absorb a flash of re-layout. Holding the preference back until after
	// mount makes both renders agree; framer-motion skips transform animations
	// under the preference anyway, so the switch costs no travel.
	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);
	const reduceMotion = mounted && prefersReduced;

	useEffect(() => {
		if (isPaused || reduceMotion) return undefined;
		const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % gallerySlides.length), 3500);
		return () => window.clearInterval(timer);
	}, [isPaused, reduceMotion]);

	const getOffset = (index) => {
		let offset = index - activeSlide;
		if (offset > gallerySlides.length / 2) offset -= gallerySlides.length;
		if (offset < -gallerySlides.length / 2) offset += gallerySlides.length;
		return offset;
	};

	const moveSlide = (direction) => {
		setActiveSlide((current) => (current + direction + gallerySlides.length) % gallerySlides.length);
	};

	return (
		<section id="who-we-are" className="vvitu-hero">
			<div className="vvitu-hero-container">
				<div className="vvitu-hero-content">
					<img className="vvitu-stepin-logo" src="/assets/images/vvitu/project-images/about_torii/stepin_rotate_light.gif" alt="Step In" />
					<h1>Your Gateway to<br /><span>Tech Excellence</span></h1>
					<p>ToriiMinds is a comprehensive tech education platform transforming engineering students into industry-ready professionals through structured coding, AI integration, and career-readiness training from first year through graduation.</p>
					<div className="vvitu-hero-cta">
						<a href="#programs" className="vvitu-btn-primary">Explore Programs →</a>
						<a href="#courses" className="vvitu-btn-outline">Browse Courses</a>
					</div>
					<div className="vvitu-hero-stats">
						<div className="vvitu-hero-stat-item">
							<strong>5+</strong>
							<span>Flagship Programs</span>
						</div>
						<div className="vvitu-hero-stat-divider" />
						<div className="vvitu-hero-stat-item">
							<strong>2</strong>
							<span>Specialized Tracks</span>
						</div>
						<div className="vvitu-hero-stat-divider" />
						<div className="vvitu-hero-stat-item">
							<strong>100%</strong>
							<span>Hands-on Labs</span>
						</div>
					</div>
				</div>
				<div className="vvitu-hero-visual" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} onFocus={() => setIsPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false); }}>
					<div className="vvitu-gallery-heading" aria-live="polite"><AnimatePresence mode="wait" initial={false}><motion.strong key={gallerySlides[activeSlide].title} initial={reduceMotion ? false : { opacity: 0, y: 34, scale: 0.82 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 16 }}>{gallerySlides[activeSlide].title}</motion.strong></AnimatePresence></div>
					<div className="vvitu-gallery-stage-wrapper">
						<div className="vvitu-gallery-stage">
							{gallerySlides.map((slide, index) => { const offset = getOffset(index); const distance = Math.abs(offset); const visible = distance <= 2; return <motion.button type="button" key={slide.image} className={`vvitu-gallery-card ${index === activeSlide ? 'is-active' : ''}`} aria-label={`Show ${slide.title}`} onClick={() => setActiveSlide(index)} initial={false} animate={reduceMotion ? { opacity: index === activeSlide ? 1 : 0, x: 0, z: 0, rotateY: 0, scale: index === activeSlide ? 1 : 0.9 } : { opacity: visible ? 1 - distance * 0.22 : 0, x: `${offset * 39}%`, z: -distance * 125, rotateY: offset * -38, scale: 1 - distance * 0.1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} style={{ zIndex: 10 - distance, pointerEvents: visible ? 'auto' : 'none' }}><img src={slide.image} alt={slide.title} /><span className="vvitu-gallery-scrim" /><span className="vvitu-gallery-description"><strong>{slide.title}</strong><span>{slide.caption}</span></span></motion.button>; })}
						</div>
						<div className="vvitu-gallery-arrows">
							<button type="button" className="vvitu-gallery-arrow vvitu-gallery-arrow-prev" aria-label="Previous gallery image" onClick={(e) => { e.stopPropagation(); moveSlide(-1); }}>‹</button>
							<button type="button" className="vvitu-gallery-arrow vvitu-gallery-arrow-next" aria-label="Next gallery image" onClick={(e) => { e.stopPropagation(); moveSlide(1); }}>›</button>
						</div>
					</div>
					<div className="vvitu-gallery-dots" role="tablist" aria-label="Gallery slides">{gallerySlides.map((slide, index) => <button type="button" role="tab" key={slide.image} className={index === activeSlide ? 'is-active' : ''} aria-label={`Show ${slide.title}`} aria-selected={index === activeSlide} onClick={() => setActiveSlide(index)} />)}</div>
				</div>
			</div>
		</section>
	);
}
