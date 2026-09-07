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
 *
 * 역추적은 우선 match(일치) / delete(정답에만 있음) / insert(입력에만 있음)
 * 세 종류의 원시 연산으로 분해한 뒤, 연속된 delete/insert 구간을 한 번 더
 * 후처리하여 "같은 위치의 대체(substitution)"를 wrong으로 묶어낸다.
 * (이전 버전은 insert를 만났을 때 expected 포인터를 옮기지 않은 채 바로
 *  wrong으로 표시해버려서, 사용자가 단어를 하나 더 입력했을 뿐인데도
 *  멀쩡한 정답 단어가 correct/wrong 두 번 중복 표시되며 점수가 부정확하게
 *  깎이는 버그가 있었다.)
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

  type RawOp = { type: "match" | "delete"; word: string } | { type: "insert"; word: string };
  const reversedOps: RawOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (expected[i - 1] === actual[j - 1]) {
      reversedOps.push({ type: "match", word: expected[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      // 정답에만 있는 단어 (삭제됨)
      reversedOps.push({ type: "delete", word: expected[i - 1] });
      i--;
    } else {
      // 사용자 입력에만 있는 단어 (추가로 입력됨)
      reversedOps.push({ type: "insert", word: actual[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    reversedOps.push({ type: "delete", word: expected[i - 1] });
    i--;
  }
  while (j > 0) {
    reversedOps.push({ type: "insert", word: actual[j - 1] });
    j--;
  }
  const ops = reversedOps.reverse();

  // 연속된 delete/insert 구간을 순서대로 짝지어 wrong(대체)으로 만들고,
  // 짝이 안 맞는 delete는 missing, 짝이 안 맞는 insert(정답보다 더 입력한 단어)는
  // 채점에 영향을 주지 않도록 조용히 버린다.
  const diff: DiffItem[] = [];
  let deleteBuffer: string[] = [];
  let insertBuffer: string[] = [];

  function flushBuffers() {
    const pairCount = Math.min(deleteBuffer.length, insertBuffer.length);
    for (let k = 0; k < pairCount; k++) {
      diff.push({ type: "wrong", expected: deleteBuffer[k], actual: insertBuffer[k] });
    }
    for (let k = pairCount; k < deleteBuffer.length; k++) {
      diff.push({ type: "missing", expected: deleteBuffer[k] });
    }
    deleteBuffer = [];
    insertBuffer = [];
  }

  for (const op of ops) {
    if (op.type === "match") {
      flushBuffers();
      diff.push({ type: "correct", text: op.word });
    } else if (op.type === "delete") {
      deleteBuffer.push(op.word);
    } else {
      insertBuffer.push(op.word);
    }
  }
  flushBuffers();

  return diff;
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
