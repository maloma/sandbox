import { QUESTION_PRIORITIES } from "./questions/index.mjs";

const QUESTION_MARKER = "<!-- crmos-questionnaire:question -->";
const START_MARKER = "<!-- crmos-questionnaire:start -->";
const SNAPSHOT_START = "<!-- crmos-accepted-answer:start -->";
const SNAPSHOT_END = "<!-- crmos-accepted-answer:end -->";
const CODE_FENCE = "```";

export function renderQuestionIssue(question) {
  const optionLines = question.options.map((option) => "- [ ] " + option).join("\n");
  const answerTemplate =
    question.type === "text"
      ? "Ответ:\n\nОпишите фактический процесс:\n1. \n2. \n3. "
      : [
          "Ответ:",
          "",
          "Выбранные варианты:",
          ...question.options.map((option) => "- " + option),
          "",
          "Пояснение или вариант «Другое»: ",
        ].join("\n");
  const lines = [
    QUESTION_MARKER,
    "<!-- crmos-question-id:" + question.id + " -->",
    "<!-- crmos-answer-owner: -->",
    "<!-- crmos-answer-comment-id: -->",
    "<!-- crmos-answer-updated-at: -->",
    "",
    "# " + question.id + " — " + question.title,
    "",
    "**Раздел:** " + question.section + "  ",
    "**Важность:** " + QUESTION_PRIORITIES[question.priority],
    "",
    "## Что нужно ответить",
    "",
    question.prompt,
    "",
  ];

  if (optionLines) {
    lines.push("## Варианты ответа", "", optionLines, "");
  }

  lines.push(
    "**Подсказка:** " + question.hint,
    "",
    "> **Важно:** " + question.safety,
    "",
    "> Анкета публичная. Не вставляйте сведения, по которым можно узнать реального клиента, сотрудника или конкретный заказ.",
    "",
    "## Как заполнить",
    "",
    "1. Проверьте, что вопрос открыт и в заголовке нет `✅`.",
    "2. Скопируйте шаблон ниже в новый комментарий.",
    "3. Оставьте подходящие варианты, удалите неподходящие и добавьте пояснение.",
    "4. Первый принятый ответ закрепляет вопрос за его автором.",
    "5. После принятия вопрос получает `✅ Готово`. Другим сотрудницам отвечать на него уже не нужно.",
    "6. Автор ответа исправляет ошибку через меню `⋯` → **Edit** у своего первоначального комментария. Второй комментарий создавать не нужно.",
    "",
    "### Шаблон ответа",
    "",
    CODE_FENCE + "text",
    answerTemplate,
    CODE_FENCE,
    "",
    SNAPSHOT_START,
    "## Принятый ответ",
    "",
    "_Ответа пока нет._",
    SNAPSHOT_END,
    "",
  );

  return lines.join("\n");
}

export function renderStartIssue(repository, questions) {
  const [owner, repo] = repository.split("/");
  const base = "https://github.com/" + owner + "/" + repo + "/issues";
  const openQuery = base + "?q=is%3Aissue+is%3Aopen+%22CRMOS+Q%22";
  const answeredQuery = base + "?q=is%3Aissue+is%3Aclosed+%22%E2%9C%85+%5BCRMOS+Q%22";
  const sectionCounts = new Map();
  for (const question of questions) {
    sectionCounts.set(question.section, (sectionCounts.get(question.section) ?? 0) + 1);
  }
  const sections = [...sectionCounts.entries()]
    .map(([section, count]) => "- **" + section + ":** " + count + " вопросов")
    .join("\n");

  return [
    START_MARKER,
    "# Анкета по фактическому процессу заказов",
    "",
    "Эту анкету одновременно заполняют три уполномоченные сотрудницы через отдельные псевдонимные рабочие GitHub-аккаунты.",
    "Каждый вопрос находится в отдельной карточке, поэтому можно открыть разные вопросы и отвечать параллельно.",
    "",
    "## Главное правило",
    "",
    "- Открытая карточка без `✅` ещё ждёт ответ.",
    "- Первый принятый ответ закрепляет карточку за его автором.",
    "- После принятия карточка получает `✅ Готово`, закрывается и больше не требует ответа других сотрудниц.",
    "- Автор принятого ответа может исправить ошибку, отредактировав свой первоначальный комментарий через `⋯` → **Edit**.",
    "- Другая сотрудница не может заменить уже принятый ответ.",
    "",
    "## С чего начать",
    "",
    "1. Откройте [все вопросы без ответа](" + openQuery + ").",
    "2. Выберите любую открытую карточку без `✅`.",
    "3. Ответьте по шаблону в карточке.",
    "4. После появления `✅` переходите к другой открытой карточке.",
    "",
    "- [Все вопросы без ответа](" + openQuery + ")",
    "- [Уже готовые ответы](" + answeredQuery + ")",
    "",
    "## Разделы",
    "",
    sections,
    "",
    "## Публичность и защита данных",
    "",
    "Эта анкета и ответы видны публично. Не вставляйте имена сотрудников или клиентов, личные GitHub-логины, телефоны, адреса, номера документов, фотографии, переписку, банковские данные, трек-номера или другие сведения, позволяющие узнать человека или конкретный заказ. Нужны только роли, правила работы, варианты действий и полностью обезличенные примеры.",
    "",
  ].join("\n");
}

export function isQuestionIssue(body = "") {
  return body.includes(QUESTION_MARKER);
}

export function readQuestionId(body = "") {
  return body.match(/<!-- crmos-question-id:([^ ]+) -->/)?.[1] ?? null;
}

export function readAcceptedMetadata(body = "") {
  const owner = body.match(/<!-- crmos-answer-owner:([^>]*) -->/)?.[1]?.trim() ?? "";
  const commentId = body.match(/<!-- crmos-answer-comment-id:([^>]*) -->/)?.[1]?.trim() ?? "";
  const updatedAt = body.match(/<!-- crmos-answer-updated-at:([^>]*) -->/)?.[1]?.trim() ?? "";
  return { owner: owner || null, commentId: commentId || null, updatedAt: updatedAt || null };
}

export function applyAcceptedAnswer(body, answer) {
  const safeAnswer = answer.body
    .replaceAll("<!--", "&lt;!--")
    .replaceAll("-->", "--&gt;")
    .split("\n")
    .map((line) => "> " + line)
    .join("\n");
  const snapshot = [
    SNAPSHOT_START,
    "## ✅ Готово",
    "",
    "**Ответила:** @" + answer.owner + "  ",
    "**Последнее исправление:** " + answer.updatedAt + "  ",
    "**Исходный комментарий:** " + answer.commentUrl,
    "",
    safeAnswer,
    SNAPSHOT_END,
  ].join("\n");

  return body
    .replace(/<!-- crmos-answer-owner:[^>]* -->/, "<!-- crmos-answer-owner:" + answer.owner + " -->")
    .replace(/<!-- crmos-answer-comment-id:[^>]* -->/, "<!-- crmos-answer-comment-id:" + answer.commentId + " -->")
    .replace(/<!-- crmos-answer-updated-at:[^>]* -->/, "<!-- crmos-answer-updated-at:" + answer.updatedAt + " -->")
    .replace(new RegExp(SNAPSHOT_START + "[\\s\\S]*?" + SNAPSHOT_END), snapshot);
}

export function completedTitle(title) {
  return title.startsWith("✅ ") ? title : "✅ " + title;
}

export function openTitle(question) {
  return "[CRMOS " + question.id + "] " + question.title;
}
