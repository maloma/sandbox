# CRMOS Lifecycle Questionnaire

This directory publishes a public, process-only questionnaire for three authorized employees using pseudonymous work accounts.

## Privacy boundary

The questionnaire and accepted answers are publicly visible. Respondents must never enter real employee or client names, personal GitHub usernames, contacts, addresses, document details, images, banking information, shipment identifiers or message screenshots.

The public content may contain only:

- generic operational roles;
- process steps;
- non-identifying answer choices;
- fully invented and non-identifying examples.

## Employee anonymity

Only pseudonymous work GitHub accounts may be configured as respondents. Personal employee names and personal GitHub accounts are prohibited because GitHub publicly displays the commenting account.

The public start card does not list the three account logins. A login becomes visible only when that pseudonymous account posts an answer.

## Collaboration rule

- each question is a separate GitHub Issue;
- three authorized pseudonymous GitHub users can answer different questions in parallel;
- the first valid author owns the accepted answer for that question;
- the issue receives `✅ Готово`, closes and locks;
- another user cannot replace the accepted answer;
- the accepted author can correct the answer by editing the original accepted comment;
- GitHub retains the visible edit history.

## Activation

`respondents.mjs` must contain exactly three unique pseudonymous work-account logins. Until then the publication workflow exits safely without creating questionnaire issues.

## Source of truth

The canonical question register, product evidence and acceptance records remain in the private `maloma/CRMOS` repository. This public repository is only the response interface and contains no CRMOS source code or client data.
