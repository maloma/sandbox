import { readFile } from "node:fs/promises";

import { decideAnswerAction } from "./answer-decision.mjs";
import { applyAcceptedAnswer, completedTitle, isQuestionIssue, readAcceptedMetadata } from "./questionnaire-core.mjs";
import { AUTHORIZED_RESPONDENTS, validateRespondents } from "./respondents.mjs";

const token = process.env["GITHUB_TOKEN"];
const repository = process.env["GITHUB_REPOSITORY"];
const eventPath = process.env["GITHUB_EVENT_PATH"];
if (!token || !repository || !eventPath) throw new Error("Required GitHub environment is missing.");

const config = validateRespondents();
if (!config.ready) {
  console.log(JSON.stringify({ questionnaire: "waiting-for-three-respondents", count: config.count }));
  process.exit(0);
}

const event = JSON.parse(await readFile(eventPath, "utf8"));
const issueNumber = event.issue?.number;
const comment = event.comment;
const sender = event.sender?.login;
const action = event.action;
if (!issueNumber || !comment || !sender || !["created", "edited"].includes(action)) process.exit(0);
if (comment.user?.type === "Bot") process.exit(0);

const [owner, repo] = repository.split("/");
async function github(path, options = {}, tolerated = []) {
  const response = await fetch("https://api.github.com" + path, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  if (!response.ok && !tolerated.includes(response.status)) {
    throw new Error((options.method ?? "GET") + " " + path + " failed: " + response.status + " " + (await response.text()));
  }
  if (response.status === 204 || tolerated.includes(response.status)) return null;
  return response.json();
}

const issue = await github("/repos/" + owner + "/" + repo + "/issues/" + issueNumber);
const issueBody = issue.body ?? "";
if (!isQuestionIssue(issueBody)) process.exit(0);

const accepted = readAcceptedMetadata(issueBody);
const commentId = String(comment.id);
const commentAuthor = comment.user?.login;
const answerBody = comment.body?.trim() ?? "";
const decision = decideAnswerAction({
  accepted,
  action,
  commentId,
  commentAuthor,
  sender,
  answerBody,
  authorizedRespondents: AUTHORIZED_RESPONDENTS,
});

async function removeRejectedComment(reason) {
  await github("/repos/" + owner + "/" + repo + "/issues/comments/" + comment.id, { method: "DELETE" }, [404]);
  console.log(JSON.stringify({ questionnaire: "comment-rejected", reason, issueNumber, acceptedOwner: accepted.owner }));
}

if (decision.type === "IGNORE") process.exit(0);
if (decision.type === "REJECT") {
  await removeRejectedComment(decision.reason);
  process.exit(0);
}

const updatedBody = applyAcceptedAnswer(issueBody, {
  owner: decision.owner,
  commentId,
  commentUrl: comment.html_url,
  updatedAt: comment.updated_at,
  body: answerBody,
});

await github("/repos/" + owner + "/" + repo + "/issues/" + issueNumber, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: completedTitle(issue.title), body: updatedBody, state: "closed" }),
});

await github(
  "/repos/" + owner + "/" + repo + "/issues/" + issueNumber + "/lock",
  { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lock_reason: "resolved" }) },
  [422],
);

console.log(JSON.stringify({ questionnaire: decision.type === "REFRESH" ? "answer-corrected" : "answer-accepted", issueNumber, owner: decision.owner, commentId }));
