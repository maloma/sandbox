// Public questionnaire policy: configure only pseudonymous work-account logins.
// Personal employee names and personal GitHub accounts are prohibited.
export const RESPONDENT_ACCOUNT_POLICY = "PSEUDONYMOUS_WORK_ACCOUNTS_ONLY";
export const AUTHORIZED_RESPONDENTS = Object.freeze([]);

export function validateRespondents(respondents = AUTHORIZED_RESPONDENTS) {
  const unique = new Set(respondents);
  const valid = respondents.every((login) => /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login));
  return {
    ready: respondents.length === 3 && unique.size === 3 && valid,
    count: respondents.length,
  };
}
