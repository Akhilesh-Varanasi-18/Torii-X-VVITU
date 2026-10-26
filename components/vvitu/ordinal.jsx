import React from 'react';

// Raises the suffix of any ordinal in a string — "2nd Year" renders as 2ⁿᵈ Year.
//
// Driven by the digit+suffix pair rather than a lookup table, so "3rd Year",
// "11th Batch" and anything else added later are handled without touching this
// file. Returns an array of React nodes, so callers splat it into JSX directly.
//
// This lives on its own because two places need the exact same treatment: the
// WhatsApp community pop-up's year-group list and the program cards' year pill.
// A second copy would drift.
const ORDINAL_RE = /(\d+)(st|nd|rd|th)\b/gi;

export const withOrdinalSup = (text) => {
    const parts = [];
    let last = 0;
    let match;
    ORDINAL_RE.lastIndex = 0;
    while ((match = ORDINAL_RE.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        parts.push(match[1], { sup: match[2] });
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.map((part, i) =>
        typeof part === 'string'
            ? <React.Fragment key={i}>{part}</React.Fragment>
            : <sup key={i} className="vvitu-ord-sup">{part.sup}</sup>
    );
};

export default withOrdinalSup;
