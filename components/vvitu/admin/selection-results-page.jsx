'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAdmin } from './admin-context';
import Segmented from '../dashboard/coding/segmented';
import { IconRefresh, IconUpload, IconSearch, IconClose, IconStar, IconCheckCircle, IconDownload } from '../dashboard/dashboard-icons';
import { formatDateTime } from '../dashboard/coding/coding-theme';
import {
    SELECTION_ROUNDS,
    INTERVIEW_ROUND,
    MAX_STARS,
    SCORE_FIELDS,
    MAX_REMARKS,
    roundByKey,
    SELECTION_PROGRAMS,
    DEFAULT_PROGRAM_CODE,
    programByCode
} from '../../../lib/selection-results';
import { formatDate, formatSlot } from '../../../lib/interview-panels';

// Step 3 is a monitoring surface most visitors to this page never open — they
// came to upload a list or score one student. Loading it on demand keeps its
// table, filters and framer-motion segmented controls out of the bundle until
// somebody scrolls to it. `ssr: false` for the same reason the coding module
// does it (§8.6): nothing here renders usefully on the server, and it reads
// live data anyway.
// The register is the first thing on the page, but it is a large table most
// visits do not need — somebody opening this page to score one student never
// scrolls to it. Lazy, like the panel view, for the same reason (§8.6).
const RegistrationsView = dynamic(() => import('./selection/registrations-view'), {
    ssr: false,
    loading: () => <p className="sr-roster__empty">Loading the register…</p>
});

const PanelsView = dynamic(() => import('./selection/panels-view'), {
    ssr: false,
    loading: () => <p className="sr-roster__empty">Loading the panel view…</p>
});

// The AI Ready Engineers results module. Two jobs on one page, both scoped to the
// academic year picked in the top bar:
//
//   1. Round lists — upload the roll numbers for one selection stage (Demo Test …
//      Final Shortlist). Preview first, then commit; the preview is the only real
//      check that the right file went against the right round.
//   2. Interview scores — find a student on the interview list by name or roll
//      number, give them 1-5 stars for coding and for communication, and
//      optionally write a remark (what the stars cannot say: "suspected
//      cheating", "strong fundamentals").
//
// Everything is written onto the student's own document in vvitu_hostel_roster
// (see lib/selection-results.js for the layout).

const num = (v) => Number(v || 0).toLocaleString('en-IN');

