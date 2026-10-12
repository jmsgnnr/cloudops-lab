import { practitionerQuestions } from "./practitioner.mjs";
import { practitionerExtendedQuestions } from "./practitioner-extended.mjs";
import { securityQuestions } from "./security.mjs";
import { securityExtendedQuestions } from "./security-extended.mjs";
import { networkingQuestions } from "./networking.mjs";
import { networkingExtendedQuestions } from "./networking-extended.mjs";

export const practitionerBank = Object.freeze([
  ...practitionerQuestions,
  ...practitionerExtendedQuestions
]);
export const securityBank = Object.freeze([...securityQuestions, ...securityExtendedQuestions]);
export const networkingBank = Object.freeze([...networkingQuestions, ...networkingExtendedQuestions]);

export const QUESTIONS = Object.freeze([
  ...practitionerBank,
  ...securityBank,
  ...networkingBank
]);
