/* ============================================================
   Domain — the durable spec. Pure functions, no DOM, no storage.
   This is the layer worth protecting: the code around it is cheap
   to regenerate, but a user's logged history is not. Everything
   that decides "is this datum valid / sane?" lives here so it can
   be reasoned about and tested in isolation (see tests/domain.test.js).

   Entry (weight) shape: { id, weight:Number, date:ISOString, notes:String, clothesWeight:Number|null }

   Policy: validate at the boundary, FAIL SOFT — a single bad row must
   never blank the screen or get silently coerced. Reject it, keep it
   out of the rendered set, and report the count. Never throw on bad data.

   Loaded as a plain <script> in the browser (sets window.Domain) and
   require()-able in Node for tests (module.exports). No build step.
   ============================================================ */
(function (root) {
  const Domain = (() => {
    const WEIGHT_MIN = 30;        // kg — below this is implausible for an adult
    const WEIGHT_MAX = 400;       // kg
    const JUMP_KG = 3;            // flag a swing larger than this...
    const JUMP_WITHIN_DAYS = 1.5; // ...when readings are this close in time

    // Coerce + validate one raw entry. Returns the cleaned entry or null.
    // Coerce only real numbers or non-empty numeric strings; everything
    // else (null, '', '  ', boolean, array, object) becomes NaN. This is
    // the guard against Number(null)===0 and Number('')===0 silently
    // turning missing data into a valid-looking 0.
    function toNumber(v) {
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '') return Number(v);
      return NaN;
    }

    function validateEntry(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const weight = toNumber(raw.weight);
      if (!Number.isFinite(weight)) return null;
      const t = Date.parse(raw.date);
      if (Number.isNaN(t)) return null;
      const clothes = toNumber(raw.clothesWeight);
      return {
        id: raw.id != null ? String(raw.id) : String(t),
        weight,
        date: new Date(t).toISOString(),
        notes: typeof raw.notes === 'string' ? raw.notes : '',
        clothesWeight: Number.isFinite(clothes) ? clothes : null,
      };
    }

    // Fail-soft parse of a whole log. Bad rows are dropped and counted,
    // never thrown on. Returns { entries, rejected }.
    function parseLog(rawList) {
      if (!Array.isArray(rawList)) return { entries: [], rejected: 0 };
      const entries = [];
      let rejected = 0;
      for (const raw of rawList) {
        const e = validateEntry(raw);
        if (e) entries.push(e); else rejected++;
      }
      return { entries, rejected };
    }

    // Spot-check the numbers a human eye would catch. Pure: takes entries,
    // returns a Map<id, string[]> of issues. Does not mutate or render.
    function sanityFlags(entries) {
      const flags = new Map();
      const add = (id, msg) => {
        if (!flags.has(id)) flags.set(id, []);
        flags.get(id).push(msg);
      };
      const chron = [...entries].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
      let prev = null;
      for (const e of chron) {
        if (e.weight < WEIGHT_MIN || e.weight > WEIGHT_MAX) {
          add(e.id, `weight ${e.weight}kg is outside ${WEIGHT_MIN}–${WEIGHT_MAX}kg`);
        }
        if (prev) {
          const days = (Date.parse(e.date) - Date.parse(prev.date)) / 86400000;
          const delta = Math.abs(e.weight - prev.weight);
          if (days <= JUMP_WITHIN_DAYS && delta > JUMP_KG) {
            add(e.id, `${delta.toFixed(1)}kg swing from the previous reading`);
          }
        }
        prev = e;
      }
      return flags;
    }

    // Validate an inbound export payload before it touches storage.
    function validatePayload(obj) {
      if (!obj || typeof obj !== 'object') return { ok: false, error: 'Payload is not an object.' };
      if (!obj.trim_export) return { ok: false, error: 'Missing trim_export marker — wrong file?' };
      if (!obj.user || !obj.user.email) return { ok: false, error: 'Missing user.email.' };
      const { entries, rejected } = parseLog(obj.log);
      const clean = { ...obj, log: entries };
      return { ok: true, payload: clean, report: { logKept: entries.length, logRejected: rejected } };
    }

    return { validateEntry, parseLog, sanityFlags, validatePayload,
             WEIGHT_MIN, WEIGHT_MAX, JUMP_KG, JUMP_WITHIN_DAYS };
  })();

  if (typeof module !== 'undefined' && module.exports) module.exports = Domain;
  root.Domain = Domain;
})(typeof window !== 'undefined' ? window : globalThis);
