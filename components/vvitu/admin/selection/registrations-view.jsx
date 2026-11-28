'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Segmented from '../../dashboard/coding/segmented';
import { IconSearch, IconDownload, IconRefresh, IconMail, IconPhone } from '../../dashboard/dashboard-icons';
import { IconChevronLeft, IconChevronRight } from '../../dashboard/coding/coding-icons';
import { formatDateTime } from '../../dashboard/coding/coding-theme';
import {
    PAGE_SIZES,
    BRANCH_FILTERS,
    branchShort,
    GENDERS,
    ADMISSION_TYPES,
    YES_NO,
    REG_SORTS,
    RANGES
} from '../../../../lib/registrations-directory';

// The first tab of the selection page: the register — every student
// who signed up for this intake, with everything the form collected.
//
// Same shape as the interview schedule on purpose: one page of rows
// from the server, a page-size control beside the filters, a first/prev/
// next/last pager at the foot. Somebody who has used one table here already
// knows this one.
//
// The filters are the request, not a client-side sieve. The collection is
// 1,100+ documents and grows every intake, so choosing "10 per page" has to
// cost ten rows of work rather than a thousand — and the Excel button sends
// the same parameters, so the sheet is always the rows on screen.

const num = (v) => Number(v || 0).toLocaleString('en-IN');
const SIZE_OPTIONS = PAGE_SIZES.map((n) => ({ key: n, label: String(n) }));
// The register opens on ten rows rather than the shared default of fifty: it is
// the first thing on the page and over a thousand rows long, so the cheapest
// possible first paint matters more here than seeing a long list at once.
const DEFAULT_ENTRIES = 10;
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

