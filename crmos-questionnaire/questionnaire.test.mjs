import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

import { decideAnswerAction } from "./answer-decision.mjs";
import { applyAcceptedAnswer, readAcceptedMetadata, renderQuestionIssue, renderStartIssue } from "./questionnaire-core.mjs";
import { QUESTIONS } from "./questions/index.mjs";
import { validateRespondents } from "./respondents.mjs";

const respondents = ["respondent-one", "respondent-two", "respondent-three"];
const unanswered = { owner: null, commentId: null, updatedAt: null };
const answered = { owner: "respondent-one", commentId: "1001", updatedAt: "2026-07-22T10:00:00Z" };

const forbiddenPublicIdentifiers = /Инесса|Виктория|шеф|inessa/i;

test("contains sixty stable and personal-data-safe questions", () => {
  assert.equal(QUESTIONS.length, 60);
  assert.deepEqual(QUESTIONS.map((question) => question.id), Array.from({ length: 60 }, (_, index) => "Q" + String(index + 1).padStart(2, "0")));
  assert.equal(new Set(QUESTIONS.map((question) => question.id)).size, 60);
  for (const question of QUESTIONS) {
    assert.match(question.safety, /реальных клиентов/);
    assert.ok(question.prompt.length > 8);
    assert.ok(question.hint.length > 2);
  }
});

test("public question register contains no employee names", () => {
  assert.doesNotMatch(JSON.stringify(QUESTIONS), forbiddenPublicIdentifiers);
});

test("fails closed until exactly three unique pseudonymous usernames are configured", () => {
  assert.equal(validateRespondents([]).ready, false);
  assert.equal(validateRespondents(["one", "two"]).ready, false);
  assert.equal(validateRespondents(["one", "one", "three"]).ready, false);
  assert.equal(validateRespondents(respondents).ready, true);
});

test("renders public privacy and first-author correction instructions without listing respondents", () => {
  const question = renderQuestionIssue(QUESTIONS[0]);
  const start = renderStartIssue("maloma/sandbox", QUESTIONS);
  assert.match(question, /Анкета публичная/);
  assert.match(question, /первоначального комментария/);
  assert.match(start, /Другая сотрудница не может заменить/);
  assert.match(start, /видны публично/);
  assert.match(start, /псевдонимные рабочие GitHub-аккаунты/);
  for (const respondent of respondents) {
    assert.doesNotMatch(start, new RegExp(respondent));
  }
});

test("accepts first authorized answer and rejects unauthorized or competing users", () => {
  assert.deepEqual(decideAnswerAction({ accepted: unanswered, action: "created", commentId: "1001", commentAuthor: "respondent-one", sender: "respondent-one", answerBody: "Ответ", authorizedRespondents: respondents }), { type: "ACCEPT", owner: "respondent-one" });
  assert.equal(decideAnswerAction({ accepted: unanswered, action: "created", commentId: "2001", commentAuthor: "stranger", sender: "stranger", answerBody: "Ответ", authorizedRespondents: respondents }).type, "REJECT");
  assert.equal(decideAnswerAction({ accepted: answered, action: "created", commentId: "2002", commentAuthor: "respondent-two", sender: "respondent-two", answerBody: "Другой ответ", authorizedRespondents: respondents }).type, "REJECT");
  assert.equal(decideAnswerAction({ accepted: answered, action: "created", commentId: "1002", commentAuthor: "respondent-one", sender: "respondent-one", answerBody: "Второй комментарий", authorizedRespondents: respondents }).type, "REJECT");
});

test("allows only accepted author to edit original accepted comment", () => {
  assert.deepEqual(decideAnswerAction({ accepted: answered, action: "edited", commentId: "1001", commentAuthor: "respondent-one", sender: "respondent-one", answerBody: "Исправление", authorizedRespondents: respondents }), { type: "REFRESH", owner: "respondent-one" });
  assert.equal(decideAnswerAction({ accepted: answered, action: "edited", commentId: "1001", commentAuthor: "respondent-one", sender: "respondent-two", answerBody: "Подмена", authorizedRespondents: respondents }).type, "REJECT");
});

test("refreshes accepted snapshot without changing owner or source comment", () => {
  const initial = renderQuestionIssue(QUESTIONS[0]);
  const acceptedBody = applyAcceptedAnswer(initial, { owner: "respondent-one", commentId: "1001", commentUrl: "https://github.com/maloma/sandbox/issues/1#issuecomment-1001", updatedAt: "2026-07-22T10:00:00Z", body: "Первый ответ" });
  const corrected = applyAcceptedAnswer(acceptedBody, { owner: "respondent-one", commentId: "1001", commentUrl: "https://github.com/maloma/sandbox/issues/1#issuecomment-1001", updatedAt: "2026-07-22T10:05:00Z", body: "Исправленный ответ" });
  assert.deepEqual(readAcceptedMetadata(corrected), { owner: "respondent-one", commentId: "1001", updatedAt: "2026-07-22T10:05:00Z" });
  assert.match(corrected, /Исправленный ответ/);
  assert.doesNotMatch(corrected, /Первый ответ/);
});

test("workflows are least-privilege and serialize each question", async () => {
  const answer = await readFile(new URL("../.github/workflows/crmos-questionnaire-answer.yml", import.meta.url), "utf8");
  const publish = await readFile(new URL("../.github/workflows/crmos-questionnaire-publish.yml", import.meta.url), "utf8");
  assert.match(answer, /issue_comment:/);
  assert.match(answer, /- edited/);
  assert.match(answer, /issues: write/);
  assert.match(answer, /contents: read/);
  assert.match(answer, /github.event.issue.number/);
  assert.match(publish, /issues: write/);
  assert.match(publish, /seed-questionnaire.mjs/);
});
