import { LibraryRound, RACK_SIZE } from './LibraryRound.js'

// Scripted player for tuning and regression: one action every `interval` seconds, lowest reachable book first.
export function autoplay(level, { interval = 3, step = .1, seed, maxTime = 600 } = {}) {
  const round = new LibraryRound(level, seed === undefined ? {} : { seed })
  let wait = interval
  while (round.status === 'playing' && round.time < maxTime) {
    round.update(step)
    wait -= step
    if (wait > 1e-9) continue
    wait += interval
    act(round)
  }
  const soaked = round.books.filter(b => b.state === 'soaked').length
  return { status: round.status === 'won' ? 'won' : 'lost', soaked, time: round.time }
}

function act(round) {
  const reachable = round.books.filter(b => round.canPick(b.id)).sort((a, b) => a.y - b.y)
  const wet = reachable.find(b => b.wet)
  if (wet && round.rack.length < RACK_SIZE) {
    round.pick(wet.id)
    round.dropToRack(wet.id)
    return
  }
  const dry = reachable.find(b => !b.wet)
  if (!dry) return
  round.pick(dry.id)
  round.drop(dry.id, round.shelf.keyOf(dry))
}
