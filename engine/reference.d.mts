// Types for what test/ imports from engine/reference.mjs (engine/ is plain JavaScript and tsconfig has no allowJs).

// `have`: the reference so far (an article or a sentence it holds is not added again); `request`: the user's request, whose
// words pick the main article's passages; the first article found gets `firstMax` chars (0: every article gets `max`)
export function fetchArticles(
  titles: string[],
  opts?: { have?: string; request?: string; firstMax?: number; max?: number },
): Promise<string>;
export function fetchPassages(
  title: string,
  words: string[],
  opts?: { have?: string; max?: number },
): Promise<string>;
