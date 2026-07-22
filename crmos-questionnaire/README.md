# CRMOS Lifecycle Questionnaire

This directory publishes a public, process-only questionnaire for three authorized employees.

## Privacy boundary

The questionnaire and accepted answers are publicly visible. Respondents must never enter real client names, contacts, addresses, document details, images, banking information, shipment identifiers or message screenshots.

## Collaboration rule

- each question is a separate GitHub Issue;
- three authorized GitHub users can answer different questions in parallel;
- the first valid author owns the accepted answer for that question;
- the issue receives `✅ Готово`, closes and locks;
- another user cannot replace the accepted answer;
- the accepted author can correct the answer by editing the original accepted comment;
- GitHub retains the visible edit history.

## Activation

`respondents.mjs` must contain exactly three authorized GitHub usernames. Until then the publication workflow exits safely without creating questionnaire issues.

## Source of truth

The canonical question register, product evidence and acceptance records remain in the private `maloma/CRMOS` repository. This public repository is only the response interface and contains no CRMOS source code or client data.
