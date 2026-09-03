export type DiffItem =
  | { type: "correct"; text: string }
  | { type: "wrong"; expected: string; actual: string }
  | { type: "missing"; expected: string };

/**
 * 채점 전 정규화: 연속 공백/줄바꿈/앞뒤공백/일반 문장부호 차이는 무시한다.
 * 단, 실제 단어 자체가 다른 경우는 오답으로 유지한다.
 */
export function normalizeForScoring(text: string): string[] {
  return text
    .replace(/[.,!?"'"".．，。！？]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0);
}

/**
 * 단어 배열의 LCS(최장 공통 부분수열) 길이표를 만들고,
 * 이를 역추적하여 correct / wrong / missing diff를 생성한다.
 */
export function diffMemorization(correctText: string, userText: string): DiffItem[] {
  const expected = normalizeForScoring(correctText);
  const actual = normalizeForScoring(userText);

  const n = expected.length;
  const m = actual.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (expected[i - 1] === actual[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 역추적 (뒤에서 앞으로) 후 뒤집기
  const reversedDiff: DiffItem[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (expected[i - 1] === actual[j - 1]) {
      reversedDiff.push({ type: "correct", text: expected[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      // 정답 단어가 사용자 입력에 없음 (또는 다른 단어로 대체되었을 가능성)
      reversedDiff.push({ type: "missing", expected: expected[i - 1] });
      i--;
    } else {
      // 사용자가 입력했지만 정답에 없는 단어 → 가장 가까운 정답 단어와 짝지어 wrong 처리
      reversedDiff.push({ type: "wrong", expected: expected[i - 1] ?? "", actual: actual[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    reversedDiff.push({ type: "missing", expected: expected[i - 1] });
    i--;
  }
  // 남은 사용자 입력 단어는 채점에 영향 주지 않음 (정답보다 많이 입력한 경우)

  return reversedDiff.reverse();
}

export function scoreFromDiff(diff: DiffItem[]): {
  score: number;
  correctCount: number;
  wrongCount: number;
  missingCount: number;
} {
  const correctCount = diff.filter((d) => d.type === "correct").length;
  const wrongCount = diff.filter((d) => d.type === "wrong").length;
  const missingCount = diff.filter((d) => d.type === "missing").length;
  const total = diff.length || 1;
  const score = Math.round((correctCount / total) * 1000) / 10; // 소수 첫째 자리
  return { score, correctCount, wrongCount, missingCount };
}

/** 빈칸 암송 채점: blanks = 정답 배열, userAnswers = 사용자가 입력한 배열 (같은 순서) */
export function scoreFillBlank(
  blanks: string[],
  userAnswers: string[]
): { score: number; correctCount: number; wrongCount: number; missingCount: number } {
  let correctCount = 0;
  let wrongCount = 0;
  let missingCount = 0;

  blanks.forEach((expected, idx) => {
    const answer = (userAnswers[idx] ?? "").trim();
    const normalizedExpected = normalizeForScoring(expected).join(" ");
    const normalizedAnswer = normalizeForScoring(answer).join(" ");
    if (!answer) {
      missingCount++;
    } else if (normalizedAnswer === normalizedExpected) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const total = blanks.length || 1;
  const score = Math.round((correctCount / total) * 1000) / 10;
  return { score, correctCount, wrongCount, missingCount };
}
