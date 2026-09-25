"""
Comprehensive Texas Hold'em Poker Hand Evaluator
Supports 5-card evaluation and 7-card best-hand selection with complete tiebreaker hierarchy.
"""
from typing import List, Tuple, Dict, Any
from itertools import combinations

# Card Constants
SUITS = ['clubs', 'spades', 'hearts', 'diamonds']
SUIT_SYMBOLS = {'clubs': '♣', 'spades': '♠', 'hearts': '♥', 'diamonds': '♦'}
RANK_NAMES = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A'
}
RANK_PLURALS = {
    2: '2s', 3: '3s', 4: '4s', 5: '5s', 6: '6s', 7: '7s', 8: '8s', 9: '9s', 10: '10s',
    11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces'
}

# Mapping to cards sprite sheet (4 rows x 13 columns)
# Row 0: Clubs, Row 1: Spades, Row 2: Hearts, Row 3: Diamonds
# Col 0: Ace, Col 1..9: 2..10, Col 10: J, Col 11: Q, Col 12: K
SUIT_TO_ROW = {'clubs': 0, 'spades': 1, 'hearts': 2, 'diamonds': 3}

def rank_to_col(rank: int) -> int:
    if rank == 14:  # Ace
        return 0
    return rank - 1

class Card:
    __slots__ = ('suit', 'rank', 'row', 'col')

    def __init__(self, suit: str, rank: int):
        self.suit = suit.lower()
        self.rank = int(rank)
        self.row = SUIT_TO_ROW.get(self.suit, 0)
        self.col = rank_to_col(self.rank)

    @property
    def rank_str(self) -> str:
        return RANK_NAMES.get(self.rank, str(self.rank))

    @property
    def suit_symbol(self) -> str:
        return SUIT_SYMBOLS.get(self.suit, '')

    def to_dict(self) -> Dict[str, Any]:
        return {
            'suit': self.suit,
            'rank': self.rank,
            'rank_str': self.rank_str,
            'suit_symbol': self.suit_symbol,
            'row': self.row,
            'col': self.col
        }

    def __repr__(self) -> str:
        return f"{self.rank_str}{self.suit_symbol}"

    def __eq__(self, other) -> bool:
        return isinstance(other, Card) and self.suit == other.suit and self.rank == other.rank

    def __hash__(self) -> int:
        return hash((self.suit, self.rank))


# Hand Category Rankings (Higher is better)
HAND_CATEGORY_ROYAL_FLUSH = 9
HAND_CATEGORY_STRAIGHT_FLUSH = 8
HAND_CATEGORY_FOUR_OF_A_KIND = 7
HAND_CATEGORY_FULL_HOUSE = 6
HAND_CATEGORY_FLUSH = 5
HAND_CATEGORY_STRAIGHT = 4
HAND_CATEGORY_THREE_OF_A_KIND = 3
HAND_CATEGORY_TWO_PAIR = 2
HAND_CATEGORY_ONE_PAIR = 1
HAND_CATEGORY_HIGH_CARD = 0