async function call(url, unauthorized) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.status === 401) {
        unauthorized?.();
        throw new Error('Your session expired. Sign in again.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
    return json;
}

export default function RegistrationsView({ unauthorized, programCode = 'AIR-300' }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const [query, setQuery] = useState('');
    const [branch, setBranch] = useState('');
    const [gender, setGender] = useState('');
    const [admission, setAdmission] = useState('');
    const [laptop, setLaptop] = useState('');
    const [range, setRange] = useState('all');
    const [sort, setSort] = useState('recent');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_ENTRIES);

    // Typing re-queries the server, so the box is debounced; every other
    // control is a click and fires at once.
    const [debounced, setDebounced] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebounced(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const tableRef = useRef(null);
    const revealTable = useCallback(() => {
        const el = tableRef.current;
        if (!el) return;
        const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }, []);

    // One builder for both the list request and the Excel link, so the sheet
    // can never be a different population than the table.
    const params = useMemo(() => {
        const qs = new URLSearchParams({ program: programCode, range, sort });
        if (debounced) qs.set('q', debounced);
        if (branch) qs.set('branch', branch);
        if (gender) qs.set('gender', gender);
        if (admission) qs.set('admission', admission);
        if (laptop) qs.set('laptop', laptop);
        return qs;
    }, [programCode, range, sort, debounced, branch, gender, admission, laptop]);

    const load = useCallback(async () => {
        setBusy(true);
        setError('');
        try {
            const qs = new URLSearchParams(params);
            qs.set('page', String(page));
            qs.set('limit', String(pageSize));
            setData(await call(`/api/admin/registrations/list?${qs.toString()}`, unauthorized));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }, [params, page, pageSize, unauthorized]);

    useEffect(() => {
        load();
    }, [load]);

    // Anything that changes WHICH rows are listed starts again at page one.
    useEffect(() => {
        setPage(1);
    }, [params, pageSize]);

    const rows = data?.students || [];
    const branchCounts = useMemo(() => {
        const m = new Map((data?.counts?.branch || []).map((b) => [b.value, b.n]));
        return BRANCH_FILTERS.filter((b) => m.get(b)).map((b) => ({ value: b, n: m.get(b) }));
    }, [data]);

    const clearAll = () => {
        setQuery('');
        setBranch('');
        setGender('');
        setAdmission('');
        setLaptop('');
        setRange('all');
        setPage(1);
    };

    const exportHref = `/api/admin/registrations/export?view=directory&${params.toString()}`;
    const from = data && data.total ? (data.page - 1) * pageSize + 1 : 0;
    const to = data ? (data.page - 1) * pageSize + rows.length : 0;

    return (
        <div className="ip ip--embedded rg">
            <div className="ip-head">
                <div>
                    <p className="ip-head__title">Registered students</p>
                    <p className="ip-head__sub">
                        Everyone who signed up for this intake, with everything the registration form collected.
                    </p>
                </div>
                <div className="ip-head__actions">
                    <button type="button" className="cp-btn cp-btn--ghost cp-btn--compact" onClick={load} disabled={busy}>
                        <IconRefresh /> <span>{busy ? 'Loading…' : 'Refresh'}</span>
                    </button>
                    {/* Downloads exactly what the filters above describe, not the
                        whole collection — "export" means "this". */}
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

            {!data && !error && <p className="sr-roster__empty">Loading the register…</p>}

            {data && (
                <>
                    <Stats data={data} />

                    <div className="ip-days" role="group" aria-label="Filter by when they registered">
                        {RANGES.map((r) => (
                            <button
                                key={r.key}
                                type="button"
                                className={`sr-chip${range === r.key ? ' is-on' : ''}`}
                                aria-pressed={range === r.key}
                                onClick={() => {
                                    setRange(r.key);
                                    revealTable();
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <div className="cp-filters ip-filters rg-filters" role="search">
                        <label className="cp-filters__search">
                            <span className="cp-sr-only">Search registrations</span>
                            <IconSearch aria-hidden="true" />
                            <input
                                type="search"
                                placeholder="Name, roll number, email, mobile or registration ID"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </label>

                        <Select label="Gender" value={gender} onChange={setGender} all="All genders" options={GENDERS} />
                        <Select label="Admission" value={admission} onChange={setAdmission} all="All admissions" options={ADMISSION_TYPES} />
                        <Select
                            label="Laptop"
                            value={laptop}
                            onChange={setLaptop}
                            all="Laptop: any"
                            options={YES_NO}
                            render={(v) => `Laptop: ${v}`}
                        />
                        <Select label="Sort by" value={sort} onChange={setSort} options={REG_SORTS} render={(s) => `Sort: ${s.label}`} />

                        <div className="ip-size">
                            <Segmented id="rg-size" size="sm" label="Entries per page" value={pageSize} onChange={setPageSize} options={SIZE_OPTIONS} />
                            <span className="ip-size__label">per page</span>
                        </div>
                    </div>

                    {branchCounts.length > 1 && (
                        <div className="sr-chips" role="group" aria-label="Filter by branch">
                            <button type="button" className={`sr-chip${!branch ? ' is-on' : ''}`} aria-pressed={!branch} onClick={() => setBranch('')}>
                                All <span>{num(data.counts?.branchTotal ?? data.scopeTotal)}</span>
                            </button>
                            {branchCounts.map((b) => (
                                <button
                                    key={b.value}
                                    type="button"
                                    className={`sr-chip${branch === b.value ? ' is-on' : ''}`}
                                    aria-pressed={branch === b.value}
                                    title={b.value}
                                    onClick={() => {
                                        setBranch(branch === b.value ? '' : b.value);
                                        revealTable();
                                    }}
                                >
                                    {branchShort(b.value)} <span>{num(b.n)}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="ip-resultbar" ref={tableRef}>
                        <span aria-live="polite">
                            {/* The table below says so too when it is empty, so
                                this cell stays quiet rather than repeating it. */}
                            {data.total === 0 ? (
                                ''
                            ) : (
                                <>
                                    Showing <strong>{num(from)}–{num(to)}</strong> of {num(data.total)}
                                    {data.total !== data.scopeTotal ? ` (filtered from ${num(data.scopeTotal)})` : ''}
                                </>
                            )}
                        </span>
                        {data.filtered && (
                            <button type="button" className="cp-an-link" onClick={clearAll}>
                                Clear filters
                            </button>
                        )}
                    </div>

                    <RegTable rows={rows} />

                    <Pager page={data.page} pages={data.pages} busy={busy} onPage={setPage} />
                </>
            )}
        </div>
    );
}

function Select({ label, value, onChange, all, options, render }) {
    return (
        <label className="cp-filters__select">
            <span className="cp-sr-only">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)}>
                {all && <option value="">{all}</option>}
                {options.map((o) => {
                    const key = typeof o === 'string' ? o : o.key;
                    return (
                        <option key={key} value={key}>
                            {render ? render(o) : o}
                        </option>
                    );
                })}
            </select>
        </label>
    );
}

function Stats({ data }) {
    const g = Object.fromEntries((data.counts?.gender || []).map((x) => [x.value, x.n]));
    const cells = [
        { key: 'total', label: 'Registered', value: num(data.scopeTotal), hint: 'on this intake' },
        { key: 'shown', label: 'Matching', value: num(data.total), hint: data.filtered ? 'current filters' : 'no filters', tone: 'done' },
        { key: 'f', label: 'Female', value: num(g.Female || 0), hint: 'in this filter' },
        { key: 'm', label: 'Male', value: num(g.Male || 0), hint: 'in this filter' }
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
        </div>
    );
}

function Pager({ page, pages, busy, onPage }) {
    if (pages <= 1) return null;
    const go = (n) => onPage(Math.min(Math.max(1, n), pages));
    return (
        <nav className="ip-pager" aria-label="Register pages">
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

const GENDER_SHORT = { Male: 'M', Female: 'F' };

function RegTable({ rows }) {
    if (!rows.length) return <p className="sr-roster__empty">No registration matches those filters.</p>;
    return (
        <div className="ip-table rg-table" role="table" aria-label="Registered students">
            <div className="ip-table__row ip-table__row--head" role="row">
                <span role="columnheader">#</span>
                <span role="columnheader">Student</span>
                <span role="columnheader">Roll No</span>
                <span role="columnheader">Contact</span>
                <span role="columnheader">Branch</span>
                <span role="columnheader">Academics</span>
                <span role="columnheader">Entrance</span>
                <span role="columnheader">Registered</span>
            </div>
            {rows.map((s, i) => (
                <div className="ip-table__row" role="row" key={s.registrationId || s.rollNumber || i}>
                    <span role="cell" className="ip-table__no">
                        {i + 1}
                    </span>
                    <span role="cell" className="rg-who">
                        <strong>{s.fullName}</strong>
                        <small>
                            {s.registrationId}
                            {s.gender ? ` · ${GENDER_SHORT[s.gender] || s.gender}` : ''}
                            {s.hasLaptop === 'No' ? ' · no laptop' : ''}
                        </small>
                    </span>
                    <span role="cell" className="ip-table__roll">
                        {s.rollNumber}
                    </span>
                    <span role="cell" className="rg-contact">
                        {/* The icons carry the meaning that the column header
                            only gives once, at the top of a long scroll; they
                            are decorative to a screen reader, which gets the
                            labelled link and the tel: href instead. */}
                        <a href={`mailto:${s.collegeEmail}`} title={s.collegeEmail}>
                            <IconMail aria-hidden="true" />
                            <span>{s.collegeEmail}</span>
                        </a>
                        {s.mobileNumber ? (
                            <a className="rg-contact__tel" href={`tel:${s.mobileNumber}`}>
                                <IconPhone aria-hidden="true" />
                                <span>{s.mobileNumber}</span>
                            </a>
                        ) : (
                            <small>
                                <IconPhone aria-hidden="true" />
                                <span>—</span>
                            </small>
                        )}
                    </span>
                    <span role="cell" className="ip-table__panel">
                        <strong title={s.branch}>{branchShort(s.branch)}</strong>
                        {/* The free-text branch only exists for the OTHER bucket,
                            and it is the only place that says what they meant. */}
                        {s.branchOther && <small title={s.branchOther}>{s.branchOther}</small>}
                    </span>
                    <span role="cell" className="rg-acad">
                        <strong>
                            {s.admissionType === 'Lateral Entry'
                                ? `Dip ${dash(s.diplomaCgpa)}`
                                : `CGPA ${dash(s.cgpa)}`}
                        </strong>
                        <small>
                            {s.activeBacklogs === null || s.activeBacklogs === undefined
                                ? 'backlogs —'
                                : `${s.activeBacklogs} backlog${s.activeBacklogs === 1 ? '' : 's'}`}
                            {s.admissionType === 'Lateral Entry' ? ' · lateral' : ''}
                        </small>
                    </span>
                    <span role="cell" className="rg-rank">
                        {s.eapcetRank || s.jeeMainsRank || s.jeeAdvancedRank ? (
                            <>
                                {s.eapcetRank ? <strong>EAPCET {num(s.eapcetRank)}</strong> : null}
                                {s.jeeMainsRank ? <small>JEE Main {num(s.jeeMainsRank)}</small> : null}
                                {s.jeeAdvancedRank ? <small>JEE Adv {num(s.jeeAdvancedRank)}</small> : null}
                            </>
                        ) : (
                            <em className="ip-tag">none given</em>
                        )}
                    </span>
                    <span role="cell" className="ip-table__when">
                        <strong>{s.createdAt ? formatDateTime(s.createdAt) : '—'}</strong>
                    </span>
                </div>
            ))}
        </div>
    );
}
