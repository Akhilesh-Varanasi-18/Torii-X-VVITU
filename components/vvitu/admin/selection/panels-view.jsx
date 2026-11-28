'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Segmented from '../../dashboard/coding/segmented';
import { IconSearch, IconDownload, IconRefresh, IconUpload, IconAlert } from '../../dashboard/dashboard-icons';
import { IconClock, IconChevronLeft, IconChevronRight } from '../../dashboard/coding/coding-icons';
import { formatDateTime } from '../../dashboard/coding/coding-theme';
import { MAX_STARS } from '../../../../lib/selection-results';
import {
    formatDate,
    formatSlot,
    PANEL_STATUSES,
    PANEL_SORTS,
    PAGE_SIZES,
    DEFAULT_PAGE_SIZE,
    NO_PANEL
} from '../../../../lib/interview-panels';

// The monitoring half of the selection page: what actually happened in the
// one-on-one interviews.
//
// Deliberately a separate component from the scoring card above it, and
// lazy-loaded. The two have opposite jobs: the Rounds card is a TASK surface — one
// student, keyboard-driven, as little on screen as possible for a panelist
// mid-interview — while this is a MONITORING surface that wants every row at
// once. Merging them would make the scoring card hostile to the person using
// it and push one file past two thousand lines.
//
// Everything below is filtered in the browser from a single request. A cohort
// that reaches interview is a couple of hundred students, so re-fetching on
// each filter change would be slower and would let the tiles drift out of step
// with the table under them.

