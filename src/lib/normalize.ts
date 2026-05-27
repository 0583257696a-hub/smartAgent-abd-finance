const aliasGroups = [
  ["הפניקס", "פניקס", "phoenix", "fnx"],
  ["כלל", "clal"],
  ["מגדל", "migdal"],
  ["הראל", "harel"],
  ["מיטב", "meitav"],
  ["מור", "more"],
  ["אלטשולר", "altshul"],
  ["מנורה", "menora"],
  ["אנליסט", "analyst"],
];

const finalLetters: Record<string, string> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

function normalizeBase(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (letter) => finalLetters[letter] ?? letter)
    .replace(/["'׳״`´]/g, "")
    .replace(/[^\p{L}\p{N}\s@._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeText(text: string): string {
  let normalized = normalizeBase(text);

  aliasGroups.forEach((group) => {
    const normalizedGroup = group.map(normalizeBase);
    const canonical = normalizedGroup[0];

    normalizedGroup.forEach((alias) => {
      if (!alias) return;
      normalized = normalized.replace(new RegExp(`(^|\\s)${escapeRegExp(alias)}(?=\\s|$)`, "g"), `$1${canonical}`);
    });
  });

  return normalized.replace(/\s+/g, " ").trim();
}

export function searchMatch(text: string, query: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return true;
  if (normalizedText.includes(normalizedQuery)) return true;

  return normalizedQuery
    .split(" ")
    .filter(Boolean)
    .every((token) => normalizedText.includes(token) || isFuzzyMatch(normalizedText, token));
}

function isFuzzyMatch(text: string, token: string): boolean {
  if (token.length < 3) return false;

  let tokenIndex = 0;
  for (const char of text) {
    if (char === token[tokenIndex]) tokenIndex += 1;
    if (tokenIndex === token.length) return true;
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
