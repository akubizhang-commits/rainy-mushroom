export function makeChallenge(target, pool, nowMs, rng = Math.random) {
  const distractors = pool.filter(c => c.id !== target.id)
  if (distractors.length < 2) throw new Error('pool too small')
  const shuffled = [...distractors].sort(() => rng() - 0.5)
  const options = [target.id, shuffled[0].id, shuffled[1].id].sort(() => rng() - 0.5)
  return {
    correctId: target.id,
    options,
    clues: [...target.clues],
    deadline: nowMs + 3000
  }
}

export function judge(challenge, chosenId, nowMs) {
  if (nowMs > challenge.deadline) return 'timeout'
  return chosenId === challenge.correctId ? 'correct' : 'wrong'
}
