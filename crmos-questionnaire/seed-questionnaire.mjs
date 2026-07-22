import { setTimeout as delay } from "node:timers/promises";

import { openTitle, renderQuestionIssue, renderStartIssue } from "./questionnaire-core.mjs";
import { QUESTIONS } from "./questions/index.mjs";
import { validateRespondents } from "./respondents.mjs";

const token = process.env["GITHUB_TOKEN"];
const repository = process.env["GITHUB_REPOSITORY"];
if (!token || !repository) throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required.");

const config = validateRespondents();
if (!config.ready) {
  console.log(JSON.stringify({ questionnaire: "waiting-for-three-respondents", count: config.count }));
  process.exit(0);
}

const [owner, repo] = repository.split("/");
async function github(path, options = {}) {
  const response = await fetch("https://api.github.com" + path, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error((options.method ?? "GET") + " " + path + " failed: " + response.status + " " + (await response.text()));
  if (response.status === 204) return null;
  return response.json();
}

async function listIssues() {
  const issues = [];
  for (let page = 1; ; page += 1) {
    const batch = await github("/repos/" + owner + "/" + repo + "/issues?state=all&per_page=100&page=" + page);
    issues.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) return issues;
  }
}

const existing = await listIssues();
const questionIds = new Set();
let startExists = false;
for (const issue of existing) {
  const body = issue.body ?? "";
  const id = body.match(/<!-- crmos-question-id:([^ ]+) -->/)?.[1];
  if (id) questionIds.add(id);
  if (body.includes("<!-- crmos-questionnaire:start -->")) startExists = true;
}

if (!startExists) {
  await github("/repos/" + owner + "/" + repo + "/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "📋 CRMOS — начать здесь: анкета по процессу заказов",
      body: renderStartIssue(repository, QUESTIONS),
    }),
  });
}

let created = 0;
for (const question of QUESTIONS) {
  if (questionIds.has(question.id)) continue;
  await github("/repos/" + owner + "/" + repo + "/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: openTitle(question), body: renderQuestionIssue(question) }),
  });
  created += 1;
  await delay(150);
}

console.log(JSON.stringify({ questionnaire: "published", totalQuestions: QUESTIONS.length, newlyCreated: created }));
