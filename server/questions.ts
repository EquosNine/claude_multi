// Pending question resolvers: keyed by `${panelId}:${questionId}`
const pendingQuestions = new Map<string, (answer: string) => void>();

export function resolveQuestion(panelId: number, questionId: string, answer: string) {
  const key = `${panelId}:${questionId}`;
  const resolver = pendingQuestions.get(key);
  if (resolver) {
    resolver(answer);
    pendingQuestions.delete(key);
  }
}

export function waitForQuestionAnswer(panelId: number, questionId: string): Promise<string> {
  return new Promise((resolve) => {
    pendingQuestions.set(`${panelId}:${questionId}`, resolve);
  });
}
