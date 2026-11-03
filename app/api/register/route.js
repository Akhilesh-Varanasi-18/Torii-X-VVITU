import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRegistrationsCollection } from '../../../lib/mongodb';
import { validateRegistration, normalizeRoll, PROGRAM_BY_KEY, ROSTER_ELIGIBILITY } from '../../../lib/registration-schema';
import { prefillFor, ROSTER_RESIDENCE } from '../../../lib/registration-eligibility';

// Registrations must hit the database on every request — never cache or prerender.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4096;

const buildRegistrationId = () => `TM-VVITU-${100000 + crypto.randomInt(900000)}`;

/** Maps a MongoDB duplicate-key error onto the field the student needs to fix. */
function duplicateFieldFrom(error) {
    // The unique indexes are compound ({ programCode, rollNumber } etc.) — the
    // student-facing field is whichever key is not the program.
    const key = error?.keyPattern ? Object.keys(error.keyPattern).find((k) => k !== 'programCode') : null;
    if (key === 'rollNumber') return { field: 'rollNumber', message: 'This roll number is already registered' };
    if (key === 'collegeEmail') return { field: 'collegeEmail', message: 'This email ID is already registered' };
    return null;
}

// On a roster-gated intake these fields are composed from the college's roster
// and OVERRIDE whatever the browser sent. They are exactly the fields that say
// WHO this is, plus residence — which is not a question when the roster is the
// hostel list. Everything else on the form is the student's to answer and is
// taken from the request as normal.
//
// This allowlist is the whole security property: the browser can ask to
// register, but it cannot choose a name, a roll number it is not entitled to,
// or a residence that would change what the intake means.
const ROSTER_OWNED_FIELDS = ['fullName', 'rollNumber', 'residenceType'];

/**
 * A closed intake is refused outright rather than reported as a bad field: a
 * stale tab, a cached page or a hand-made request must get the real reason, not
 * a list of inputs to "correct" on a form that no longer accepts entries.
 */
const closedIntakeResponse = (program) =>
    NextResponse.json(
        {
            success: false,
            message: `Registrations for ${program.programName} are now closed.`,
            closed: true,
            errors: { programKey: `Registrations for ${program.programName} are now closed` }
        },
        { status: 403 }
    );

