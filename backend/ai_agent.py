"""
Advanced AI Poker Agent Decision Engine (High Difficulty)
Implements GTO principles, draw equity calculation, Sklansky-Malmuth hand tiers,
positional awareness, minimum defense frequencies, and personality-based strategy.
"""
import random
from typing import Dict, Any, Tuple, List
from poker_evaluator import Card, evaluate_best_hand

class AIPokerAgent:
    BOT_PROFILES = {
        'alex': {
            'name': 'Alex "The Rogue"',
            'aggression': 1.65,     # Aggressive, high 3-bet frequency, semi-bluffs on draws
            'bluff_rate': 0.24,
            'tightness': 0.30,     # Wide opening range, tests opponents with pressure
            'min_call_threshold': 0.22,
            'trap_rate': 0.15      # Occasionally slowplays monsters to trap aggressive players
        },
        'bella': {
            'name': 'Bella "The Wizard"',
            'aggression': 1.20,     # Balanced GTO-style mathematician
            'bluff_rate': 0.12,
            'tightness': 0.50,     # Strict pot odds, implied odds, outs calculation
            'min_call_threshold': 0.32,
            'trap_rate': 0.25
        },
        'charlie': {
            'name': 'Charlie "The Knight"',
            'aggression': 0.85,     # Disciplined, solid value bettor
            'bluff_rate': 0.05,
            'tightness': 0.68,     # Respects heavy action, punishes bluffs with monster hands
            'min_call_threshold': 0.42,
            'trap_rate': 0.08
        }
    }

    def __init__(self, bot_type: str = 'bella'):
        self.bot_type = bot_type.lower()
        self.profile = self.BOT_PROFILES.get(self.bot_type, self.BOT_PROFILES['bella'])

    def evaluate_preflop_strength(self, c1: Dict[str, Any], c2: Dict[str, Any]) -> float:
        """
        Evaluates preflop hole cards based on Sklansky-Malmuth & Chen formula.
        Returns score from 0.05 (7-2 offsuit) to 1.0 (AA).
        """
        r1, r2 = max(c1['rank'], c2['rank']), min(c1['rank'], c2['rank'])
        is_pair = (r1 == r2)
        is_suited = (c1['suit'] == c2['suit'])
        gap = r1 - r2

        # Base score from highest card
        if is_pair:
            base = max(r1 * 2, 10)
            if r1 >= 10:  # TT - AA (Premium pairs)
                base += 10 + (r1 - 10) * 3
            elif r1 >= 7:  # 77 - 99 (Medium pairs)
                base += 6
        else:
            base = r1
            if r1 == 14 and r2 >= 10:  # AK, AQ, AJ, AT (Premium broadway)
                base += 8
            elif r1 >= 10 and r2 >= 10:  # KQ, KJ, QJ, Q-10, J-10
                base += 5

        # Suited bonus
        if is_suited:
            base += 4 if r1 == 14 else 3

        # Connectedness bonus / gap penalty
        if not is_pair:
            if gap == 1:
                base += 2 if r1 <= 12 else 1  # Suited connectors (e.g. 9-8s, 8-7s)
            elif gap == 2:
                base += 1
            elif gap >= 4:
                base -= 2 if gap == 4 else 4

        # Normalize score between 0.05 and 1.0
        # Chen score max is ~20-25 for AA/KK
        score = base / 26.0
        return min(1.0, max(0.06, score))

    def calculate_draw_equity(self, hole_cards: List[Dict[str, Any]], community_cards: List[Dict[str, Any]]) -> float:
        """
        Calculates draw potential (Flush draws, Open-ended Straight draws, Gutshots) on Flop & Turn.
        """
        if len(community_cards) not in [3, 4]:
            return 0.0

        all_cards = hole_cards + community_cards
        cards_left_to_deal = 2 if len(community_cards) == 3 else 1

        # 1. Flush Draw (4 of same suit)
        suit_counts = {}
        for c in all_cards:
            suit_counts[c['suit']] = suit_counts.get(c['suit'], 0) + 1

        has_flush_draw = any(cnt == 4 for cnt in suit_counts.values())
        flush_outs = 9 if has_flush_draw else 0

        # 2. Straight Draw (4 sequential ranks)
        unique_ranks = sorted(list(set(c['rank'] for c in all_cards)))
        if 14 in unique_ranks:
            unique_ranks.append(1)  # Ace can be low (1)
            unique_ranks.sort()

        straight_outs = 0
        for i in range(len(unique_ranks) - 3):
            sub = unique_ranks[i:i+4]
            span = sub[-1] - sub[0]
            if len(sub) == 4:
                if span == 3:
                    # Open-ended straight draw (e.g. 5-6-7-8, outs = 4 or 9 -> 8 outs)
                    straight_outs = max(straight_outs, 8)
                elif span == 4:
                    # Inside straight / Gutshot (e.g. 5-6-8-9, outs = 7 -> 4 outs)
                    straight_outs = max(straight_outs, 4)

        total_outs = flush_outs + (straight_outs if not has_flush_draw else int(straight_outs * 0.75))

        # Rule of 4 and 2:
        # Flop: Outs * 4% equity. Turn: Outs * 2% equity.
        equity = (total_outs * 0.04) if cards_left_to_deal == 2 else (total_outs * 0.02)
        return min(0.48, equity)

    def evaluate_hand_strength(self, hole_cards: List[Dict[str, Any]], community_cards: List[Dict[str, Any]]) -> float:
        if not hole_cards or len(hole_cards) < 2:
            return 0.20

        # Pre-flop
        if not community_cards:
            return self.evaluate_preflop_strength(hole_cards[0], hole_cards[1])

        # Post-flop
        all_card_objs = [Card(c['suit'], c['rank']) for c in hole_cards + community_cards]
        score, tiebreakers, desc, best_5 = evaluate_best_hand(all_card_objs)

        # Base score from hand rank: 0 (High Card) to 9 (Royal Flush)
        rank_weight = score / 9.0

        # Bonus for high tiebreaker ranks (e.g. Top Pair Ace vs Top Pair Deuce)
        high_tb = tiebreakers[0] / 14.0 if tiebreakers else 0.5
        normalized = 0.12 + rank_weight * 0.76 + high_tb * 0.12

        # Add draw equity on Flop/Turn
        draw_equity = self.calculate_draw_equity(hole_cards, community_cards)
        total_strength = normalized + draw_equity

        return min(1.0, max(0.08, total_strength))

    def decide_action(self, game_state: Dict[str, Any], player_id: str) -> Tuple[str, int]:
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

        # 1. Calculated Strength & Pot Odds
        raw_strength = self.evaluate_hand_strength(hole_cards, community_cards)
        pot_odds = call_needed / (pot + call_needed) if call_needed > 0 else 0.0

        # 2. Bot Profile
        aggression = self.profile['aggression']
        bluff_rate = self.profile['bluff_rate']
        tightness = self.profile['tightness']
        min_call = self.profile['min_call_threshold']
        trap_rate = self.profile.get('trap_rate', 0.1)

        # 3. Semi-Bluffing & Smart Aggression
        is_semi_bluff = (len(community_cards) in [3, 4] and raw_strength > 0.35 and random.random() < bluff_rate * 1.5)
        is_pure_bluff = (random.random() < bluff_rate * 0.6)
        is_bluff = is_semi_bluff or is_pure_bluff

        effective_strength = raw_strength + (0.30 if is_bluff else 0.0)

        # 4. Action Logic
        if call_needed == 0:
            # Free to check or bet
            # If monster hand, occasionally check to trap aggressive players
            if raw_strength > 0.85 and random.random() < trap_rate:
                return 'check', 0

            # Value Bet or Bluff Bet
            should_bet = False
            bet_size = min_raise

            if effective_strength >= 0.70:
                # Strong value bet (60% - 90% pot)
                should_bet = (random.random() < 0.85 * aggression)
                bet_fraction = 0.60 + random.random() * 0.30
                bet_size = max(min_raise, int(pot * bet_fraction))
            elif effective_strength >= 0.50:
                # C-Bet / Medium value bet (40% - 60% pot)
                should_bet = (random.random() < 0.50 * aggression)
                bet_size = max(min_raise, int(pot * 0.50))
            elif is_bluff:
                # Semi-bluff float (50% pot)
                should_bet = (random.random() < 0.40 * aggression)
                bet_size = max(min_raise, int(pot * 0.50))

            if should_bet and chips >= min_raise:
                actual_bet = min(bet_size, chips)
                return 'raise', actual_bet
            return 'check', 0

        else:
            # Facing a bet -> Call, Raise (3-Bet / 4-Bet), or Fold
            # 1. Monster Hands (Sets, Straights, Flushes, Full House) -> Raise/3-bet
            if raw_strength >= 0.80 and chips > call_needed + min_raise:
                if random.random() < 0.75 * aggression:
                    raise_target = current_high_bet + max(min_raise, int(pot * 0.65 * aggression))
                    return 'raise', min(raise_target, chips + player_bet)

            # 2. Semi-bluff raise on strong draws
            if is_semi_bluff and chips > call_needed + min_raise and random.random() < (0.35 * aggression):
                raise_target = current_high_bet + max(min_raise, int(pot * 0.50))
                return 'raise', min(raise_target, chips + player_bet)

            # 3. Small call preflop or small bet relative to pot
            if call_needed <= big_blind and effective_strength >= min_call:
                return 'call', 0

            # 4. Pot Odds vs Required Equity Test (GTO Defense)
            # Add implied odds discount for draws
            draw_discount = 0.08 if len(community_cards) in [3, 4] and raw_strength > 0.35 else 0.0
            required_equity = max(0.15, pot_odds - draw_discount)

            if effective_strength >= required_equity:
                return 'call', 0

            # 5. Weak hand facing high bet -> Disciplined Fold
            return 'fold', 0

