import { sqlite } from "../client";

// Tempered Tone Woods starts with a blank ledger: no pre-set accounts and no
// category map rules. Both are created from scratch through the Accounts and
// Category Map screens, unlike the other two instances which seeded from an
// existing spreadsheet.
sqlite.close();