async function call(url, options, unauthorized) {
    const res = await fetch(url, { cache: 'no-store', ...options });
    if (res.status === 401) {
        unauthorized();
        throw new Error('Your session has ended.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
        const error = new Error(json.message || 'Something went wrong.');
        error.payload = json;
        throw error;
    }
    return json;
}

export default function SelectionResultsPage() {
    const { unauthorized } = useAdmin();
    const [years, setYears] = useState([]);
    const [year, setYear] = useState('');
    // Which intake the whole page is showing. Everything below — the register,
    // the round lists, the scores and the panels — is scoped to this.
    const [program, setProgram] = useState(DEFAULT_PROGRAM_CODE);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(
        async (wanted, wantedProgram) => {
            setLoading(true);
            setError('');
            try {
                const qs = new URLSearchParams();
                if (wanted) qs.set('year', wanted);
                qs.set('program', wantedProgram || program);
                const json = await call(`/api/admin/selection?${qs.toString()}`, {}, unauthorized);
                setYears(json.years || []);
                setYear(json.year || '');
                if (json.program) setProgram(json.program);
                setSummary(json.summary);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        },
        // `program` is read, not watched: load() is always called with the value
        // it should use, and watching it would fire a second request on every
        // change on top of the one the handler already makes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [unauthorized]
    );

    useEffect(() => {
        load();
    }, [load]);

    // Bumped after an interview-list upload, so the scoring panel refetches.
    const [interviewVersion, setInterviewVersion] = useState(0);
    // Bumped by anything that changes what the panel view counts: a new
    // interview list, or a score saved above it. Kept separate from
    // interviewVersion because that one is the scoring card's React `key` —
    // bumping it on every save would tear the card down mid-edit and lose the
    // panelist and remarks the person had just typed.
    const [panelVersion, setPanelVersion] = useState(0);

    const onCommitted = (round) => {
        load(year);
        if (round === INTERVIEW_ROUND) {
            setInterviewVersion((v) => v + 1);
            setPanelVersion((v) => v + 1);
        }
    };

    return (
        <>
            <header className="cp-topbar">
                <div className="cp-topbar__brand">
                    <img
                        className="cp-topbar__logo"
                        src="/assets/images/vvitu/project-images/torii-dark-text.svg"
                        alt="ToriiMinds"
                        width="500"
                        height="240"
                    />
                    <div className="cp-topbar__titles">
                        <h1 className="cp-topbar__title">Selection Process</h1>
                        <p className="cp-topbar__sub">
                            {programByCode(program)?.name || program} · registrations, round-by-round shortlists and interview scores
                        </p>
                    </div>
                </div>
                <div className="cp-topbar__actions">
                    {/* Programme first: it decides what the year even means. */}
                    <label className="sr-year sr-year--program">
                        <span className="sr-year__label">Programme</span>
                        <select
                            className="sr-year__select"
                            value={program}
                            onChange={(e) => {
                                setProgram(e.target.value);
                                load(year, e.target.value);
                            }}
                            disabled={loading}
                        >
                            {SELECTION_PROGRAMS.map((p) => (
                                <option key={p.code} value={p.code}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="sr-year">
                        <span className="sr-year__label">Academic year</span>
                        <select
                            className="sr-year__select"
                            value={year}
                            onChange={(e) => load(e.target.value, program)}
                            disabled={!years.length || loading}
                        >
                            {!years.length && <option value="">—</option>}
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </label>
                    {/* The whole year as one workbook: a funnel sheet plus one sheet per round. */}
                    {year && (
                        <a
                            className="cp-btn cp-btn--ghost cp-btn--compact sr-export"
                            href={`/api/admin/selection/export?year=${encodeURIComponent(year)}&program=${encodeURIComponent(program)}`}
                            download
                            aria-label={`Export all ${year} rounds to Excel`}
                        >
                            <IconDownload /> <span className="cp-btn__text">Export all rounds</span>
                        </a>
                    )}
                    <button
                        type="button"
                        className="cp-btn cp-btn--ghost cp-btn--compact"
                        onClick={() => load(year)}
                        disabled={loading}
                        aria-label={loading ? 'Refreshing' : 'Refresh'}
                    >
                        <IconRefresh /> <span className="cp-btn__text">{loading ? 'Refreshing…' : 'Refresh'}</span>
                    </button>
                </div>
            </header>

            {error && (
                <p className="cp-alert cp-alert--error">
                    {error}{' '}
                    <button type="button" className="cp-an-link" onClick={() => load(year)}>
                        Try again
                    </button>
                </p>
            )}

            {!loading && !error && !years.length && (
                <p className="cp-alert cp-alert--warn">
                    The hostel roster is empty, so there is no academic year to record results against. Seed it first with
                    <code> scripts/seed-hostel-roster.mjs</code>.
                </p>
            )}

            {year && (
                <div className="sr-stack">
                    <section className="sr-card" aria-labelledby="rg-title">
                        <div className="sr-card__head">
                            <div>
                                <p className="sr-card__eyebrow">Step 1</p>
                                <h2 id="rg-title" className="sr-card__title">
                                    Registrations
                                </h2>
                                <p className="sr-card__sub">
                                    Who signed up for {programByCode(program)?.name || program} — searchable, filterable, and
                                    exportable as the rows you are looking at.
                                </p>
                            </div>
                        </div>
                        <RegistrationsView unauthorized={unauthorized} programCode={program} />
                    </section>

                    <RoundLists
                        key={program}
                        year={year}
                        program={program}
                        summary={summary}
                        unauthorized={unauthorized}
                        onCommitted={onCommitted}
                        panelVersion={panelVersion}
                    />
                    <InterviewScores
                        key={`${year}:${program}:${interviewVersion}`}
                        year={year}
                        program={program}
                        unauthorized={unauthorized}
                        onScored={() => {
                            load(year);
                            setPanelVersion((v) => v + 1);
                        }}
                    />
                </div>
            )}
        </>
    );
}

// ── 1. Round lists ──────────────────────────────────────────────────────────

function RoundLists({ year, program, summary, unauthorized, onCommitted, panelVersion }) {
    const [round, setRound] = useState(SELECTION_ROUNDS[0].key);
    const [mode, setMode] = useState('replace');
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [done, setDone] = useState(null);
    // Bumped after a commit so the open student list refetches what was just saved.
    const [listVersion, setListVersion] = useState(0);
    const fileRef = useRef(null);

    const counts = useMemo(() => Object.fromEntries((summary?.rounds || []).map((r) => [r.key, r])), [summary]);
    const def = roundByKey(round);

    // Any change to the input invalidates the preview — committing must never
    // write something other than what was just shown.
    const reset = () => {
        setPreview(null);
        setError('');
        setDone(null);
    };

    // A different year is a different set of lists; drop anything in flight.
    useEffect(() => {
        setPreview(null);
        setDone(null);
        setError('');
    }, [year]);

    const send = async (dryRun) => {
        setBusy(true);
        setError('');
        if (dryRun) setDone(null);
        try {
            const form = new FormData();
            form.set('year', year);
            form.set('program', program);
            form.set('round', round);
            form.set('mode', mode);
            if (file) form.set('file', file);
            else form.set('text', text);
            const json = await call(`/api/admin/selection/rounds${dryRun ? '?dryRun=1' : ''}`, { method: 'POST', body: form }, unauthorized);
            if (dryRun) {
                setPreview(json);
            } else {
                setDone({ ...json.result, round, year });
                setPreview(null);
                setText('');
                setFile(null);
                if (fileRef.current) fileRef.current.value = '';
                setListVersion((v) => v + 1);
                onCommitted(round);
            }
        } catch (e) {
            setError(e.message);
            // A refused upload can still carry a plan worth showing (e.g. every roll
            // number was on another year's roster).
            if (e.payload?.plan) setPreview({ ...e.payload, refused: true });
        } finally {
            setBusy(false);
        }
    };

    const hasInput = Boolean(file) || Boolean(text.trim());
    const plan = preview?.plan;

    return (
        <section className="sr-card" aria-labelledby="sr-rounds-title">
            <div className="sr-card__head">
                <div>
                    <p className="sr-card__eyebrow">Step 2</p>
                    <h2 id="sr-rounds-title" className="sr-card__title">
                        Round lists
                    </h2>
                    <p className="sr-card__sub">
                        Upload the roll numbers for one stage of the selection. Only students on the {year} hostel roster are
                        recorded; anything else is listed back to you.
                    </p>
                </div>
                {summary && (
                    <p className="sr-card__meta">
                        <strong>{num(summary.roster)}</strong> on the {year} roster
                    </p>
                )}
            </div>

            {/* The funnel: one tile per round, its list size, and which one is being uploaded. */}
            <div className="sr-rounds" role="radiogroup" aria-label="Round to upload">
                {SELECTION_ROUNDS.map((r, i) => {
                    const c = counts[r.key];
                    const active = r.key === round;
                    return (
                        <button
                            key={r.key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={`sr-round${active ? ' is-active' : ''}${c?.count ? ' has-list' : ''}`}
                            onClick={() => {
                                setRound(r.key);
                                reset();
                            }}
                        >
                            <span className="sr-round__no">{String(i + 1).padStart(2, '0')}</span>
                            <span className="sr-round__label">{r.short}</span>
                            <span className="sr-round__count">{c ? num(c.count) : '—'}</span>
                            <span className="sr-round__when">{c?.updatedAt ? formatDateTime(c.updatedAt) : 'No list yet'}</span>
                        </button>
                    );
                })}
            </div>

            {/* Clicking a tile opens who is on that round's list right now.
                The Interview round gets the full panel view rather than the
                plain list: it is the same students with the same columns plus
                panel, slot, who scored them and their remarks, so showing both
                meant maintaining — and reading — the same table twice. */}
            {round === INTERVIEW_ROUND ? (
                <PanelsView
                    key={`${year}:${program}:${listVersion}:${panelVersion}`}
                    year={year}
                    program={program}
                    unauthorized={unauthorized}
                    version={panelVersion}
                    embedded
                />
            ) : (
                <RoundStudents
                    key={`${year}:${program}:${round}`}
                    year={year}
                    program={program}
                    round={round}
                    version={listVersion}
                    unauthorized={unauthorized}
                />
            )}

            <div className="sr-upload">
                <div className="sr-upload__head">
                    <div>
                        <h3 className="sr-upload__title">Upload · {def.label}</h3>
                        <p className="sr-upload__hint">{def.listOf}</p>
                    </div>
                    <a
                        className="cp-btn cp-btn--ghost cp-btn--compact sr-upload__template"
                        href={`/api/admin/selection/rounds/template?round=${encodeURIComponent(round)}`}
                        download
                    >
                        <IconDownload /> <span>Sample Excel</span>
                    </a>
                </div>

                <SampleFormat />

                <div className="sr-upload__mode">
                    <Segmented
                        id="sr-mode"
                        label="Upload mode"
                        value={mode}
                        onChange={(m) => {
                            setMode(m);
                            reset();
                        }}
                        options={[
                            { key: 'replace', label: 'Replace the list', title: 'This upload becomes the whole list for the round' },
                            { key: 'add', label: 'Add to the list', title: 'Only adds; nobody is taken off' }
                        ]}
                    />
                    <span className="sr-upload__mode-note">
                        {mode === 'replace'
                            ? 'Anyone on the current list but not in this upload is taken off.'
                            : 'Students are only added — nobody already on the list is removed.'}
                    </span>
                </div>

                <div className="sr-upload__inputs">
                    <div className="cp-field sr-paste">
                        <label htmlFor="sr-paste">
                            Paste roll numbers <small>one per line, or comma-separated — a header row is fine</small>
                        </label>
                        <textarea
                            id="sr-paste"
                            rows={6}
                            value={text}
                            disabled={Boolean(file) || busy}
                            placeholder={file ? 'Using the attached file' : 'Paste roll numbers here'}
                            onChange={(e) => {
                                setText(e.target.value);
                                reset();
                            }}
                        />
                    </div>

                    <div className="sr-or" aria-hidden="true">
                        <span>or</span>
                    </div>

                    <div className={`sr-drop${file ? ' has-file' : ''}`}>
                        <input
                            ref={fileRef}
                            id="sr-file"
                            className="cp-sr-only"
                            type="file"
                            accept=".xlsx,.csv,.txt"
                            disabled={busy}
                            onChange={(e) => {
                                setFile(e.target.files?.[0] || null);
                                reset();
                            }}
                        />
                        {file ? (
                            <div className="sr-drop__file">
                                <IconCheckCircle />
                                <span className="sr-drop__name">{file.name}</span>
                                <button
                                    type="button"
                                    className="sr-drop__clear"
                                    aria-label="Remove the attached file"
                                    onClick={() => {
                                        setFile(null);
                                        if (fileRef.current) fileRef.current.value = '';
                                        reset();
                                    }}
                                >
                                    <IconClose />
                                </button>
                            </div>
                        ) : (
                            <label htmlFor="sr-file" className="sr-drop__pick">
                                <IconUpload />
                                <span>Attach a file</span>
                                <small>.xlsx, .csv or .txt · the “Roll No” column is used if there is one</small>
                            </label>
                        )}
                    </div>
                </div>

                {error && <p className="cp-alert cp-alert--error">{error}</p>}

                {done && (
                    <p className="cp-alert cp-alert--good" role="status">
                        Saved. {roundByKey(done.round).label} for {done.year} now lists <strong>{num(done.total)}</strong> student
                        {done.total === 1 ? '' : 's'} ({num(done.added)} added{done.removed ? `, ${num(done.removed)} taken off` : ''}).
                    </p>
                )}

                {plan && <UploadPreview preview={preview} />}

                <div className="sr-upload__actions">
                    {preview && !preview.refused ? (
                        <>
                            <button type="button" className="cp-btn cp-btn--ghost" onClick={reset} disabled={busy}>
                                Cancel
                            </button>
                            <button type="button" className="cp-btn cp-btn--primary" onClick={() => send(false)} disabled={busy}>
                                {busy ? 'Saving…' : `Confirm & save ${num(plan.listAfter)} student${plan.listAfter === 1 ? '' : 's'}`}
                            </button>
                        </>
                    ) : (
                        <button type="button" className="cp-btn cp-btn--primary" onClick={() => send(true)} disabled={!hasInput || busy}>
                            {busy ? 'Checking…' : 'Preview upload'}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

function StudentList({ students, extra }) {
    return (
        <ul className="sr-list">
            {students.map((s) => (
                <li key={s.rollKey || s.rollNo}>
                    <span className="sr-list__roll">{s.rollNo}</span>
                    <span className="sr-list__name">{s.name}</span>
                    {s.branch && <span className="sr-list__branch">{s.branch}</span>}
                    {extra?.(s)}
                </li>
            ))}
        </ul>
    );
}

function UploadPreview({ preview }) {
    const { plan, parse } = preview;
    const removing = plan.toRemove || [];
    const scoredRemoving = removing.filter((s) => s.scored).length;

    return (
        <div className="sr-preview" aria-live="polite">
            <dl className="sr-preview__stats">
                <div>
                    <dt>Roll numbers read</dt>
                    <dd>{num(plan.received)}</dd>
                </div>
                <div className="is-good">
                    <dt>Adding</dt>
                    <dd>{num(plan.toAdd.length)}</dd>
                </div>
                <div>
                    <dt>Already on the list</dt>
                    <dd>{num(plan.alreadyOn)}</dd>
                </div>
                <div className={removing.length ? 'is-warn' : ''}>
                    <dt>Taken off</dt>
                    <dd>{num(removing.length)}</dd>
                </div>
                <div className={plan.notFound.length + plan.otherYear.length ? 'is-bad' : ''}>
                    <dt>Not matched</dt>
                    <dd>{num(plan.notFound.length + plan.otherYear.length)}</dd>
                </div>
                <div className="is-total">
                    <dt>List after saving</dt>
                    <dd>
                        {num(plan.listBefore)} → {num(plan.listAfter)}
                    </dd>
                </div>
            </dl>

            {parse?.column && (
                <p className="sr-preview__note">
                    Read from the “{parse.column}” column.
                    {parse.duplicates ? ` ${num(parse.duplicates)} repeated roll number(s) counted once.` : ''}
                </p>
            )}
            {!parse?.column && parse?.duplicates > 0 && (
                <p className="sr-preview__note">{num(parse.duplicates)} repeated roll number(s) counted once.</p>
            )}

            {plan.notFound.length > 0 && (
                <details className="cp-alert cp-alert--error" open={plan.notFound.length <= 10}>
                    <summary>{num(plan.notFound.length)} not on the hostel roster — skipped</summary>
                    <p className="sr-codes">{plan.notFound.join(', ')}</p>
                </details>
            )}

            {plan.otherYear.length > 0 && (
                <details className="cp-alert cp-alert--error">
                    <summary>
                        {num(plan.otherYear.length)} on the roster under a different academic year — skipped
                    </summary>
                    <StudentList students={plan.otherYear} extra={(s) => <span className="sr-list__tag">{s.academicYear}</span>} />
                </details>
            )}

            {plan.previous && plan.previous.missing.length > 0 && (
                <details className="cp-alert cp-alert--warn">
                    <summary>
                        {num(plan.previous.missing.length)} not on the {plan.previous.label} list — they will still be saved
                    </summary>
                    <StudentList students={plan.previous.missing} />
                </details>
            )}

            {removing.length > 0 && (
                <details className="cp-alert cp-alert--warn" open={removing.length <= 10}>
                    <summary>
                        {num(removing.length)} currently on this list will be taken off
                        {scoredRemoving ? ` — ${num(scoredRemoving)} already have interview scores (kept, but hidden from scoring)` : ''}
                    </summary>
                    <StudentList students={removing} />
                </details>
            )}

            {parse?.ignoredCount > 0 && (
                <details className="sr-preview__ignored">
                    <summary>{num(parse.ignoredCount)} entr{parse.ignoredCount === 1 ? 'y' : 'ies'} did not look like a roll number and were ignored</summary>
                    <p className="sr-codes">{parse.ignored.join(', ')}</p>
                </details>
            )}

            {plan.toAdd.length > 0 && (
                <details className="sr-preview__added">
                    <summary>Show the {num(plan.toAdd.length)} being added</summary>
                    <StudentList students={plan.toAdd} />
                </details>
            )}
        </div>
    );
}

// ── 2. Interview scores ─────────────────────────────────────────────────────

const fold = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function InterviewScores({ year, program, unauthorized, onScored }) {
    const [students, setStudents] = useState(null);
    const [panelists, setPanelists] = useState([]);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState(0);
    const [selected, setSelected] = useState(null);
    const listId = 'sr-search-list';

    const fetchList = useCallback(async () => {
        setError('');
        try {
            const json = await call(`/api/admin/selection/interviews?year=${encodeURIComponent(year)}&program=${encodeURIComponent(program)}`, {}, unauthorized);
            setStudents(json.students);
            setPanelists(json.panelists || []);
        } catch (e) {
            setError(e.message);
        }
    }, [year, program, unauthorized]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // Name matches on every word typed ("sai red" finds "Sai Kumar Reddy"); roll
    // matches on the folded roll number, so dashes and case don't matter.
    const matches = useMemo(() => {
        if (!students) return [];
        const q = query.trim();
        if (!q) return [];
        const words = q.toUpperCase().split(/\s+/).filter(Boolean);
        const qRoll = fold(q);
        return students
            .filter((s) => {
                const name = s.name.toUpperCase();
                return (qRoll.length >= 3 && fold(s.rollNo).includes(qRoll)) || words.every((w) => name.includes(w));
            })
            .slice(0, 12);
    }, [students, query]);

    useEffect(() => setCursor(0), [query]);

    const pick = (s) => {
        setSelected(s);
        setQuery('');
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (!matches.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setCursor((c) => (c + 1) % matches.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor((c) => (c - 1 + matches.length) % matches.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(matches[cursor]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const onSaved = (rollKey, score) => {
        setStudents((list) => list.map((s) => (s.rollKey === rollKey ? { ...s, score } : s)));
        setSelected((s) => (s && s.rollKey === rollKey ? { ...s, score } : s));
        onScored();
    };

    const scored = students ? students.filter((s) => s.score).length : 0;
    const total = students ? students.length : 0;

    return (
        <section className="sr-card" aria-labelledby="sr-iv-title">
            <div className="sr-card__head">
                <div>
                    <p className="sr-card__eyebrow">Step 3</p>
                    <h2 id="sr-iv-title" className="sr-card__title">
                        One-on-one interview scores
                    </h2>
                    <p className="sr-card__sub">
                        Search the students qualified for the interview, then give each a coding and a communication score out
                        of {MAX_STARS} stars.
                    </p>
                </div>
                {students && total > 0 && (
                    <div className="sr-progress" aria-label={`${scored} of ${total} scored`}>
                        <span className="sr-progress__text">
                            <strong>{num(scored)}</strong> / {num(total)} scored
                        </span>
                        <span className="sr-progress__bar">
                            <span style={{ width: `${(scored / total) * 100}%` }} />
                        </span>
                    </div>
                )}
            </div>

            {error && (
                <p className="cp-alert cp-alert--error">
                    {error}{' '}
                    <button type="button" className="cp-an-link" onClick={fetchList}>
                        Try again
                    </button>
                </p>
            )}

            {students && total === 0 && (
                <p className="cp-alert cp-alert--warn">
                    Nobody is on the {year} interview list yet. Upload it above — choose <strong>Interview</strong> in the round
                    lists — and the students will be searchable here.
                </p>
            )}

            {students && total > 0 && (
                <div className="sr-iv">
                    <div className="sr-search">
                        <span className="sr-search__icon" aria-hidden="true">
                            <IconSearch />
                        </span>
                        <input
                            type="search"
                            className="sr-search__input"
                            placeholder="Search by name or roll number"
                            value={query}
                            role="combobox"
                            aria-expanded={open && matches.length > 0}
                            aria-controls={listId}
                            aria-autocomplete="list"
                            aria-activedescendant={open && matches[cursor] ? `sr-opt-${matches[cursor].rollKey}` : undefined}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            onBlur={() => setTimeout(() => setOpen(false), 120)}
                            onKeyDown={onKeyDown}
                        />
                        {open && query.trim() && (
                            <ul id={listId} className="sr-search__list" role="listbox">
                                {matches.length === 0 && <li className="sr-search__empty">No one on the interview list matches “{query.trim()}”.</li>}
                                {matches.map((s, i) => (
                                    <li
                                        key={s.rollKey}
                                        id={`sr-opt-${s.rollKey}`}
                                        role="option"
                                        aria-selected={i === cursor}
                                        className={`sr-search__opt${i === cursor ? ' is-cursor' : ''}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            pick(s);
                                        }}
                                        onMouseEnter={() => setCursor(i)}
                                    >
                                        <span className="sr-search__name">{s.name}</span>
                                        <span className="sr-search__meta">
                                            {s.rollNo}
                                            {s.branch ? ` · ${s.branch}` : ''}
                                        </span>
                                        <span className={`sr-search__badge${s.score ? ' is-done' : ''}`}>
                                            {s.score ? `${s.score.coding}★ · ${s.score.communication}★` : 'Not scored'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {selected ? (
                        <ScoreForm
                            key={selected.rollKey}
                            year={year}
                            program={program}
                            student={selected}
                            panelists={panelists}
                            unauthorized={unauthorized}
                            onSaved={onSaved}
                            onClose={() => setSelected(null)}
                        />
                    ) : (
                        <p className="sr-iv__empty">Pick a student from the search to score them.</p>
                    )}
                </div>
            )}

            {!students && !error && <p className="sr-iv__empty">Loading the interview list…</p>}
        </section>
    );
}

function Stars({ label, value, onChange, disabled }) {
    const [hover, setHover] = useState(0);
    const shown = hover || value;
    const name = label.toLowerCase();

    // Arrow keys move the rating like any radio group.
    const onKeyDown = (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(Math.min(MAX_STARS, (value || 0) + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(Math.max(1, (value || 1) - 1));
        }
    };

    return (
        <div className="sr-stars">
            <span className="sr-stars__label" id={`sr-stars-${name}`}>
                {label}
            </span>
            <div
                className="sr-stars__row"
                role="radiogroup"
                aria-labelledby={`sr-stars-${name}`}
                onMouseLeave={() => setHover(0)}
                onKeyDown={onKeyDown}
            >
                {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} star${n === 1 ? '' : 's'}`}
                        tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
                        className={`sr-star${n <= shown ? ' is-lit' : ''}`}
                        disabled={disabled}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => onChange(n)}
                    >
                        <IconStar />
                    </button>
                ))}
                <span className="sr-stars__value" aria-hidden="true">
                    {shown ? `${shown} / ${MAX_STARS}` : 'Not rated'}
                </span>
            </div>
        </div>
    );
}

function ScoreForm({ year, program, student, panelists, unauthorized, onSaved, onClose }) {
    const [scores, setScores] = useState({
        coding: student.score?.coding || 0,
        communication: student.score?.communication || 0
    });
    const [remarks, setRemarks] = useState(student.score?.remarks || '');
    // Who took this interview. Pre-selected from the timetable, so for the
    // normal case — the allocated panelist is the one scoring — nobody touches
    // it. A saved name wins over the timetable: if someone covered last time,
    // re-opening the card should show who actually did it, not who was planned.
    const [scoredBy, setScoredBy] = useState(student.score?.scoredBy || student.allocation?.panelist || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [savedAt, setSavedAt] = useState(student.score?.scoredAt || null);
    const [dirty, setDirty] = useState(false);

    const complete = SCORE_FIELDS.every((f) => scores[f.key] >= 1);

    const save = async () => {
        setBusy(true);
        setError('');
        try {
            const json = await call(
                '/api/admin/selection/interviews',
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ year, program, rollKey: student.rollKey, ...scores, remarks, scoredBy })
                },
                unauthorized
            );
            setSavedAt(json.score.scoredAt);
            setDirty(false);
            onSaved(student.rollKey, json.score);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="sr-score">
            <div className="sr-score__who">
                <div>
                    <p className="sr-score__name">{student.name}</p>
                    <p className="sr-score__meta">
                        {student.rollNo}
                        {student.branch ? ` · ${student.branch}` : ''}
                        {student.gender ? ` · ${student.gender}` : ''}
                    </p>
                    {/* The slot, when this student has one. Confirms at a glance
                        that the card open is the interview actually happening. */}
                    {student.allocation && (
                        <p className="sr-score__slot">
                            {student.allocation.panel && <span className="sr-score__panel">{student.allocation.panel}</span>}
                            {student.allocation.date && <span>{formatDate(student.allocation.date)}</span>}
                            {formatSlot(student.allocation.start, student.allocation.end) && (
                                <span>{formatSlot(student.allocation.start, student.allocation.end)}</span>
                            )}
                        </p>
                    )}
                </div>
                <button type="button" className="sr-score__close" onClick={onClose} aria-label="Close this student">
                    <IconClose />
                </button>
            </div>

            <div className="sr-score__fields">
                {SCORE_FIELDS.map((f) => (
                    <Stars
                        key={f.key}
                        label={f.label}
                        value={scores[f.key]}
                        disabled={busy}
                        onChange={(v) => {
                            setScores((s) => ({ ...s, [f.key]: v }));
                            setDirty(true);
                        }}
                    />
                ))}
            </div>

            {/* Who is scoring. A <select> of the panelists already on the
                timetable, pre-selected to this student's own panelist, so the
                normal case is zero clicks and a stand-in is one. Free-text would
                give us "Rahul", "rahul" and "Rahul K" as three different people
                in the per-panelist statistics. */}
            <div className="sr-score__by">
                <label htmlFor="sr-scored-by">Scored by</label>
                <select
                    id="sr-scored-by"
                    value={scoredBy}
                    disabled={busy}
                    onChange={(e) => {
                        setScoredBy(e.target.value);
                        setDirty(true);
                    }}
                >
                    <option value="">Not recorded</option>
                    {/* A name saved earlier that is no longer on the timetable
                        would otherwise vanish from the list and silently reset
                        itself to "Not recorded" on the next save. */}
                    {(panelists.includes(scoredBy) || !scoredBy ? panelists : [scoredBy, ...panelists]).map((p) => (
                        <option key={p} value={p}>
                            {p}
                        </option>
                    ))}
                </select>
                {student.allocation?.panelist && scoredBy !== student.allocation.panelist && (
                    <span className="sr-score__by-note">Timetabled to {student.allocation.panelist}</span>
                )}
            </div>

            {/* Optional. The stars are the decision; this is the sentence behind
                it. Deliberately not required — most students will not need one,
                and a mandatory box would get filled with "ok" 200 times. */}
            <div className="sr-score__remarks">
                <div className="sr-score__remarks-head">
                    <label htmlFor="sr-remarks">
                        Remarks <span className="sr-score__optional">optional</span>
                    </label>
                    <span className={`sr-score__count${remarks.length > MAX_REMARKS - 100 ? ' is-near' : ''}`}>
                        {remarks.length} / {MAX_REMARKS}
                    </span>
                </div>
                <textarea
                    id="sr-remarks"
                    rows={3}
                    maxLength={MAX_REMARKS}
                    value={remarks}
                    disabled={busy}
                    placeholder="Anything the stars do not say — strengths, concerns, suspected malpractice…"
                    onChange={(e) => {
                        setRemarks(e.target.value);
                        setDirty(true);
                    }}
                />
            </div>

            {error && <p className="cp-alert cp-alert--error">{error}</p>}

            <div className="sr-score__foot">
                <span className="sr-score__status" role="status">
                    {dirty ? 'Unsaved changes' : savedAt ? `Saved ${formatDateTime(savedAt)}` : 'Not scored yet'}
                </span>
                <button type="button" className="cp-btn cp-btn--primary" onClick={save} disabled={!complete || busy || (!dirty && Boolean(savedAt))}>
                    {busy ? 'Saving…' : student.score ? 'Update score' : 'Save score'}
                </button>
            </div>
        </div>
    );
}

// ── The student list behind a round tile ────────────────────────────────────

const GENDER_SHORT = { Male: 'M', Female: 'F' };

function RoundStudents({ year, program, round, version, unauthorized }) {
    const def = roundByKey(round);
    const isInterview = round === INTERVIEW_ROUND;
    const [students, setStudents] = useState(null);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [branch, setBranch] = useState('');

    const fetchList = useCallback(async () => {
        setError('');
        try {
            const q = `year=${encodeURIComponent(year)}&program=${encodeURIComponent(program)}&round=${encodeURIComponent(round)}`;
            const json = await call(`/api/admin/selection/rounds?${q}`, {}, unauthorized);
            setStudents(json.students);
        } catch (e) {
            setError(e.message);
        }
    }, [year, program, round, unauthorized]);

    useEffect(() => {
        fetchList();
    }, [fetchList, version]);

    // Branch chips, biggest first — a quick read of who made the list.
    const branches = useMemo(() => {
        const m = new Map();
        for (const s of students || []) {
            const b = s.branch || 'Unknown';
            m.set(b, (m.get(b) || 0) + 1);
        }
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    }, [students]);

    const genders = useMemo(() => {
        const g = { Male: 0, Female: 0 };
        for (const s of students || []) if (g[s.gender] !== undefined) g[s.gender]++;
        return g;
    }, [students]);

    const shown = useMemo(() => {
        if (!students) return [];
        const words = query.trim().toUpperCase().split(/\s+/).filter(Boolean);
        const qRoll = fold(query);
        return students.filter((s) => {
            if (branch && (s.branch || 'Unknown') !== branch) return false;
            if (!words.length) return true;
            const name = s.name.toUpperCase();
            return (qRoll.length >= 3 && fold(s.rollNo).includes(qRoll)) || words.every((w) => name.includes(w));
        });
    }, [students, query, branch]);

    const total = students?.length || 0;

    return (
        <div className="sr-roster" aria-live="polite">
            <div className="sr-roster__head">
                <div>
                    <h3 className="sr-roster__title">
                        {def.short} list <span className="sr-roster__count">{students ? num(total) : '…'}</span>
                    </h3>
                    {students && total > 0 && (
                        <p className="sr-roster__sub">
                            {num(genders.Male)} boys · {num(genders.Female)} girls
                            {total - genders.Male - genders.Female > 0 ? ` · ${num(total - genders.Male - genders.Female)} unspecified` : ''}
                        </p>
                    )}
                </div>
                {students && total > 0 && (
                    <div className="sr-roster__tools">
                        <div className="sr-search sr-roster__search">
                            <span className="sr-search__icon" aria-hidden="true">
                                <IconSearch />
                            </span>
                            <input
                                type="search"
                                className="sr-search__input"
                                placeholder="Filter by name or roll number"
                                aria-label={`Filter the ${def.short} list`}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        {/* Always the whole list — the sheet's own autofilter replaces the filters here. */}
                        <a
                            className="cp-btn cp-btn--ghost cp-btn--compact sr-export"
                            href={`/api/admin/selection/export?year=${encodeURIComponent(year)}&program=${encodeURIComponent(program)}&round=${encodeURIComponent(round)}`}
                            download
                        >
                            <IconDownload /> <span>Export Excel</span>
                        </a>
                    </div>
                )}
            </div>

            {error && (
                <p className="cp-alert cp-alert--error">
                    {error}{' '}
                    <button type="button" className="cp-an-link" onClick={fetchList}>
                        Try again
                    </button>
                </p>
            )}

            {!students && !error && <p className="sr-roster__empty">Loading the {def.short} list…</p>}

            {students && total === 0 && (
                <p className="sr-roster__empty">
                    No {def.short} list for {year} yet. Upload it below — the sample Excel shows the format.
                </p>
            )}

            {students && total > 0 && (
                <>
                    {branches.length > 1 && (
                        <div className="sr-chips" role="group" aria-label="Filter by branch">
                            <button type="button" className={`sr-chip${!branch ? ' is-on' : ''}`} aria-pressed={!branch} onClick={() => setBranch('')}>
                                All <span>{num(total)}</span>
                            </button>
                            {branches.map(([b, n]) => (
                                <button
                                    key={b}
                                    type="button"
                                    className={`sr-chip${branch === b ? ' is-on' : ''}`}
                                    aria-pressed={branch === b}
                                    onClick={() => setBranch(branch === b ? '' : b)}
                                >
                                    {b} <span>{num(n)}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={`sr-table${isInterview ? ' sr-table--iv' : ''}`} role="table" aria-label={`${def.label} — students`}>
                        <div className="sr-table__row sr-table__row--head" role="row">
                            <span role="columnheader">#</span>
                            <span role="columnheader">Roll No</span>
                            <span role="columnheader">Name</span>
                            <span role="columnheader">Branch</span>
                            <span role="columnheader">Gender</span>
                            {isInterview && <span role="columnheader">Interview</span>}
                            <span role="columnheader">Added</span>
                        </div>
                        {shown.map((s, i) => (
                            <div className="sr-table__row" role="row" key={s.rollKey}>
                                <span role="cell" className="sr-table__no">{i + 1}</span>
                                <span role="cell" className="sr-table__roll">{s.rollNo}</span>
                                <span role="cell" className="sr-table__name">{s.name}</span>
                                <span role="cell" className="sr-table__branch">{s.branch || '—'}</span>
                                <span role="cell" className="sr-table__gender" title={s.gender || 'Not recorded'}>
                                    {GENDER_SHORT[s.gender] || '—'}
                                </span>
                                {isInterview && (
                                    <span role="cell" className={`sr-table__score${s.score ? ' is-done' : ''}`}>
                                        {s.score ? `Coding ${s.score.coding}★ · Comm ${s.score.communication}★` : 'Not scored'}
                                        {/* A remark is shown as a marker rather than inline text: the
                                            cell is one line in a 267-row table, and a paragraph would
                                            wreck the grid. The full text is in the title and in the
                                            export. */}
                                        {s.score?.remarks && (
                                            <span className="sr-table__remark" title={s.score.remarks}>
                                                “{s.score.remarks}”
                                            </span>
                                        )}
                                    </span>
                                )}
                                <span role="cell" className="sr-table__when">{s.addedAt ? formatDateTime(s.addedAt) : '—'}</span>
                            </div>
                        ))}
                        {shown.length === 0 && <p className="sr-roster__empty">Nobody on this list matches that filter.</p>}
                    </div>
                    {shown.length !== total && (
                        <p className="sr-roster__foot">
                            Showing {num(shown.length)} of {num(total)}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

// What the upload expects, drawn as a miniature sheet so nobody has to open the
// sample file to see it. Mirrors the template route's columns.
function SampleFormat() {
    return (
        <details className="sr-format">
            <summary>Expected file format</summary>
            <div className="sr-format__body">
                <div className="sr-format__sheet" role="table" aria-label="Sample list format">
                    <div className="sr-format__row sr-format__row--head" role="row">
                        <span role="columnheader">S.No</span>
                        <span role="columnheader" className="is-key">Roll No</span>
                        <span role="columnheader">Student Name</span>
                        <span role="columnheader">Branch</span>
                    </div>
                    {[
                        ['1', 'SAMPLE0001', 'Sample Student One', 'CSE'],
                        ['2', 'SAMPLE0002', 'Sample Student Two', 'ECE']
                    ].map((r) => (
                        <div className="sr-format__row" role="row" key={r[0]}>
                            {r.map((c, i) => (
                                <span role="cell" key={i} className={i === 1 ? 'is-key' : ''}>
                                    {c}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
                <ul className="sr-format__notes">
                    <li>
                        Only <strong>Roll No</strong> is read. The other columns are for your reference.
                    </li>
                    <li>“Roll Number”, “Regd No”, “Reg No” or “Hall Ticket No” also work as the header.</li>
                    <li>Keep the list on the first sheet; .xlsx or .csv.</li>
                </ul>
            </div>
        </details>
    );
}