export async function POST(request) {
    // 1. Parse defensively — a malformed or oversized body must not reach the driver.
    let payload;
    try {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
            return NextResponse.json({ success: false, message: 'Request body too large.' }, { status: 413 });
        }
        payload = JSON.parse(raw);
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid request format.' }, { status: 400 });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return NextResponse.json({ success: false, message: 'Invalid request format.' }, { status: 400 });
    }

    // 2. Roster-gated intakes (AI Ready): the roll number the student picked is
    //    re-checked against the college's roster HERE, and their name, roll and
    //    residence are composed from it — so a hand-made request cannot register
    //    under another student's name, and cannot register at all for a roll
    //    that is not on the list. The rest of the form is the student's own
    //    answers and is taken from the request.
    const program = PROGRAM_BY_KEY[typeof payload.programKey === 'string' ? payload.programKey : ''] || null;
    if (program && !program.open) return closedIntakeResponse(program);
    const gated = Boolean(program?.open && program.eligibility === ROSTER_ELIGIBILITY);
    let identity = null;
    let candidate = payload;

    if (gated) {
        const rollKey = normalizeRoll(payload.rollNumber);
        if (!rollKey) {
            return NextResponse.json(
                { success: false, message: 'Please find yourself in the list first.', errors: { rollNumber: 'Pick your roll number or name from the list' } },
                { status: 422 }
            );
        }
        try {
            identity = await prefillFor(rollKey, program.key);
        } catch (error) {
            console.error('[register] eligibility lookup failed:', error);
            return NextResponse.json(
                { success: false, message: 'We could not verify your eligibility right now. Please try again in a moment.' },
                { status: 503 }
            );
        }
        if (!identity) {
            return NextResponse.json(
                {
                    success: false,
                    message: `${program.programName} is open only to students on the 2nd year hostel list.`,
                    errors: { rollNumber: 'This roll number is not on the eligible list' }
                },
                { status: 403 }
            );
        }
        if (identity.alreadyRegistered) {
            return NextResponse.json(
                { success: false, message: `You have already registered for ${program.programName}.`, errors: { rollNumber: 'This roll number is already registered' } },
                { status: 409 }
            );
        }
        // The student's own answers first, then the roster's fields on top, so
        // the server's copy of identity always wins over the browser's.
        candidate = {
            ...payload,
            programKey: program.key,
            ...Object.fromEntries(ROSTER_OWNED_FIELDS.map((f) => [f, identity.student[f]])),
            residenceType: ROSTER_RESIDENCE
        };
    }

    // 3. Authoritative validation. The client runs the same rules for instant
    //    feedback, but this is the check that actually gates the write. The
    //    program (and therefore the passout year, code and track) is derived
    //    server-side from the key, so a tampered request can't register itself
    //    into a program it didn't earn.
    const { values, errors, program: validated } = validateRegistration(candidate);
    // Second gate: catches a request that named its intake through the legacy
    // `passoutYear` field, which only the validator resolves to a program.
    if (validated && !validated.open) return closedIntakeResponse(validated);
    if (Object.keys(errors).length > 0) {
        // On a gated intake the student fills in everything except the fields
        // the roster owns, so those are the only ones that can fail invisibly.
        // An error there means the college's list is wrong about them, which is
        // not something they can fix on the form — say that instead of
        // highlighting a field they were never shown.
        const hidden = gated ? Object.keys(errors).filter((k) => ROSTER_OWNED_FIELDS.includes(k)) : [];
        return NextResponse.json(
            {
                success: false,
                message: hidden.length
                    ? `Your details on the college list could not be used (${hidden.join(', ')}). Please contact the ToriiMinds team.`
                    : 'Please correct the highlighted fields.',
                errors
            },
            { status: 422 }
        );
    }

    let collection;
    try {
        collection = await getRegistrationsCollection();
    } catch (error) {
        console.error('[register] database connection failed:', error);
        return NextResponse.json(
            { success: false, message: 'We could not reach the registration server. Please try again in a moment.' },
            { status: 503 }
        );
    }

    // 4. Friendly pre-check for duplicates WITHIN this program. The compound
    //    unique indexes are the real guarantee (this lookup can race), but it
    //    lets us name both fields at once.
    try {
        const existing = await collection.findOne(
            { programCode: validated.code, $or: [{ rollNumber: values.rollNumber }, { collegeEmail: values.collegeEmail }] },
            { projection: { rollNumber: 1, collegeEmail: 1 } }
        );
        if (existing) {
            const duplicateErrors = {};
            if (existing.rollNumber === values.rollNumber) {
                duplicateErrors.rollNumber = 'This roll number is already registered';
            }
            if (existing.collegeEmail === values.collegeEmail) {
                duplicateErrors.collegeEmail = 'This email ID is already registered';
            }
            return NextResponse.json(
                { success: false, message: `You have already registered for ${validated.programName}.`, errors: duplicateErrors },
                { status: 409 }
            );
        }
    } catch (error) {
        console.error('[register] duplicate lookup failed:', error);
        return NextResponse.json(
            { success: false, message: 'Something went wrong while checking your details. Please try again.' },
            { status: 500 }
        );
    }

    // 5. Build the record. Academic fields are stored as numbers (they feed the
    //    dashboard's CGPA bands and backlog split); the time slot keeps its label
    //    and key; the pre-fill block records where the details came from.
    const { cgpa, activeBacklogs, admissionType, diplomaCgpa, timeSlot, timeSlotKey, studyYear, studyYearKey, ...studentValues } = values;

    // A year-spanning intake (Moon Coder) takes its year from the student, so
    // the program's own `yearLabel` would be wrong on the record — it names one
    // cohort while the batch holds four. Build the label from what they chose.
    // Every other program keeps its fixed label.
    const resolvedYearLabel = validated.studyYears && studyYear
        ? `${studyYear} (${values.passoutYear} passout)`
        : validated.yearLabel;

    const document = {
        ...studentValues,
        // Academics only exist for programs that ask for them. diplomaCgpa is
        // narrower still — only a lateral-entry student has one, so it is
        // written only when it holds a real number rather than as a null that
        // would read as "answered, blank".
        ...(validated.academics ? { cgpa, activeBacklogs, admissionType } : {}),
        ...(validated.academics && diplomaCgpa !== null ? { diplomaCgpa } : {}),
        ...(validated.timeSlots ? { timeSlot, timeSlotKey } : {}),
        // Only written by the intakes that ask — on every other program it
        // would be an empty string reading as "answered, blank".
        ...(validated.studyYears ? { studyYear, studyYearKey } : {}),
        // Records WHICH roster entry this registration was verified against, so a
        // later roster correction can be traced to the records it affected.
        ...(identity ? { prefill: { source: ROSTER_ELIGIBILITY, rollKey: identity.rollKey, editedFields: [] } } : {}),
        programName: validated.programName,
        programCode: validated.code,
        programTrack: validated.badge,
        yearLabel: resolvedYearLabel,
        status: 'registered',
        source: 'vvitu-landing-page',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    // Insert, retrying only on a registrationId collision so a random-ID clash
    // never surfaces to the student as an error.
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const registrationId = buildRegistrationId();
        try {
            await collection.insertOne({ registrationId, ...document });
            return NextResponse.json(
                {
                    success: true,
                    message: 'Registration successful.',
                    registrationId,
                    programKey: validated.key,
                    programName: validated.programName,
                    programCode: validated.code,
                    // Echoed so the success screen can show what was saved for a
                    // gated intake, where the browser never held these values.
                    saved: {
                        fullName: values.fullName,
                        rollNumber: values.rollNumber,
                        branch: values.branch,
                        gender: values.gender,
                        residenceType: values.residenceType,
                        hasLaptop: values.hasLaptop,
                        batch: identity?.student.batch || null,
                        timeSlot: timeSlot || null
                    }
                },
                { status: 201 }
            );
        } catch (error) {
            if (error?.code === 11000) {
                const duplicate = duplicateFieldFrom(error);
                if (duplicate) {
                    // Lost the race against a concurrent identical submission.
                    return NextResponse.json(
                        {
                            success: false,
                            message: `You have already registered for ${validated.programName}.`,
                            errors: { [duplicate.field]: duplicate.message }
                        },
                        { status: 409 }
                    );
                }
                continue; // registrationId collision — generate a fresh one.
            }
            console.error('[register] insert failed:', error);
            return NextResponse.json(
                { success: false, message: 'We could not save your registration. Please try again.' },
                { status: 500 }
            );
        }
    }

    console.error('[register] exhausted registrationId attempts');
    return NextResponse.json(
        { success: false, message: 'We could not generate a registration ID. Please try again.' },
        { status: 500 }
    );
}

/** Lightweight health check: confirms the API and the database are both reachable. */
export async function GET() {
    try {
        const collection = await getRegistrationsCollection();
        const count = await collection.countDocuments();
        return NextResponse.json({ success: true, database: 'connected', registrations: count });
    } catch (error) {
        console.error('[register] health check failed:', error);
        return NextResponse.json({ success: false, database: 'unreachable' }, { status: 503 });
    }
}
