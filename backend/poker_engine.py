"""
Complete Texas Hold'em Poker Game Engine
Manages table state, players, chips, blinds, actions, rounds, pots, and dynamic seating.
"""
import random
from typing import List, Dict, Tuple, Optional, Any
from poker_evaluator import Card, evaluate_best_hand, SUITS

class Deck:
    """Standard 52-card poker deck."""
    def __init__(self):
        self.cards: List[Card] = [Card(suit, rank) for suit in SUITS for rank in range(2, 15)]
        self.shuffle()

    def shuffle(self):
        random.shuffle(self.cards)

    def draw(self, count: int = 1) -> List[Card]:
        drawn = []
        for _ in range(count):
            if self.cards:
                drawn.append(self.cards.pop())
        return drawn


class Player:
    """Represents a player at the poker table."""
    def __init__(self, player_id: str, name: str, chips: int = 1000, is_ai: bool = False, avatar: str = "hero", seat_idx: int = 0):
        self.id = player_id
        self.name = name
        self.chips = chips
        self.hand: List[Card] = []
        self.current_bet = 0          # Bet in current betting round
        self.total_bet_in_hand = 0    # Total chips put in for the whole hand
        self.folded = False
        self.is_all_in = False
        self.is_ai = is_ai
        self.avatar = avatar
        self.seat_idx = seat_idx
        self.last_action = ""

    def reset_for_hand(self):
        self.hand = []
        self.current_bet = 0
        self.total_bet_in_hand = 0
        self.folded = (self.chips <= 0)
        self.is_all_in = False
        self.last_action = "" if self.chips > 0 else "Out of Chips"

    def reset_for_round(self):
        self.current_bet = 0
        if not self.folded and not self.is_all_in:
            self.last_action = ""

    def to_dict(self, reveal_cards: bool = False) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'chips': self.chips,
            'seat_idx': self.seat_idx,
            'current_bet': self.current_bet,
            'total_bet_in_hand': self.total_bet_in_hand,
            'folded': self.folded,
            'is_all_in': self.is_all_in,
            'is_ai': self.is_ai,
            'avatar': self.avatar,
            'last_action': self.last_action,
            'cards': [c.to_dict() for c in self.hand] if (reveal_cards or not self.is_ai) else []
        }


