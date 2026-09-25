"""
AI Poker Agent Decision Engine
Implements personality-based poker strategies (Aggressive, Balanced, Tight/Defensive).
"""
import random
from typing import Dict, Any, Tuple, List
from poker_evaluator import Card, evaluate_best_hand

class AIPokerAgent:
    BOT_PROFILES = {
        'alex': {
            'name': 'Alex "The Rogue"',
            'aggression': 1.6,      # Higher frequency of raises and bluffs
            'bluff_rate': 0.22,
            'tightness': 0.35,      # Plays wider range of hands
            'min_call_threshold': 0.25
        },
        'bella': {
            'name': 'Bella "The Wizard"',
            'aggression': 1.1,      # Balanced, calculates math and odds
            'bluff_rate': 0.10,
            'tightness': 0.55,
            'min_call_threshold': 0.35
        },
        'charlie': {
            'name': 'Charlie "The Knight"',
            'aggression': 0.7,      # Defensive / tight rock
            'bluff_rate': 0.04,
            'tightness': 0.75,      # Folds easily unless strong hand
            'min_call_threshold': 0.45
        }
    }

    def __init__(self, bot_type: str = 'bella'):
        self.bot_type = bot_type.lower()
        self.profile = self.BOT_PROFILES.get(self.bot_type, self.BOT_PROFILES['bella'])

    def evaluate_hand_strength(self, hole_cards: List[Dict[str, Any]], community_cards: List[Dict[str, Any]]) -> float:
        """
        Returns estimated hand strength score between 0.0 (garbage) and 1.0 (nuts).
        """
        if not hole_cards or len(hole_cards) < 2:
            return 0.2

        c1 = hole_cards[0]
        c2 = hole_cards[1]
        r1, r2 = c1['rank'], c2['rank']
        is_pair = (r1 == r2)
        is_suited = (c1['suit'] == c2['suit'])
        high_rank = max(r1, r2)
        low_rank = min(r1, r2)
        diff = abs(r1 - r2)

        # Pre-flop heuristic
        if not community_cards:
            score = (high_rank + low_rank) / 28.0  # 0.14 to 1.0
            if is_pair:
                score += 0.35 + (high_rank / 28.0) * 0.2
            if is_suited:
                score += 0.08
            if diff <= 2:
                score += 0.06  # Connectedness
            return min(1.0, max(0.05, score))

        # Post-flop exact evaluation
        all_card_objs = [Card(c['suit'], c['rank']) for c in hole_cards + community_cards]
        score, tiebreakers, desc, best_5 = evaluate_best_hand(all_card_objs)
        # Score 0 (High Card) to 9 (Royal Flush)
        normalized = 0.15 + (score / 9.0) * 0.85
        return min(1.0, max(0.1, normalized))

    def decide_action(self, game_state: Dict[str, Any], player_id: str) -> Tuple[str, int]:
        """
        Calculates action ('fold', 'check', 'call', 'raise') and raise amount.
        """
        players = game_state.get('players', [])
        player = next((p for p in players if p['id'] == player_id), None)
        if not player or player.get('folded') or player.get('is_all_in'):
            return 'fold', 0

        hole_cards = player.get('cards', [])
        community_cards = game_state.get('community_cards', [])
        pot = max(1, game_state.get('pot', 0))
        current_high_bet = game_state.get('current_high_bet', 0)
        player_bet = player.get('current_bet', 0)
        call_needed = current_high_bet - player_bet
        chips = player.get('chips', 0)
        big_blind = game_state.get('big_blind', 20)
        min_raise = game_state.get('min_raise', big_blind)

        # 1. Strength & Odds
        strength = self.evaluate_hand_strength(hole_cards, community_cards)
        pot_odds = call_needed / (pot + call_needed) if call_needed > 0 else 0.0

        # 2. Personality Factors
        aggression = self.profile['aggression']
        bluff_rate = self.profile['bluff_rate']
        tightness = self.profile['tightness']
        min_call = self.profile['min_call_threshold']

        is_bluff = (random.random() < bluff_rate)
        effective_strength = strength + (0.35 if is_bluff else 0.0)

        # 3. Decision Matrix
        if call_needed == 0:
            # Free to check
            # Decide if bot should bet/raise
            raise_chance = 0.45 * aggression if effective_strength > 0.6 else (0.15 * aggression if effective_strength > 0.4 else 0.0)
            if is_bluff:
                raise_chance = 0.35 * aggression

            if random.random() < raise_chance and chips > min_raise:
                raise_size = max(min_raise, int(big_blind * (1 + effective_strength * 2)))
                raise_size = min(raise_size, chips)
                return 'raise', raise_size
            return 'check', 0

        else:
            # Must Call, Raise, or Fold
            # Very strong hand -> consider raising
            if effective_strength > 0.75 and random.random() < (0.55 * aggression) and chips > call_needed + min_raise:
                raise_size = max(min_raise, int(call_needed + big_blind * 2 * aggression))
                raise_size = min(raise_size, chips - call_needed)
                return 'raise', raise_size

            # If call is small (e.g. blinds preflop)
            if call_needed <= big_blind and effective_strength >= min_call:
                return 'call', 0

            # Pot odds and strength test
            if effective_strength >= pot_odds or (effective_strength >= min_call and call_needed <= chips * 0.25):
                return 'call', 0

            # Weak hand facing bet -> Fold
            return 'fold', 0
