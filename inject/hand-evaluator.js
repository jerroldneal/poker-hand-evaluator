/**
 * hand-evaluator.js — Browser-injectable IIFE
 *
 * Exposes window.PokerHandEvaluator with the full 7-card evaluator API.
 * Served via cnr-ws-server inject-loader at /inject/hand-evaluator.js
 */
var __handEvaluatorResult = (function () {
  'use strict';

  if (window.__PokerHandEvaluator) return 'already_loaded';

  var RANKS     = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  var SUITS     = ['s','h','d','c'];
  var RANK_IDX  = {};
  var SUIT_IDX  = {};
  RANKS.forEach(function (r, i) { RANK_IDX[r] = i; });
  SUITS.forEach(function (s, i) { SUIT_IDX[s] = i; });

  var HAND_RANK = {
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
    var rank = str.length === 3 ? str.slice(0, 2) : str.slice(0, -1);
    var suit = str.slice(-1).toLowerCase();
    var r = RANK_IDX[rank];
    var s = SUIT_IDX[suit];
    if (r === undefined || s === undefined) return null;
    return { rank: r, suit: s };
  }

  function cardToString(card) {
    return RANKS[card.rank] + SUITS[card.suit];
  }

  function evaluate5(cards) {
    var sorted = cards.slice().sort(function (a, b) { return b.rank - a.rank; });
    var ranks  = sorted.map(function (c) { return c.rank; });
    var suits  = sorted.map(function (c) { return c.suit; });

    var isFlush    = new Set(suits).size === 1;
    var rankSet    = new Set(ranks);
    var uniqueRanks = rankSet.size;

    var isStraight = false;
    var straightHigh = -1;
    if (uniqueRanks === 5) {
      if (ranks[0] - ranks[4] === 4) {
        isStraight = true;
        straightHigh = ranks[0];
      }
      if (ranks[0] === 12 && ranks[1] === 3 && ranks[2] === 2 && ranks[3] === 1 && ranks[4] === 0) {
        isStraight = true;
        straightHigh = 3;
      }
    }

    var freq = {};
    for (var i = 0; i < ranks.length; i++) freq[ranks[i]] = (freq[ranks[i]] || 0) + 1;
    var groups = Object.keys(freq)
      .map(function (r) { return { rank: parseInt(r), count: freq[r] }; })
      .sort(function (a, b) { return b.count - a.count || b.rank - a.rank; });

    if (isFlush && isStraight) {
      return { rank: HAND_RANK.STRAIGHT_FLUSH, tiebreaker: [straightHigh], name: straightHigh === 12 ? 'Royal Flush' : 'Straight Flush' };
    }
    if (groups[0].count === 4) {
      return { rank: HAND_RANK.FOUR_OF_A_KIND, tiebreaker: groups.map(function (g) { return g.rank; }), name: 'Four of a Kind' };
    }
    if (groups[0].count === 3 && groups[1].count === 2) {
      return { rank: HAND_RANK.FULL_HOUSE, tiebreaker: groups.map(function (g) { return g.rank; }), name: 'Full House' };
    }
    if (isFlush) {
      return { rank: HAND_RANK.FLUSH, tiebreaker: ranks, name: 'Flush' };
    }
    if (isStraight) {
      return { rank: HAND_RANK.STRAIGHT, tiebreaker: [straightHigh], name: 'Straight' };
    }
    if (groups[0].count === 3) {
      return { rank: HAND_RANK.THREE_OF_A_KIND, tiebreaker: groups.map(function (g) { return g.rank; }), name: 'Three of a Kind' };
    }
    if (groups[0].count === 2 && groups[1].count === 2) {
      return { rank: HAND_RANK.TWO_PAIR, tiebreaker: groups.map(function (g) { return g.rank; }), name: 'Two Pair' };
    }
    if (groups[0].count === 2) {
      return { rank: HAND_RANK.ONE_PAIR, tiebreaker: groups.map(function (g) { return g.rank; }), name: 'One Pair' };
    }
    return { rank: HAND_RANK.HIGH_CARD, tiebreaker: ranks, name: 'High Card' };
  }

  function compareHands(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    var len = Math.max(a.tiebreaker.length, b.tiebreaker.length);
    for (var i = 0; i < len; i++) {
      var av = a.tiebreaker[i] != null ? a.tiebreaker[i] : -1;
      var bv = b.tiebreaker[i] != null ? b.tiebreaker[i] : -1;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  function evaluate7(cardStrings) {
    var cards = cardStrings.map(parseCard).filter(Boolean);
    if (cards.length < 5) return null;

    var best = null;
    var n = cards.length;
    for (var a = 0; a < n - 4; a++) {
      for (var b = a + 1; b < n - 3; b++) {
        for (var c = b + 1; c < n - 2; c++) {
          for (var d = c + 1; d < n - 1; d++) {
            for (var e = d + 1; e < n; e++) {
              var hand = evaluate5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
              if (!best || compareHands(hand, best) > 0) best = hand;
            }
          }
        }
      }
    }
    return best;
  }

  function preFlopStrength(holeCards) {
    if (!holeCards || holeCards.length < 2) return 0.5;
    var parsed = holeCards.map(parseCard).filter(Boolean);
    if (parsed.length < 2) return 0.5;
    var c1 = parsed[0], c2 = parsed[1];

    var hi     = Math.max(c1.rank, c2.rank);
    var lo     = Math.min(c1.rank, c2.rank);
    var suited = c1.suit === c2.suit;
    var isPair = hi === lo;
    var gap    = hi - lo;

    var score;
    if (isPair) {
      score = hi * 2;
      if (hi === 12) score = 20;
      else if (hi === 11) score = 16;
      else if (hi === 10) score = 14;
      else if (hi === 9)  score = 12;
      score = Math.max(5, score);
    } else {
      score  = hi * 0.5;
      score += suited ? 2 : 0;
      score += gap <= 1 ? 1 : 0;
      score -= Math.max(0, gap - 3);
    }

    return Math.max(0.05, Math.min(0.98, score / 20));
  }

  function winProbability(opts) {
    var holeCards = opts.holeCards || [];
    var boardCards = opts.boardCards || [];
    var numOpponents = opts.numOpponents != null ? opts.numOpponents : 1;

    if (holeCards.length < 2) return 0.5;

    var equity;
    if (boardCards.length === 0) {
      equity = preFlopStrength(holeCards);
    } else {
      var result = evaluate7(holeCards.concat(boardCards));
      var TABLE = [0.10, 0.38, 0.55, 0.68, 0.72, 0.77, 0.86, 0.93, 0.97];
      equity = result ? (TABLE[result.rank] != null ? TABLE[result.rank] : 0.5) : 0.5;
    }

    return Math.max(0.01, equity * Math.pow(0.88, Math.max(0, numOpponents - 1)));
  }

  window.__PokerHandEvaluator = {
    evaluate5: evaluate5,
    evaluate7: evaluate7,
    preFlopStrength: preFlopStrength,
    winProbability: winProbability,
    parseCard: parseCard,
    cardToString: cardToString,
    compareHands: compareHands,
    HAND_RANK: HAND_RANK,
  };

  return 'ok';
})();
if (typeof module !== 'undefined') module.exports = __handEvaluatorResult;
__handEvaluatorResult;
