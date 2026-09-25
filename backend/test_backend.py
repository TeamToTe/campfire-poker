"""
Comprehensive unit and integration test suite for Campfire Poker.
Tests evaluator accuracy, engine state transitions, betting rules, and bot behaviors.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from poker_evaluator import Card, evaluate_5_cards, evaluate_best_hand
from poker_engine import PokerEngine, Player
from ai_agent import AIPokerAgent

def test_evaluator_hierarchy():
    # Royal flush
    rf = [Card('spades', 14), Card('spades', 13), Card('spades', 12), Card('spades', 11), Card('spades', 10)]
    score, _, desc = evaluate_5_cards(rf)
    assert score == 9
    assert "Royal Flush" in desc

    # Straight flush
    sf = [Card('hearts', 9), Card('hearts', 8), Card('hearts', 7), Card('hearts', 6), Card('hearts', 5)]
    score, _, desc = evaluate_5_cards(sf)
    assert score == 8
    assert "Straight Flush" in desc

    # Four of a kind
    quads = [Card('clubs', 10), Card('diamonds', 10), Card('hearts', 10), Card('spades', 10), Card('hearts', 14)]
    score, tb, _ = evaluate_5_cards(quads)
    assert score == 7
    assert tb[0] == 10

    # Full House
    fh = [Card('clubs', 14), Card('diamonds', 14), Card('hearts', 14), Card('spades', 13), Card('hearts', 13)]
    score, tb, _ = evaluate_5_cards(fh)
    assert score == 6
    assert tb == [14, 13]

    # Flush
    fl = [Card('diamonds', 14), Card('diamonds', 10), Card('diamonds', 7), Card('diamonds', 4), Card('diamonds', 2)]
    score, _, _ = evaluate_5_cards(fl)
    assert score == 5

    # Straight (Wheel A-2-3-4-5)
    wheel = [Card('spades', 14), Card('hearts', 2), Card('diamonds', 3), Card('clubs', 4), Card('spades', 5)]
    score, tb, _ = evaluate_5_cards(wheel)
    assert score == 4
    assert tb[0] == 5

    # High card
    hc = [Card('clubs', 14), Card('diamonds', 10), Card('hearts', 7), Card('spades', 4), Card('hearts', 2)]
    score, _, _ = evaluate_5_cards(hc)
    assert score == 0


def test_poker_engine_gameplay():
    engine = PokerEngine(small_blind=10, big_blind=20)
    p0 = Player('p_human', 'Hero', chips=1000, is_ai=False)
    p1 = Player('bot_alex', 'Alex', chips=1000, is_ai=True)
    p2 = Player('bot_bella', 'Bella', chips=1000, is_ai=True)
    p3 = Player('bot_charlie', 'Charlie', chips=1000, is_ai=True)

    engine.add_player(p0)
    engine.add_player(p1)
    engine.add_player(p2)
    engine.add_player(p3)

    # 1. Start Hand
    started = engine.start_new_hand()
    assert started is True
    assert engine.stage == 'PREFLOP'
    assert engine.pot == 30  # SB (10) + BB (20)
    assert len(p0.hand) == 2
    assert len(p1.hand) == 2

    # 2. UTG player makes a move
    utg_idx = engine.current_player_idx
    utg_player = engine.players[utg_idx]
    success, _ = engine.execute_action(utg_player.id, 'call')
    assert success is True

    # 3. Next player folds
    next_p = engine.players[engine.current_player_idx]
    success, _ = engine.execute_action(next_p.id, 'fold')
    assert success is True
    assert next_p.folded is True


def test_ai_agent_decisions():
    agent = AIPokerAgent('alex')
    state = {
        'players': [{'id': 'bot_alex', 'cards': [{'suit': 'spades', 'rank': 14}, {'suit': 'spades', 'rank': 13}], 'chips': 1000, 'current_bet': 0}],
        'community_cards': [],
        'pot': 30,
        'current_high_bet': 20,
        'big_blind': 20,
        'min_raise': 20
    }
    action, raise_amt = agent.decide_action(state, 'bot_alex')
    assert action in ['call', 'raise', 'check']


def test_seat_selection():
    engine = PokerEngine()
    engine.add_player(Player('p_human', 'Hero', chips=1000, is_ai=False))
    engine.add_player(Player('bot_alex', 'Alex', chips=1000, is_ai=True))
    engine.add_player(Player('bot_bella', 'Bella', chips=1000, is_ai=True))
    engine.add_player(Player('bot_charlie', 'Charlie', chips=1000, is_ai=True))

    # Test seat change to North Log (Seat 2)
    success = engine.set_hero_seat(2)
    assert success is True
    assert engine.players[2].id == 'p_human'
    assert engine.players[2].seat_idx == 2
    assert engine.hero_seat_idx == 2


if __name__ == '__main__':
    test_evaluator_hierarchy()
    test_poker_engine_gameplay()
    test_ai_agent_decisions()
    test_seat_selection()
    print("All backend poker unit tests PASSED successfully!")


