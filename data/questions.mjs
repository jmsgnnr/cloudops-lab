import { practitionerQuestions } from "./practitioner.mjs";
import { securityQuestions } from "./security.mjs";
import { networkingQuestions } from "./networking.mjs";
export const QUESTIONS = Object.freeze([...practitionerQuestions, ...securityQuestions, ...networkingQuestions]);
