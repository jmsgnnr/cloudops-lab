import { TRACKS } from "./blueprints.mjs";
export function item(id, track, domain, difficulty, stem, options, answers, explanation) {
  return { id, track, domain, difficulty, stem, options, answers, explanation, reference: TRACKS[track].guide };
}
