# poker-hand-evaluator

> **Repo**: [`jerroldneal/poker-hand-evaluator`](https://github.com/jerroldneal/poker-hand-evaluator) · **Submodule of**: [`cnr-ws-server`](https://github.com/jerroldneal/cnr-ws-server) at `submodules/poker-hand-evaluator/`

7-card Texas Hold'em hand evaluator with pre-flop strength scoring, win equity estimation, and hand comparison.

## Usage

### Node.js

```javascript
const { evaluate7, preFlopStrength, winProbability, HAND_RANK } = require('./index');

// Evaluate a 7-card hand (best 5 of 7)
const result = evaluate7(['As', 'Kh', 'Qd', 'Jc', 'Ts', '3h', '7d']);
console.log(result); // { rank: 4, tiebreaker: [12], name: 'Straight' }

// Pre-flop strength (0-1)
const strength = preFlopStrength(['As', 'Kh']);
console.log(strength); // 0.55

// Win probability vs N opponents
const equity = winProbability({
  holeCards: ['As', 'Kh'],
  boardCards: ['Qs', 'Jd', 'Ts'],
  numOpponents: 3
});
console.log(equity); // ~0.49
```

### Browser (Injectable)

Served via cnr-ws-server's inject-loader at `/inject/hand-evaluator.js`.

```javascript
// After injection, the API is at window.__PokerHandEvaluator
const eval = window.__PokerHandEvaluator;
const result = eval.evaluate7(['As', 'Kh', 'Qd', 'Jc', 'Ts', '3h', '7d']);
```

## API

| Function | Description |
|----------|-------------|
| `evaluate5(cards)` | Evaluate exactly 5 parsed card objects |
| `evaluate7(cardStrings)` | Find best 5-card hand from 5-7 card strings |
| `preFlopStrength(holeCards)` | Chen-formula pre-flop strength (0-1) |
| `winProbability({ holeCards, boardCards, numOpponents })` | Estimated win equity (0-1) |
| `parseCard(str)` | Parse "As" → `{ rank: 12, suit: 0 }` |
| `cardToString(card)` | `{ rank: 12, suit: 0 }` → "As" |
| `compareHands(a, b)` | Compare two evaluate5 results (positive = a wins) |
| `HAND_RANK` | Enum: HIGH_CARD(0) through STRAIGHT_FLUSH(8) |

## Card Format

- **Ranks**: `2 3 4 5 6 7 8 9 T J Q K A`
- **Suits**: `s h d c` (spades, hearts, diamonds, clubs)
- **Examples**: `As` (Ace of spades), `Kh` (King of hearts), `Tc` (Ten of clubs)

## Structure

```
poker-hand-evaluator/
├── index.js           ← Node.js CommonJS module
├── inject/
│   └── hand-evaluator.js  ← Browser IIFE (window.__PokerHandEvaluator)
├── package.json
└── README.md
```