class PokerEngine:
    """
    Standard No-Limit Texas Hold'em Engine with dynamic 4-seat positioning.
    Handles round transitions, betting sequences, pot calculations, and showdowns.
    """
    def __init__(self, small_blind: int = 10, big_blind: int = 20):
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.players: List[Player] = []
        self.deck = Deck()
        self.community_cards: List[Card] = []
        self.pot = 0
        self.current_high_bet = 0
        self.min_raise = big_blind
        self.last_raise_diff = big_blind
        self.button_idx = 0
        self.current_player_idx = 0
        self.stage = 'WAITING'  # WAITING, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN, ENDED
        self.action_history: List[str] = []
        self.winners_info: List[Dict[str, Any]] = []
        self.hand_in_progress = False
        self.hero_seat_idx = 0

    def add_player(self, player: Player):
        player.seat_idx = len(self.players)
        self.players.append(player)

    def set_hero_seat(self, seat_idx: int) -> bool:
        """
        Arranges the 4 seats so Hero is positioned at seat_idx (0..3).
        Only allowed when hand is not in progress.
        """
        if self.hand_in_progress and self.stage not in ['WAITING', 'SHOWDOWN', 'ENDED']:
            return False

        seat_idx = max(0, min(3, int(seat_idx)))
        self.hero_seat_idx = seat_idx

        # Standard roster
        hero = next((p for p in self.players if p.id == 'p_human'), None)
        alex = next((p for p in self.players if p.id == 'bot_alex'), None)
        bella = next((p for p in self.players if p.id == 'bot_bella'), None)
        charlie = next((p for p in self.players if p.id == 'bot_charlie'), None)

        if not (hero and alex and bella and charlie):
            return False

        bots = [alex, bella, charlie]
        new_roster: List[Optional[Player]] = [None, None, None, None]
        new_roster[seat_idx] = hero

        bot_i = 0
        for i in range(4):
            if new_roster[i] is None:
                new_roster[i] = bots[bot_i]
                bot_i += 1

        for idx, p in enumerate(new_roster):
            if p:
                p.seat_idx = idx

        self.players = [p for p in new_roster if p is not None]
        return True

    def start_new_hand(self) -> bool:
        # Automatically reload any players who are out of chips to keep the 4-player table active
        for p in self.players:
            if p.chips <= 0:
                p.chips = 1000
                self.action_history.append(f"💰 {p.name} reloaded $1,000 chips!")

        self.deck = Deck()
        self.community_cards = []
        self.pot = 0
        self.action_history = []
        self.winners_info = []
        self.hand_in_progress = True

        for p in self.players:
            p.reset_for_hand()

        # Advance dealer button to next active player
        self.button_idx = self._next_player_with_chips(self.button_idx)

        # Deal 2 cards to each player with chips
        for _ in range(2):
            for p in self.players:
                if p.chips > 0:
                    p.hand.extend(self.deck.draw(1))

        # Determine SB and BB positions
        num_players = len([p for p in self.players if p.chips > 0])
        if num_players == 2:
            sb_idx = self.button_idx
            bb_idx = self._next_player_with_chips(sb_idx)
        else:
            sb_idx = self._next_player_with_chips(self.button_idx)
            bb_idx = self._next_player_with_chips(sb_idx)

        sb_player = self.players[sb_idx]
        bb_player = self.players[bb_idx]

        sb_amount = min(self.small_blind, sb_player.chips)
        bb_amount = min(self.big_blind, bb_player.chips)

        self._place_bet(sb_player, sb_amount, "Small Blind")
        self._place_bet(bb_player, bb_amount, "Big Blind")

        self.current_high_bet = max(sb_amount, bb_amount)
        self.last_raise_diff = self.big_blind
        self.min_raise = self.big_blind

        # Preflop action starts at UTG (player after BB)
        self.current_player_idx = self._next_player_to_act(bb_idx)
        self.stage = 'PREFLOP'

        self.action_history.append(
            f"🔥 New Hand Started! {sb_player.name} SB ${sb_amount}, {bb_player.name} BB ${bb_amount}."
        )

        self._check_all_in_fast_forward()
        return True

    def _next_player_with_chips(self, current_idx: int) -> int:
        n = len(self.players)
        idx = (current_idx + 1) % n
        for _ in range(n):
            if self.players[idx].chips > 0:
                return idx
            idx = (idx + 1) % n
        return current_idx

    def _next_player_to_act(self, current_idx: int) -> int:
        n = len(self.players)
        idx = (current_idx + 1) % n
        for _ in range(n):
            p = self.players[idx]
            if not p.folded and not p.is_all_in and p.chips > 0:
                return idx
            idx = (idx + 1) % n
        return current_idx

    def _place_bet(self, player: Player, amount: int, action_tag: str = ""):
        actual_bet = min(amount, player.chips)
        player.chips -= actual_bet
        player.current_bet += actual_bet
        player.total_bet_in_hand += actual_bet
        self.pot += actual_bet

        if player.chips == 0:
            player.is_all_in = True

        if action_tag:
            player.last_action = action_tag

    def execute_action(self, player_id: str, action: str, raise_amount: int = 0) -> Tuple[bool, str]:
        if self.stage in ['WAITING', 'SHOWDOWN', 'ENDED']:
            return False, "Hand is not currently in progress."

        current_p = self.players[self.current_player_idx]
        if current_p.id != player_id:
            return False, f"Not {player_id}'s turn! Current turn is {current_p.id} ({current_p.name})."

        if current_p.folded or current_p.is_all_in:
            self.current_player_idx = self._next_player_to_act(self.current_player_idx)
            return False, "Player is folded or already all-in."

        call_needed = self.current_high_bet - current_p.current_bet
        action = action.lower().strip()

        if action == 'fold':
            current_p.folded = True
            current_p.last_action = "Fold"
            self.action_history.append(f"{current_p.name} folded.")

        elif action == 'check':
            if call_needed > 0:
                return False, f"Cannot check, must call ${call_needed} or fold."
            current_p.last_action = "Check"
            self.action_history.append(f"{current_p.name} checked.")

        elif action == 'call':
            if call_needed <= 0:
                current_p.last_action = "Check"
                self.action_history.append(f"{current_p.name} checked.")
            else:
                call_amount = min(call_needed, current_p.chips)
                tag = f"All-In ${call_amount}" if current_p.chips <= call_needed else f"Call ${call_amount}"
                self._place_bet(current_p, call_amount, tag)
                self.action_history.append(f"{current_p.name} {tag.lower()}.")

        elif action == 'raise':
            if raise_amount >= self.current_high_bet + self.min_raise:
                target_bet = raise_amount
            else:
                target_bet = self.current_high_bet + max(raise_amount, self.min_raise)

            chips_to_add = target_bet - current_p.current_bet

            if chips_to_add >= current_p.chips:
                actual_add = current_p.chips
                target_bet = current_p.current_bet + actual_add
                raise_diff = target_bet - self.current_high_bet
                self._place_bet(current_p, actual_add, f"All-In ${target_bet}")
                self.action_history.append(f"{current_p.name} went All-In for ${target_bet}!")
                if target_bet > self.current_high_bet:
                    if raise_diff >= self.min_raise:
                        self.last_raise_diff = raise_diff
                        self.min_raise = raise_diff
                    self.current_high_bet = target_bet
            else:
                raise_diff = target_bet - self.current_high_bet
                self._place_bet(current_p, chips_to_add, f"Raise to ${target_bet}")
                self.action_history.append(f"{current_p.name} raised to ${target_bet}.")
                self.last_raise_diff = max(self.big_blind, raise_diff)
                self.min_raise = self.last_raise_diff
                self.current_high_bet = target_bet

        else:
            return False, f"Unknown action: {action}"

        active_unfolded = [p for p in self.players if not p.folded and (p.chips > 0 or p.total_bet_in_hand > 0)]
        if len(active_unfolded) <= 1:
            self._handle_single_winner(active_unfolded[0] if active_unfolded else self.players[0])
            return True, "Hand concluded (all others folded)."

        if self._is_betting_round_complete():
            self._advance_stage()
        else:
            self.current_player_idx = self._next_player_to_act(self.current_player_idx)

        return True, "Action completed."

    def _is_betting_round_complete(self) -> bool:
        active = [p for p in self.players if not p.folded and (p.chips > 0 or p.total_bet_in_hand > 0)]
        if len(active) <= 1:
            return True

        capable = [p for p in active if not p.is_all_in and p.chips > 0]
        if len(capable) == 0:
            return True

        if len(capable) == 1:
            c = capable[0]
            if c.current_bet == self.current_high_bet and c.last_action:
                return True

        for p in capable:
            if not p.last_action or p.current_bet < self.current_high_bet:
                return False

        return True

    def _advance_stage(self):
        for p in self.players:
            p.reset_for_round()

        self.current_high_bet = 0
        self.min_raise = self.big_blind
        self.last_raise_diff = self.big_blind

        active_unfolded = [p for p in self.players if not p.folded and (p.chips > 0 or p.total_bet_in_hand > 0)]
        if len(active_unfolded) <= 1:
            self._handle_single_winner(active_unfolded[0] if active_unfolded else self.players[0])
            return

        if self.stage == 'PREFLOP':
            self.stage = 'FLOP'
            self.community_cards.extend(self.deck.draw(3))
            self.action_history.append(f"Dealer dealt the FLOP: {' '.join(str(c) for c in self.community_cards)}")
        elif self.stage == 'FLOP':
            self.stage = 'TURN'
            self.community_cards.extend(self.deck.draw(1))
            self.action_history.append(f"Dealer dealt the TURN: {self.community_cards[-1]}")
        elif self.stage == 'TURN':
            self.stage = 'RIVER'
            self.community_cards.extend(self.deck.draw(1))
            self.action_history.append(f"Dealer dealt the RIVER: {self.community_cards[-1]}")
        elif self.stage == 'RIVER':
            self.stage = 'SHOWDOWN'
            self._handle_showdown(active_unfolded)
            return

        if self._check_all_in_fast_forward():
            return

        self.current_player_idx = self._next_player_to_act(self.button_idx)

    def _check_all_in_fast_forward(self) -> bool:
        active = [p for p in self.players if not p.folded and (p.chips > 0 or p.total_bet_in_hand > 0)]
        capable = [p for p in active if not p.is_all_in and p.chips > 0]

        if len(active) >= 2 and len(capable) <= 1:
            if len(capable) == 1:
                c = capable[0]
                if c.current_bet < self.current_high_bet:
                    return False

            while len(self.community_cards) < 5:
                if len(self.community_cards) == 0:
                    self.community_cards.extend(self.deck.draw(3))
                else:
                    self.community_cards.extend(self.deck.draw(1))
            self.stage = 'SHOWDOWN'
            self._handle_showdown(active)
            return True
        return False

    def _handle_single_winner(self, winner: Player):
        self.stage = 'SHOWDOWN'
        self.hand_in_progress = False
        winner.chips += self.pot
        self.winners_info = [{
            'player_id': winner.id,
            'name': winner.name,
            'win_amount': self.pot,
            'hand_name': 'Everyone else folded',
            'best_cards': [c.to_dict() for c in winner.hand]
        }]
        self.action_history.append(f"🏆 {winner.name} wins the pot of ${self.pot} (opponents folded)!")

    def _handle_showdown(self, active_players: List[Player]):
        self.stage = 'SHOWDOWN'
        self.hand_in_progress = False

        if len(active_players) == 1:
            self._handle_single_winner(active_players[0])
            return

        evals = []
        for p in active_players:
            score, tiebreakers, desc, best_5 = evaluate_best_hand(p.hand + self.community_cards)
            evals.append({
                'player': p,
                'score_tuple': (score, tiebreakers),
                'hand_name': desc,
                'best_cards': best_5
            })

        evals.sort(key=lambda x: x['score_tuple'], reverse=True)
        top_score = evals[0]['score_tuple']

        top_winners = [e for e in evals if e['score_tuple'] == top_score]
        share = self.pot // len(top_winners)
        remainder = self.pot % len(top_winners)

        self.winners_info = []
        for i, w in enumerate(top_winners):
            win_amt = share + (1 if i < remainder else 0)
            w['player'].chips += win_amt
            self.winners_info.append({
                'player_id': w['player'].id,
                'name': w['player'].name,
                'win_amount': win_amt,
                'hand_name': w['hand_name'],
                'best_cards': [c.to_dict() for c in w['best_cards']]
            })
            self.action_history.append(f"🏆 {w['player'].name} wins ${win_amt} with {w['hand_name']}!")

    def get_state(self, current_player_id: Optional[str] = "p_human") -> Dict[str, Any]:
        show_all = (self.stage == 'SHOWDOWN')
        curr_p = self.players[self.current_player_idx] if self.players else None

        return {
            'stage': self.stage,
            'pot': self.pot,
            'current_high_bet': self.current_high_bet,
            'min_raise': self.min_raise,
            'small_blind': self.small_blind,
            'big_blind': self.big_blind,
            'button_idx': self.button_idx,
            'current_player_idx': self.current_player_idx,
            'current_player_id': curr_p.id if curr_p else "",
            'hero_seat_idx': self.hero_seat_idx,
            'community_cards': [c.to_dict() for c in self.community_cards],
            'players': [
                p.to_dict(reveal_cards=(show_all or p.id == current_player_id))
                for p in self.players
            ],
            'action_history': self.action_history[-15:],
            'winners_info': self.winners_info,
            'hand_in_progress': self.hand_in_progress
        }
