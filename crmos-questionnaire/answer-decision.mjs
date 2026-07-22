export function decideAnswerAction({ accepted, action, commentId, commentAuthor, sender, answerBody, authorizedRespondents }) {
  if (!authorizedRespondents.includes(sender) || sender !== commentAuthor) {
    return { type: "REJECT", reason: "comment author is not an authorized respondent", owner: accepted.owner };
  }
  if (!accepted.owner) {
    if (!answerBody.trim()) return { type: "IGNORE", reason: "empty answer" };
    return { type: "ACCEPT", owner: commentAuthor };
  }
  const isAcceptedSource = accepted.commentId === commentId && commentAuthor === accepted.owner;
  if (action === "edited" && isAcceptedSource && sender === accepted.owner) {
    return { type: "REFRESH", owner: accepted.owner };
  }
  return { type: "REJECT", reason: "question already belongs to its accepted source comment author", owner: accepted.owner };
}