const num = (v) => Number(v || 0).toLocaleString('en-IN');
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const fold = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function call(url, options, unauthorized) {
    const res = await fetch(url, { credentials: 'same-origin', ...options });
    if (res.status === 401) {
        unauthorized?.();
        throw new Error('Your session expired. Sign in again.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
    return json;
}

const SIZE_OPTIONS = PAGE_SIZES.map((n) => ({ key: n, label: String(n) }));

export default function PanelsView({ year, program, unauthorized, version = 0, embedded = false }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const [query, setQuery] = useState('');
    const [panel, setPanel] = useState('');
    const [day, setDay] = useState('');
    const [status, setStatus] = useState('all');
    const [branch, setBranch] = useState('');
    const [sort, setSort] = useState('slot');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    // Typing re-queries the server, so the search box is debounced; everything
    // else is a click and fires immediately.
    const [debouncedQuery, setDebouncedQuery] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    // Picking a panel or a day re-filters the table, and the table is below the
    // fold on a laptop. Without this the thing that changed is off-screen and
    // the click looks like it did nothing. Honours prefers-reduced-motion,
    // where an instant jump is the correct behaviour rather than no jump.
    const tableRef = useRef(null);
    const revealTable = useCallback(() => {
        const el = tableRef.current;
        if (!el) return;
        const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }, []);

    const load = useCallback(async () => {
        setBusy(true);
        setError('');
        try {
            const qs = new URLSearchParams({ year, program, page: String(page), limit: String(pageSize), sort, status });
            if (debouncedQuery) qs.set('q', debouncedQuery);
            if (panel) qs.set('panel', panel);
            if (day) qs.set('day', day);
            if (branch) qs.set('branch', branch);
            const json = await call(`/api/admin/selection/panels?${qs.toString()}`, {}, unauthorized);
            setData(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }, [year, program, unauthorized, page, pageSize, sort, status, debouncedQuery, panel, day, branch]);

    useEffect(() => {
        load();
    }, [load, version]);

    // Any change to WHAT is listed starts again at page one — staying on page 9
    // of a list that now has two pages would show nothing. Page size and sort
    // are included: they reshuffle the rows, so the old page number is
    // meaningless either way.
    useEffect(() => {
        setPage(1);
    }, [debouncedQuery, panel, day, branch, status, sort, pageSize]);

    // One page of rows, already filtered and sorted by the server.
    const shown = useMemo(() => data?.students || [], [data]);
    // The branch chips come from the whole year, not from this page, so they do
    // not vanish as soon as a filter narrows the list.
    const branches = useMemo(() => (data?.branches || []).map((b) => [b.branch, b.count]), [data]);

    const filtered = panel || day || branch || status !== 'all' || query.trim();
    const clearAll = () => {
        setQuery('');
        setPanel('');
        setDay('');
        setBranch('');
        setStatus('all');
        setPage(1);
    };

    const totals = data?.totals;
    const exportHref = `/api/admin/selection/export?year=${encodeURIComponent(year)}&program=${encodeURIComponent(program)}&view=panels`;

    // Embedded, this IS the Interview tab's list inside the Rounds card, so it
    // drops the card shell and its own heading and keeps only its controls —
    // the surrounding card already says what it is.
    const Shell = embedded ? 'div' : 'section';

    return (
        <Shell className={embedded ? 'ip ip--embedded' : 'sr-card ip'} aria-labelledby={embedded ? undefined : 'ip-title'}>
            <div className={embedded ? 'ip-head' : 'sr-card__head'}>
                <div>
                    {embedded ? (
                        <p className="ip-head__title">Panels &amp; progress</p>
                    ) : (
                        <h2 id="ip-title" className="sr-card__title">
                            Interview panels &amp; progress
                        </h2>
                    )}
                    <p className={embedded ? 'ip-head__sub' : 'sr-card__sub'}>
                        Who sits with which panel and when, how far each panel has got, and who is still to be scored.
                    </p>
                </div>
                <div className="ip-head__actions">
                    <button type="button" className="cp-btn cp-btn--ghost cp-btn--compact" onClick={load} disabled={busy}>
                        <IconRefresh /> <span>{busy ? 'Loading…' : 'Refresh'}</span>
                    </button>
                    <a className="cp-btn cp-btn--ghost cp-btn--compact" href={exportHref} download>
                        <IconDownload /> <span>Export Excel</span>
                    </a>
                </div>
            </div>

            {error && (
                <p className="cp-alert cp-alert--error">
                    {error}{' '}
                    <button type="button" className="cp-an-link" onClick={load}>
                        Try again
                    </button>
                </p>
            )}

            {!data && !error && <p className="sr-roster__empty">Loading the panel view…</p>}

            {data && totals.scheduled === 0 && totals.onList === 0 && (
                <p className="sr-roster__empty">
                    Nothing to show for {year} yet — upload the interview list for this round, then the timetable below.
                </p>
            )}

            {data && (totals.scheduled > 0 || totals.onList > 0) && (
                <>
                    <SummaryStrip totals={totals} />

                    {totals.unscheduled > 0 && (
                        <p className="ip-note">
                            <IconAlert />
                            <span>
                                <strong>{num(totals.unscheduled)}</strong> student{totals.unscheduled === 1 ? ' is' : 's are'} on the
                                interview list with no slot on the timetable.{' '}
                                <button type="button" className="cp-an-link" onClick={() => { clearAll(); setPanel('__none'); }}>
                                    Show them
                                </button>
                            </span>
                        </p>
                    )}
                    {totals.orphanSlot > 0 && (
                        <p className="ip-note ip-note--warn">
                            <IconAlert />
                            <span>
                                <strong>{num(totals.orphanSlot)}</strong> timetabled student
                                {totals.orphanSlot === 1 ? ' is' : 's are'} not on the interview list — they cannot be scored until
                                they are added to it.
                            </span>
                        </p>
                    )}

                    <PanelStrip
                        panels={data.panels}
                        active={panel}
                        onPick={(p) => {
                            setPanel(panel === p ? '' : p);
                            revealTable();
                        }}
                    />

                    {data.days.length > 1 && (
                        <div className="ip-days" role="group" aria-label="Filter by day">
                            <button type="button" className={`sr-chip${!day ? ' is-on' : ''}`} aria-pressed={!day} onClick={() => setDay('')}>
                                All days <span>{num(totals.scheduled)}</span>
                            </button>
                            {data.days.map((d) => (
                                <button
                                    key={d.date}
                                    type="button"
                                    className={`sr-chip${day === d.date ? ' is-on' : ''}`}
                                    aria-pressed={day === d.date}
                                    onClick={() => {
                                        setDay(day === d.date ? '' : d.date);
                                        revealTable();
                                    }}
                                    title={`${d.completed} of ${d.assigned} scored`}
                                >
                                    {formatDate(d.date)} <span>{num(d.assigned)}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <Filters
                        query={query}
                        onQuery={setQuery}
                        panel={panel}
                        onPanel={setPanel}
                        panels={data.panels}
                        status={status}
                        onStatus={(v) => {
                            setStatus(v);
                            revealTable();
                        }}
                        sort={sort}
                        onSort={setSort}
                        counts={{
                            all: data.rosterTotal,
                            completed: totals.completed,
                            pending: data.rosterTotal - totals.completed
                        }}
                        pageSize={pageSize}
                        onPageSize={setPageSize}
                    />

                    {branches.length > 1 && (
                        <div className="sr-chips" role="group" aria-label="Filter by branch">
                            <button type="button" className={`sr-chip${!branch ? ' is-on' : ''}`} aria-pressed={!branch} onClick={() => setBranch('')}>
                                All <span>{num(data.rosterTotal)}</span>
                            </button>
                            {branches.map(([b, n]) => (
                                <button
                                    key={b}
                                    type="button"
                                    className={`sr-chip${branch === b ? ' is-on' : ''}`}
                                    aria-pressed={branch === b}
                                    onClick={() => {
                                        setBranch(branch === b ? '' : b);
                                        revealTable();
                                    }}
                                >
                                    {b} <span>{num(n)}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="ip-resultbar" ref={tableRef}>
                        <span aria-live="polite">
                            {data.total === 0 ? (
                                'No student matches those filters'
                            ) : (
                                <>
                                    Showing{' '}
                                    <strong>
                                        {num((data.page - 1) * pageSize + 1)}–{num((data.page - 1) * pageSize + shown.length)}
                                    </strong>{' '}
                                    of {num(data.total)}
                                    {data.total !== data.rosterTotal ? ` (filtered from ${num(data.rosterTotal)})` : ''}
                                </>
                            )}
                        </span>
                        {filtered && (
                            <button type="button" className="cp-an-link" onClick={clearAll}>
                                Clear filters
                            </button>
                        )}
                    </div>

                    <ScheduleTable rows={shown} />

                    <Pager page={data.page} pages={data.pages} busy={busy} onPage={setPage} />

                    {data.scoredBy.length > 0 && (
                        <div className="ip-by">
                            <h3 className="ip-by__title">Scores recorded by</h3>
                            <ul className="ip-by__list">
                                {data.scoredBy.map((p) => (
                                    <li key={p.name}>
                                        <span className="ip-by__name">{p.name}</span>
                                        <span className="ip-by__count">{num(p.count)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <AllocationUpload year={year} program={program} unauthorized={unauthorized} onCommitted={load} />
                </>
            )}
        </Shell>
    );
}

// ── Headline tiles ──────────────────────────────────────────────────────────

function SummaryStrip({ totals }) {
    const done = pct(totals.completed, totals.scheduled);
    const cells = [
        { key: 'sched', label: 'Scheduled', value: num(totals.scheduled), hint: `${num(totals.onList)} on the list` },
        { key: 'done', label: 'Completed', value: num(totals.completed), hint: `${done}% of scheduled`, tone: 'done' },
        { key: 'pend', label: 'Pending', value: num(totals.pending), hint: 'not yet scored', tone: totals.pending ? 'pending' : null },
        {
            key: 'avg',
            label: 'Average total',
            value: totals.avgTotal === null ? '—' : String(totals.avgTotal),
            hint:
                totals.avgTotal === null
                    ? 'no scores yet'
                    : `of ${MAX_STARS * 2} · C ${totals.avgCoding} · Comm ${totals.avgCommunication}`
        }
    ];
    return (
        <div className="ip-stats">
            {cells.map((c) => (
                <div key={c.key} className={`ip-stat${c.tone ? ` is-${c.tone}` : ''}`}>
                    <p className="ip-stat__label">{c.label}</p>
                    <p className="ip-stat__value">{c.value}</p>
                    <p className="ip-stat__hint">{c.hint}</p>
                </div>
            ))}
            <div className="ip-stats__rule" role="img" aria-label={`${done}% of scheduled interviews scored`}>
                <span style={{ width: `${done}%` }} />
            </div>
        </div>
    );
}

// ── Panel strip ─────────────────────────────────────────────────────────────

function PanelStrip({ panels, active, onPick }) {
    if (!panels.length) return null;
    return (
        <div className="ip-panels" role="group" aria-label="Panels">
            {panels.map((p) => {
                const done = pct(p.completed, p.assigned);
                const on = active === p.panel;
                // The days are the one detail that does not earn a line of its
                // own on a card this short, so they ride in the tooltip.
                return (
                    <button
                        key={p.panel}
                        type="button"
                        className={`ip-panel${on ? ' is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => onPick(p.panel)}
                        title={`${p.panel}${p.panelists.length ? ' · ' + p.panelists.join(', ') : ''}\n${
                            p.dates.length ? p.dates.map((d) => formatDate(d)).join(', ') : 'No dates'
                        }`}
                    >
                        <span className="ip-panel__head">
                            <span className="ip-panel__name">{p.panel}</span>
                            <span className="ip-panel__pct">{done}%</span>
                        </span>
                        <span className={`ip-panel__who${p.panelists.length ? '' : ' is-none'}`}>
                            {p.panelists.join(', ') || 'No panelist named'}
                        </span>
                        <span className="ip-panel__bar" aria-hidden="true">
                            <span style={{ width: `${done}%` }} />
                        </span>
                        <span className="ip-panel__nums">
                            <span>
                                <strong>{num(p.completed)}</strong>/{num(p.assigned)}
                            </span>
                            <span className={p.pending ? 'is-pending' : ''}>
                                <strong>{num(p.pending)}</strong> left
                            </span>
                            <span>{p.avgTotal === null ? '—' : `avg ${p.avgTotal}`}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Filters ─────────────────────────────────────────────────────────────────

function Filters({ query, onQuery, panel, onPanel, panels, status, onStatus, sort, onSort, counts, pageSize, onPageSize }) {
    return (
        <div className="cp-filters ip-filters" role="search">
            <label className="cp-filters__search">
                <span className="cp-sr-only">Search students</span>
                <IconSearch aria-hidden="true" />
                <input
                    type="search"
                    placeholder="Search by name or roll number"
                    value={query}
                    onChange={(e) => onQuery(e.target.value)}
                />
            </label>

            <label className="cp-filters__select">
                <span className="cp-sr-only">Panel</span>
                <select value={panel} onChange={(e) => onPanel(e.target.value)}>
                    <option value="">All panels</option>
                    {panels.map((p) => (
                        <option key={p.panel} value={p.panel}>
                            {p.panel}
                            {p.panelists.length ? ` — ${p.panelists.join(', ')}` : ''}
                        </option>
                    ))}
                    <option value={NO_PANEL}>No slot yet</option>
                </select>
            </label>

            <label className="cp-filters__select">
                <span className="cp-sr-only">Sort by</span>
                <select value={sort} onChange={(e) => onSort(e.target.value)}>
                    {PANEL_SORTS.map((s) => (
                        <option key={s.key} value={s.key}>
                            Sort: {s.label}
                        </option>
                    ))}
                </select>
            </label>

            <Segmented
                id="ip-status"
                label="Status"
                size="sm"
                value={status}
                onChange={onStatus}
                options={PANEL_STATUSES.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] }))}
            />

            <div className="ip-size">
                <Segmented id="ip-size" size="sm" label="Entries per page" value={pageSize} onChange={onPageSize} options={SIZE_OPTIONS} />
                <span className="ip-size__label">per page</span>
            </div>
        </div>
    );
}


// First / previous / next / last, the same shape as the coding-profiles
// directory's pager. First and last matter on this table specifically: the
// interview list runs to a couple of hundred rows and "who is at the end of
// Wednesday" is a question people actually ask.
function Pager({ page, pages, busy, onPage }) {
    if (pages <= 1) return null;
    const go = (n) => onPage(Math.min(Math.max(1, n), pages));
    return (
        <nav className="ip-pager" aria-label="Schedule pages">
            <button type="button" className="ip-pager__btn" onClick={() => go(1)} disabled={page <= 1 || busy} aria-label="First page">
                <IconChevronLeft />
                <IconChevronLeft />
            </button>
            <button type="button" className="ip-pager__btn" onClick={() => go(page - 1)} disabled={page <= 1 || busy} aria-label="Previous page">
                <IconChevronLeft />
            </button>
            <span className="ip-pager__num" aria-live="polite">
                Page <strong>{page}</strong> of {pages}
            </span>
            <button type="button" className="ip-pager__btn" onClick={() => go(page + 1)} disabled={page >= pages || busy} aria-label="Next page">
                <IconChevronRight />
            </button>
            <button type="button" className="ip-pager__btn" onClick={() => go(pages)} disabled={page >= pages || busy} aria-label="Last page">
                <IconChevronRight />
                <IconChevronRight />
            </button>
        </nav>
    );
}

// ── The table ───────────────────────────────────────────────────────────────

const GENDER_SHORT = { Male: 'M', Female: 'F' };

function ScheduleTable({ rows }) {
    // Which remarks are shown in full. A remark is two lines in the grid and
    // the rest is one click away: panels write a sentence or a paragraph, and
    // letting every row size itself would turn the table into a wall of text
    // that cannot be scanned.
    const [open, setOpen] = useState(() => new Set());
    const toggle = (key) =>
        setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    if (!rows.length) return <p className="sr-roster__empty">No student matches those filters.</p>;
    return (
        <div className="ip-table" role="table" aria-label="Interview schedule">
            <div className="ip-table__row ip-table__row--head" role="row">
                <span role="columnheader">#</span>
                <span role="columnheader">Roll No</span>
                <span role="columnheader">Name</span>
                <span role="columnheader">Branch</span>
                <span role="columnheader">Panel</span>
                <span role="columnheader">When</span>
                <span role="columnheader">Score</span>
                <span role="columnheader">Scored by</span>
                <span role="columnheader">Remarks</span>
            </div>
            {rows.map((s, i) => (
                <div className={`ip-table__row${s.score ? '' : ' is-pending'}`} role="row" key={s.rollKey}>
                    <span role="cell" className="ip-table__no">
                        {i + 1}
                    </span>
                    <span role="cell" className="ip-table__roll">
                        {s.rollNo}
                    </span>
                    <span role="cell" className="ip-table__name">
                        {s.name}
                        {!s.onList && <em className="ip-tag ip-tag--warn">not on list</em>}
                    </span>
                    <span role="cell" className="ip-table__branch">
                        {s.branch || '—'}
                        <i className="ip-table__gender" title={s.gender || 'Not recorded'}>
                            {GENDER_SHORT[s.gender] || ''}
                        </i>
                    </span>
                    <span role="cell" className="ip-table__panel">
                        {s.allocation?.panel ? (
                            <>
                                <strong>{s.allocation.panel}</strong>
                                {s.allocation.panelist && <small>{s.allocation.panelist}</small>}
                            </>
                        ) : (
                            <em className="ip-tag">no slot</em>
                        )}
                    </span>
                    <span role="cell" className="ip-table__when">
                        {s.allocation?.date ? (
                            <>
                                <strong>{formatDate(s.allocation.date)}</strong>
                                {formatSlot(s.allocation.start, s.allocation.end) && (
                                    <small>
                                        <IconClock /> {formatSlot(s.allocation.start, s.allocation.end)}
                                    </small>
                                )}
                            </>
                        ) : (
                            '—'
                        )}
                    </span>
                    <span role="cell" className="ip-table__score">
                        {s.score ? (
                            <>
                                <strong className="ip-score__total">
                                    {s.score.total}
                                    <i>/{MAX_STARS * 2}</i>
                                </strong>
                                <small>
                                    C {s.score.coding}★ · Comm {s.score.communication}★
                                </small>
                            </>
                        ) : (
                            <em className="ip-tag ip-tag--pending">Pending</em>
                        )}
                    </span>
                    <span role="cell" className="ip-table__by">
                        {s.score ? (
                            <>
                                {s.score.scoredBy || <em className="ip-tag">not recorded</em>}
                                {s.score.scoredAt && <small>{formatDateTime(s.score.scoredAt)}</small>}
                            </>
                        ) : (
                            '—'
                        )}
                    </span>
                    <span role="cell" className="ip-table__remarks">
                        {s.score?.remarks ? (
                            <button
                                type="button"
                                className={`ip-remark${open.has(s.rollKey) ? ' is-open' : ''}`}
                                aria-expanded={open.has(s.rollKey)}
                                title={open.has(s.rollKey) ? 'Collapse' : s.score.remarks}
                                onClick={() => toggle(s.rollKey)}
                            >
                                {s.score.remarks}
                            </button>
                        ) : (
                            <em className="ip-table__noremark">{s.score ? 'No remarks' : '—'}</em>
                        )}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── Timetable upload ────────────────────────────────────────────────────────

function AllocationUpload({ year, program, unauthorized, onCommitted }) {
    const [mode, setMode] = useState('replace');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');

    const post = async (dry) => {
        setBusy(true);
        setError('');
        setDone('');
        try {
            const body = new FormData();
            body.append('year', year);
            body.append('program', program);
            body.append('mode', mode);
            body.append('file', file);
            const json = await call(`/api/admin/selection/allocation${dry ? '?dryRun=1' : ''}`, { method: 'POST', body }, unauthorized);
            if (dry) {
                setPreview(json);
            } else {
                setPreview(null);
                setFile(null);
                setDone(`Saved — ${num(json.result.written)} slot(s) written, ${num(json.result.cleared)} cleared. Timetable now holds ${num(json.result.total)}.`);
                onCommitted?.();
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <details className="ip-upload">
            <summary>
                <IconUpload /> <span>Upload the interview timetable</span>
            </summary>
            <div className="ip-upload__body">
                <p className="ip-upload__hint">
                    One row per student: <strong>Roll No</strong>, Panel, Panelist, Date, Start/End time. Scores already recorded are
                    never touched.{' '}
                    <a href="/api/admin/selection/allocation/template" download>
                        Download the sample sheet
                    </a>
                    .
                </p>

                <Segmented
                    id="ip-upload-mode"
                    label="Upload mode"
                    size="sm"
                    value={mode}
                    onChange={(v) => {
                        setMode(v);
                        setPreview(null);
                    }}
                    options={[
                        { key: 'replace', label: 'Replace the timetable' },
                        { key: 'add', label: 'Add / update only' }
                    ]}
                />
                <p className="ip-upload__mode">
                    {mode === 'replace'
                        ? 'Anyone with a slot who is not in this sheet loses their slot.'
                        : 'Only the rows in this sheet are written. Nobody loses a slot.'}
                </p>

                <label className="ip-upload__file">
                    <input
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={(e) => {
                            setFile(e.target.files?.[0] || null);
                            setPreview(null);
                            setDone('');
                        }}
                    />
                </label>

                {error && <p className="cp-alert cp-alert--error">{error}</p>}
                {done && <p className="cp-alert cp-alert--success">{done}</p>}

                {preview && <AllocationPreview preview={preview} />}

                <div className="ip-upload__foot">
                    <button type="button" className="cp-btn cp-btn--ghost" disabled={!file || busy} onClick={() => post(true)}>
                        {busy && !preview ? 'Reading…' : 'Preview'}
                    </button>
                    <button type="button" className="cp-btn cp-btn--primary" disabled={!file || !preview || busy} onClick={() => post(false)}>
                        {busy && preview ? 'Saving…' : 'Commit timetable'}
                    </button>
                </div>
            </div>
        </details>
    );
}

function AllocationPreview({ preview }) {
    const { plan, parse } = preview;
    const stat = (label, value, tone) =>
        value ? (
            <span className={`ip-pv__stat${tone ? ` is-${tone}` : ''}`} key={label}>
                <strong>{num(value)}</strong> {label}
            </span>
        ) : null;

    return (
        <div className="ip-pv">
            <div className="ip-pv__stats">
                {stat('rows read', plan.received)}
                {stat('new slots', plan.added, 'good')}
                {stat('slots changed', plan.updated)}
                {stat('slots cleared', plan.toClear.length, 'warn')}
                {stat('not on the roster', plan.notFound.length, 'warn')}
                {stat('on another year', plan.otherYear.length, 'warn')}
                {stat('duplicate rows skipped', parse.duplicates)}
            </div>
            <p className="ip-pv__after">
                The timetable goes from <strong>{num(plan.listBefore)}</strong> to <strong>{num(plan.listAfter)}</strong> scheduled
                students.
            </p>

            {plan.panels.length > 0 && (
                <div className="ip-pv__panels">
                    {plan.panels.map((p) => (
                        <span key={p.panel}>
                            <strong>{p.panel}</strong> {num(p.count)}
                            {p.panelists.length ? ` · ${p.panelists.join(', ')}` : ''}
                        </span>
                    ))}
                </div>
            )}

            {(plan.missingPanel > 0 || plan.missingDate > 0 || plan.missingTime > 0) && (
                <p className="ip-pv__warn">
                    Incomplete rows: {plan.missingPanel} without a panel, {plan.missingDate} without a date, {plan.missingTime} without
                    a time. They will still be saved — the blanks simply show as “no slot”.
                </p>
            )}

            {plan.notOnList.length > 0 && (
                <p className="ip-pv__warn">
                    {num(plan.notOnList.length)} scheduled student{plan.notOnList.length === 1 ? ' is' : 's are'} not on the interview
                    list, so they cannot be scored yet: {plan.notOnList.slice(0, 6).map((s) => s.rollNo).join(', ')}
                    {plan.notOnList.length > 6 ? ` and ${plan.notOnList.length - 6} more` : ''}.
                </p>
            )}

            {plan.toClear.some((s) => s.scored) && (
                <p className="ip-pv__warn ip-pv__warn--strong">
                    {num(plan.toClear.filter((s) => s.scored).length)} of the students losing their slot already have a score. Their
                    stars are kept, but they will drop out of the panel figures.
                </p>
            )}

            {parse.warnings.length > 0 && (
                <details className="ip-pv__more">
                    <summary>{num(parse.warningCount)} row warning(s)</summary>
                    <ul>
                        {parse.warnings.map((w) => (
                            <li key={w}>{w}</li>
                        ))}
                    </ul>
                </details>
            )}

            {plan.notFound.length > 0 && (
                <details className="ip-pv__more">
                    <summary>{num(plan.notFound.length)} roll number(s) not on the roster</summary>
                    <p>{plan.notFound.slice(0, 60).join(', ')}</p>
                </details>
            )}
        </div>
    );
}
