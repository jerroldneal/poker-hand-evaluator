/**
 * hand-evaluator.js — 7-card Texas Hold'em Hand Evaluator
 *
 * Evaluates any 5-7 card hand and returns rank, name, and equity estimate.
 * Cards are represented as strings: rank + suit
 *   Ranks: 2 3 4 5 6 7 8 9 T J Q K A
 *   Suits: s h d c
 *   Examples: "As", "Kh", "2d", "Tc"
 */
'use strict';

const RANKS     = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS     = ['s','h','d','c'];
const RANK_IDX  = Object.fromEntries(RANKS.map((r, i) => [r, i]));
const SUIT_IDX  = Object.fromEntries(SUITS.map((s, i) => [s, i]));

const HAND_RANK = {
  HIGH_CARD:        0,
  ONE_PAIR:         1,
  TWO_PAIR:         2,
  THREE_OF_A_KIND:  3,
  STRAIGHT:         4,
  FLUSH:            5,
  FULL_HOUSE:       6,
  FOUR_OF_A_KIND:   7,
  STRAIGHT_FLUSH:   8,
};

function parseCard(str) {
  if (!str || typeof str !== 'string' || str.length < 2) return null;
  const rank = str.length === 3 ? str.slice(0, 2) : str.slice(0, -1);
  const suit = str.slice(-1).toLowerCase();
  const r = RANK_IDX[rank];
  const s = SUIT_IDX[suit];
  if (r === undefined || s === undefined) return null;
  return { rank: r, suit: s };
}

function cardToString(card) {
  return RANKS[card.rank] + SUITS[card.suit];
}

/**
 * Evaluate a 5-card hand.
 * Returns { rank, tiebreaker, name }
 */
function evaluate5(cards) {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks  = sorted.map(c => c.rank);
  const suits  = sorted.map(c => c.suit);

  const isFlush    = new Set(suits).size === 1;
  const rankSet    = new Set(ranks);
  const uniqueRanks = rankSet.size;

  // Straight detection
  let isStraight = false;
  let straightHigh = -1;
  if (uniqueRanks === 5) {
    if (ranks[0] - ranks[4] === 4) {
      isStraight = true;
      straightHigh = ranks[0];
    }
    // Wheel: A-2-3-4-5
    if (ranks[0] === 12 && ranks[1] === 3 && ranks[2] === 2 && ranks[3] === 1 && ranks[4] === 0) {
      isStraight = true;
      straightHigh = 3;
    }
  }

  // Rank frequency map, sorted by (count desc, rank desc)
  const freq = {};
  for (const r of ranks) freq[r] = (freq[r] || 0) + 1;
  const groups = Object.entries(freq)
    .sort((a, b) => b[1] - a[1] || parseInt(b[0]) - parseInt(a[0]))
    .map(([r, c]) => ({ rank: parseInt(r), count: c }));

  if (isFlush && isStraight) {
    return {
      rank: HAND_RANK.STRAIGHT_FLUSH,
      tiebreaker: [straightHigh],
      name: straightHigh === 12 ? 'Royal Flush' : 'Straight Flush',
    };
  }
  if (groups[0].count === 4) {
    return { rank: HAND_RANK.FOUR_OF_A_KIND, tiebreaker: groups.map(g => g.rank), name: 'Four of a Kind' };
  }
  if (groups[0].count === 3 && groups[1].count === 2) {
    return { rank: HAND_RANK.FULL_HOUSE, tiebreaker: groups.map(g => g.rank), name: 'Full House' };
  }
  if (isFlush) {
    return { rank: HAND_RANK.FLUSH, tiebreaker: ranks, name: 'Flush' };
  }
  if (isStraight) {
    return { rank: HAND_RANK.STRAIGHT, tiebreaker: [straightHigh], name: 'Straight' };
  }
  if (groups[0].count === 3) {
    return { rank: HAND_RANK.THREE_OF_A_KIND, tiebreaker: groups.map(g => g.rank), name: 'Three of a Kind' };
  }
  if (groups[0].count === 2 && groups[1].count === 2) {
    return { rank: HAND_RANK.TWO_PAIR, tiebreaker: groups.map(g => g.rank), name: 'Two Pair' };
  }
  if (groups[0].count === 2) {
    return { rank: HAND_RANK.ONE_PAIR, tiebreaker: groups.map(g => g.rank), name: 'One Pair' };
  }
  return { rank: HAND_RANK.HIGH_CARD, tiebreaker: ranks, name: 'High Card' };
}

/**
 * Compare two evaluate5 results. Returns positive if a > b.
 */
function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  const len = Math.max(a.tiebreaker.length, b.tiebreaker.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreaker[i] ?? -1;
    const bv = b.tiebreaker[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Evaluate the best 5-card hand from 5-7 cards.
 * @param {string[]} cardStrings - e.g. ["As","Kh","Qd","Jc","Ts"]
 * @returns {{ rank, tiebreaker, name } | null}
 */
function evaluate7(cardStrings) {
  const cards = cardStrings.map(parseCard).filter(Boolean);
  if (cards.length < 5) return null;

  let best = null;
  const n = cards.length;

  // Iterate all C(n,5) combinations
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const hand = evaluate5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareHands(hand, best) > 0) best = hand;
          }
        }
      }
    }
  }
  return best;
}

/**
 * Pre-flop hand strength using Chen formula (normalized 0-1).
 * @param {string[]} holeCards - exactly 2 card strings
 * @returns {number} 0-1
 */
function preFlopStrength(holeCards) {
  if (!holeCards || holeCards.length < 2) return 0.5;
  const [c1, c2] = holeCards.map(parseCard).filter(Boolean);
  if (!c1 || !c2) return 0.5;

  const hi     = Math.max(c1.rank, c2.rank);
  const lo     = Math.min(c1.rank, c2.rank);
  const suited = c1.suit === c2.suit;
  const isPair = hi === lo;
  const gap    = hi - lo;

  let score;
  if (isPair) {
    score = hi * 2;
    if (hi === 12) score = 20; // AA
    else if (hi === 11) score = 16; // KK
    else if (hi === 10) score = 14; // QQ
    else if (hi === 9)  score = 12; // JJ
    score = Math.max(5, score);
  } else {
    score  = hi * 0.5;
    score += suited ? 2 : 0;
    score += gap <= 1 ? 1 : 0;
    score -= Math.max(0, gap - 3);
  }

  return Math.max(0.05, Math.min(0.98, score / 20));
}

/**
 * Estimate hero win probability given current cards + num opponents.
 * @param {{ holeCards: string[], boardCards: string[], numOpponents?: number }} opts
 * @returns {number} 0-1
 */
function winProbability({ holeCards = [], boardCards = [], numOpponents = 1 }) {
  if (holeCards.length < 2) return 0.5;

  let equity;
  if (boardCards.length === 0) {
    equity = preFlopStrength(holeCards);
  } else {
    const result = evaluate7([...holeCards, ...boardCards]);
    const TABLE = [0.10, 0.38, 0.55, 0.68, 0.72, 0.77, 0.86, 0.93, 0.97];
    equity = result ? (TABLE[result.rank] ?? 0.5) : 0.5;
  }

  return Math.max(0.01, equity * Math.pow(0.88, Math.max(0, numOpponents - 1)));
}

module.exports = { evaluate7, evaluate5, preFlopStrength, winProbability, parseCard, cardToString, compareHands, HAND_RANK };