def evaluate_5_cards(cards: List[Card]) -> Tuple[int, List[int], str]:
    """
    Evaluates exactly 5 cards.
    Returns:
        (category_score, tiebreaker_list, hand_description)
    """
    if len(cards) != 5:
        raise ValueError("evaluate_5_cards requires exactly 5 cards")

    ranks = sorted([c.rank for c in cards], reverse=True)
    suits = [c.suit for c in cards]
    is_flush = len(set(suits)) == 1

    # Frequency analysis
    rank_counts: Dict[int, int] = {}
    for r in ranks:
        rank_counts[r] = rank_counts.get(r, 0) + 1

    # Sorted by frequency descending, then by rank descending
    sorted_by_freq = sorted(rank_counts.keys(), key=lambda r: (rank_counts[r], r), reverse=True)
    counts = [rank_counts[r] for r in sorted_by_freq]

    # Straight check (including 5-4-3-2-A wheel)
    unique_ranks = sorted(list(set(ranks)), reverse=True)
    is_straight = False
    straight_high = 0

    if len(unique_ranks) == 5:
        if unique_ranks[0] - unique_ranks[4] == 4:
            is_straight = True
            straight_high = unique_ranks[0]
        elif unique_ranks == [14, 5, 4, 3, 2]:
            is_straight = True
            straight_high = 5  # In wheel, 5 is the top of the straight

    # 1. Royal / Straight Flush
    if is_flush and is_straight:
        if straight_high == 14:
            return (HAND_CATEGORY_ROYAL_FLUSH, [14], f"Royal Flush ({cards[0].suit.title()})")
        return (HAND_CATEGORY_STRAIGHT_FLUSH, [straight_high], f"Straight Flush, {RANK_NAMES[straight_high]} High")

    # 2. Four of a Kind
    if counts[0] == 4:
        quad_rank = sorted_by_freq[0]
        kicker = sorted_by_freq[1]
        return (HAND_CATEGORY_FOUR_OF_A_KIND, [quad_rank, kicker], f"Four of a Kind, {RANK_PLURALS[quad_rank]}")

    # 3. Full House
    if counts[0] == 3 and counts[1] == 2:
        trips_rank = sorted_by_freq[0]
        pair_rank = sorted_by_freq[1]
        return (HAND_CATEGORY_FULL_HOUSE, [trips_rank, pair_rank], f"Full House, {RANK_PLURALS[trips_rank]} full of {RANK_PLURALS[pair_rank]}")

    # 4. Flush
    if is_flush:
        return (HAND_CATEGORY_FLUSH, ranks, f"Flush, {RANK_NAMES[ranks[0]]} High")

    # 5. Straight
    if is_straight:
        return (HAND_CATEGORY_STRAIGHT, [straight_high], f"Straight, {RANK_NAMES[straight_high]} High")

    # 6. Three of a Kind
    if counts[0] == 3:
        trips_rank = sorted_by_freq[0]
        kickers = sorted_by_freq[1:]
        return (HAND_CATEGORY_THREE_OF_A_KIND, [trips_rank] + kickers, f"Three of a Kind, {RANK_PLURALS[trips_rank]}")

    # 7. Two Pair
    if counts[0] == 2 and counts[1] == 2:
        pair1 = max(sorted_by_freq[0], sorted_by_freq[1])
        pair2 = min(sorted_by_freq[0], sorted_by_freq[1])
        kicker = sorted_by_freq[2]
        return (HAND_CATEGORY_TWO_PAIR, [pair1, pair2, kicker], f"Two Pair, {RANK_PLURALS[pair1]} and {RANK_PLURALS[pair2]}")

    # 8. One Pair
    if counts[0] == 2:
        pair_rank = sorted_by_freq[0]
        kickers = sorted_by_freq[1:]
        return (HAND_CATEGORY_ONE_PAIR, [pair_rank] + kickers, f"One Pair of {RANK_PLURALS[pair_rank]}")

    # 9. High Card
    return (HAND_CATEGORY_HIGH_CARD, ranks, f"High Card, {RANK_NAMES[ranks[0]]}")


def evaluate_best_hand(cards: List[Card]) -> Tuple[int, List[int], str, List[Card]]:
    """
    Finds the best 5-card poker hand from any pool of 5 to 7 cards.
    Returns:
        (category_score, tiebreaker_list, hand_description, best_5_cards)
    """
    if len(cards) < 5:
        # Fallback for fewer than 5 cards (e.g. Hole cards only)
        if len(cards) == 2:
            if cards[0].rank == cards[1].rank:
                desc = f"Pocket Pair of {RANK_PLURALS[cards[0].rank]}"
                return (HAND_CATEGORY_ONE_PAIR, [cards[0].rank], desc, cards)
            high_card = max(cards[0].rank, cards[1].rank)
            suited = "Suited" if cards[0].suit == cards[1].suit else "Offsuit"
            desc = f"High Card {RANK_NAMES[high_card]} ({suited})"
            return (HAND_CATEGORY_HIGH_CARD, [high_card], desc, cards)
        return (0, [], "Incomplete hand", cards)

    best_eval: Tuple[int, List[int], str, List[Card]] = (-1, [], "", [])

    for combo in combinations(cards, 5):
        combo_list = list(combo)
        score, tiebreakers, desc = evaluate_5_cards(combo_list)
        eval_key = (score, tiebreakers)
        best_key = (best_eval[0], best_eval[1])

        if eval_key > best_key:
            best_eval = (score, tiebreakers, desc, combo_list)

    return best_eval
