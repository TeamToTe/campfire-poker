/**
 * Main Application Controller for Campfire Poker - RPG Edition
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Campfire Animated Canvas Scene
  const campfireScene = new CampfireScene('campfire-canvas');

  // 2. DOM Elements
  const serverStatusBadge = document.getElementById('server-status-badge');
  const btnTimeCycle = document.getElementById('btn-time-cycle');
  const btnOpenSeatPicker = document.getElementById('btn-open-seat-picker');
  const btnResetTable = document.getElementById('btn-reset-table');
  const btnAudio = document.getElementById('btn-audio');

  const btnStartHand = document.getElementById('btn-start-hand');
  const btnFold = document.getElementById('btn-fold');
  const btnCheckCall = document.getElementById('btn-check-call');
  const btnRaise = document.getElementById('btn-raise');
  const raiseSlider = document.getElementById('raise-slider');
  const raiseValDisplay = document.getElementById('raise-val-display');

  const btnPresetMin = document.getElementById('btn-preset-min');
  const btnPreset2x = document.getElementById('btn-preset-2x');
  const btnPresetPot = document.getElementById('btn-preset-pot');
  const btnPresetAllin = document.getElementById('btn-preset-allin');

  const potAmountDisplay = document.getElementById('pot-amount');
  const stageBadge = document.getElementById('stage-badge');
  const communityCardsBox = document.getElementById('community-cards-container');
  const handRatingBanner = document.getElementById('hand-rating-banner');
  const flameBarFill = document.getElementById('flame-bar-fill');
  const flamePercent = document.getElementById('flame-percent');

  // Modals
  const modalSeatPicker = document.getElementById('modal-seat-picker');
  const btnConfirmSeatDeal = document.getElementById('btn-confirm-seat-deal');
  const btnCancelSeat = document.getElementById('btn-cancel-seat');
  const seatSpots = document.querySelectorAll('.seat-spot');

  const modalResetTable = document.getElementById('modal-reset-table');
  const btnConfirmReset = document.getElementById('btn-confirm-reset');
  const btnCancelReset = document.getElementById('btn-cancel-reset');

  const winnerOverlay = document.getElementById('winner-overlay');
  const winnerDesc = document.getElementById('winner-desc');
  const btnCloseWinner = document.getElementById('btn-close-winner');
  const logContent = document.getElementById('log-content');

  // 3. Time Cycle Control
  const TIME_PRESETS = [
    { hour: 6.0, label: "Dawn (6:00 AM)" },
    { hour: 12.0, label: "Noon (12:00 PM)" },
    { hour: 18.0, label: "Sunset (6:00 PM)" },
    { hour: 0.0, label: "Midnight (12:00 AM)" }
  ];
  let timePresetIdx = -1;

  if (btnTimeCycle) {
    btnTimeCycle.addEventListener('click', () => {
      timePresetIdx = (timePresetIdx + 1) % TIME_PRESETS.length;
      const preset = TIME_PRESETS[timePresetIdx];
      campfireScene.setTimeOfDay(preset.hour);
      if (window.AudioSynth) window.AudioSynth.playChipStack();
      logMessage(`Time set to ${preset.label}`);
    });
  }

  campfireScene.onTimeUpdate = (formattedTime) => {
    if (btnTimeCycle) {
      btnTimeCycle.innerText = formattedTime;
    }
  };

  const SEAT_NAMES = ["SOUTH", "WEST", "NORTH", "EAST"];
  let selectedSeatIdx = 0;
  let currentState = null;
  let prevStage = null;
  const bubbleTimeouts = {};

  // 4. Character Dialogue Quotes Matrix
  const DIALOGUES = {
    'bot_alex': {
      'fold': ["Not worth my daggers.", "I'll get you next hand!", "Tch, you got lucky."],
      'check': ["Checking... for now.", "Show me what you got.", "Careful step."],
      'call': ["I'll match that!", "Seeing this through.", "Call it is!"],
      'raise': ["All-in or go home!", "Let's spice this up!", "Think you can handle this raise?", "Time to strike!"],
      'win': ["The loot is mine!", "Too easy for a rogue!", "Never challenge my luck!"]
    },
    'bot_bella': {
      'fold': ["Probability is against me.", "A wise retreat.", "The stars advise caution."],
      'check': ["Observing the arcane flow.", "Check.", "Patience reveals all."],
      'call': ["A calculated call.", "Within variance.", "I accept your wager."],
      'raise': ["The arcane cards favor me!", "Raising the stakes.", "92% win expectancy!"],
      'win': ["Just as the spells foretold.", "Wisdom triumphs over brute luck.", "Splendid outcome!"]
    },
    'bot_charlie': {
      'fold': ["Discretion is valor.", "I yield this skirmish.", "Tactical regroup."],
      'check': ["Holding the line.", "Check.", "Steadfast."],
      'call': ["For honor, I call!", "I stand my ground.", "Matched with resolve."],
      'raise': ["Forward march!", "To glory!", "Stand and face my knight's raise!"],
      'win': ["Victory for the realm!", "Honor has prevailed!", "A noble triumph!"]
    },
    'p_human': {
      'fold': ["Fold.", "Live to fight another hand."],
      'check': ["Check."],
      'call': ["I call!"],
      'raise': ["Let's raise it!", "I'm pushing chips!"],
      'win': ["Victory is mine! 👑"]
    }
  };

  function showSpeechBubble(seatIdx, text) {
    const bubble = document.getElementById(`bubble-seat-${seatIdx}`);
    if (!bubble) return;

    bubble.innerText = text;
    bubble.classList.add('show');

    if (bubbleTimeouts[seatIdx]) {
      clearTimeout(bubbleTimeouts[seatIdx]);
    }

    bubbleTimeouts[seatIdx] = setTimeout(() => {
      bubble.classList.remove('show');
    }, 3200);
  }

  function triggerCharacterDialogue(player, action) {
    if (!player) return;
    const quotes = DIALOGUES[player.id] ? DIALOGUES[player.id][action] : null;
    if (quotes && quotes.length > 0) {
      const q = quotes[Math.floor(Math.random() * quotes.length)];
      showSpeechBubble(player.seat_idx, q);
    }
  }

  // 5. Sound Toggle
  btnAudio.addEventListener('click', () => {
    const isMuted = window.AudioSynth.toggleMute();
    btnAudio.innerText = isMuted ? "🔇 SFX: OFF" : "🔊 SFX: ON";
  });

  // 6. Seat Picker Modal Logic
  function openSeatPicker() {
    if (currentState && currentState.hero_seat_idx !== undefined) {
      selectedSeatIdx = currentState.hero_seat_idx;
    }
    updateSeatSpotsUI();
    modalSeatPicker.classList.add('show');
    if (window.AudioSynth) window.AudioSynth.playCardDeal();
  }

  function closeSeatPicker() {
    modalSeatPicker.classList.remove('show');
  }

  function updateSeatSpotsUI() {
    const bots = [
      { name: "ALEX", avatar: "🗡️" },
      { name: "BELLA", avatar: "🧙‍♀️" },
      { name: "CHARLIE", avatar: "🛡️" }
    ];

    let botIdx = 0;
    for (let i = 0; i < 4; i++) {
      const spot = document.getElementById(`seat-card-${i}`);
      const avatarElem = document.getElementById(`avatar-spot-${i}`);
      const badgeElem = document.getElementById(`badge-spot-${i}`);
      if (!spot) continue;

      if (i === selectedSeatIdx) {
        spot.classList.add('active');
        if (avatarElem) avatarElem.innerText = "👑";
        if (badgeElem) badgeElem.innerText = "👑 YOU";
      } else {
        spot.classList.remove('active');
        const b = bots[botIdx % bots.length];
        botIdx++;
        if (avatarElem) avatarElem.innerText = b.avatar;
        if (badgeElem) badgeElem.innerText = b.name;
      }
    }
  }

  btnOpenSeatPicker.addEventListener('click', () => {
    openSeatPicker();
  });

  seatSpots.forEach(spot => {
    spot.addEventListener('click', async () => {
      const sIdx = parseInt(spot.getAttribute('data-seat'), 10);
      selectedSeatIdx = isNaN(sIdx) ? 0 : sIdx;
      updateSeatSpotsUI();
      if (window.AudioSynth) window.AudioSynth.playChipStack();
    });
  });

  btnConfirmSeatDeal.addEventListener('click', async () => {
    closeSeatPicker();
    await window.BackendClient.setSeat(selectedSeatIdx);
    if (window.AudioSynth) window.AudioSynth.playCardDeal();
    await window.BackendClient.startNewHand();
  });

  btnCancelSeat.addEventListener('click', async () => {
    closeSeatPicker();
    if (currentState && currentState.hero_seat_idx !== selectedSeatIdx) {
      await window.BackendClient.setSeat(selectedSeatIdx);
    }
  });

  document.querySelectorAll('.player-seat').forEach(seatElem => {
    seatElem.addEventListener('click', () => {
      if (currentState && (currentState.stage === 'WAITING' || currentState.stage === 'SHOWDOWN')) {
        const sIdx = parseInt(seatElem.getAttribute('data-seat-idx'), 10);
        selectedSeatIdx = isNaN(sIdx) ? 0 : sIdx;
        openSeatPicker();
      }
    });
  });

  // 7. Custom Reset Table Modal Logic
  btnResetTable.addEventListener('click', () => {
    modalResetTable.classList.add('show');
    if (window.AudioSynth) window.AudioSynth.playChipStack();
  });

  btnCancelReset.addEventListener('click', () => {
    modalResetTable.classList.remove('show');
  });

  btnConfirmReset.addEventListener('click', async () => {
    modalResetTable.classList.remove('show');
    if (window.AudioSynth) window.AudioSynth.playChipStack();
    await window.BackendClient.resetTable();
    logMessage("Table reset to default $1,000 per player.");
  });

  [modalSeatPicker, modalResetTable].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });

  // 8. Connect Backend Client
  window.BackendClient.init(
    (state, lastEvent) => onGameStateUpdate(state, lastEvent),
    (isConnected, statusText) => {
      serverStatusBadge.innerText = statusText;
      serverStatusBadge.className = isConnected ? "badge badge-green" : "badge badge-yellow";
    }
  );

  // 9. Raise Slider & Presets
  raiseSlider.addEventListener('input', () => {
    raiseValDisplay.innerText = `$${raiseSlider.value}`;
  });

  btnPresetMin.addEventListener('click', () => {
    if (!currentState) return;
    const minR = currentState.min_raise || 20;
    raiseSlider.value = minR;
    raiseValDisplay.innerText = `$${minR}`;
  });

  btnPreset2x.addEventListener('click', () => {
    if (!currentState) return;
    const highBet = currentState.current_high_bet || 20;
    const minR = currentState.min_raise || 20;
    const target = Math.max(minR, highBet * 2);
    raiseSlider.value = Math.min(target, parseInt(raiseSlider.max, 10));
    raiseValDisplay.innerText = `$${raiseSlider.value}`;
  });

  btnPresetPot.addEventListener('click', () => {
    if (!currentState) return;
    const pot = currentState.pot || 40;
    const minR = currentState.min_raise || 20;
    const target = Math.max(minR, pot);
    raiseSlider.value = Math.min(target, parseInt(raiseSlider.max, 10));
    raiseValDisplay.innerText = `$${raiseSlider.value}`;
  });

  btnPresetAllin.addEventListener('click', () => {
    if (!currentState || !currentState.players) return;
    const hero = currentState.players.find(p => p.id === 'p_human');
    if (hero) {
      raiseSlider.value = hero.chips;
      raiseValDisplay.innerText = `$${hero.chips}`;
      if (window.AudioSynth) window.AudioSynth.playAllIn();
    }
  });

  // 10. Action Button Handlers
  btnStartHand.addEventListener('click', async () => {
    winnerOverlay.classList.remove('show');
    if (currentState && currentState.stage === 'WAITING' && !currentState.hand_in_progress) {
      openSeatPicker();
      return;
    }
    if (window.AudioSynth) window.AudioSynth.playCardDeal();
    await window.BackendClient.startNewHand();
  });

  btnFold.addEventListener('click', async () => {
    if (window.AudioSynth) window.AudioSynth.playFold();
    triggerCharacterDialogue({ id: 'p_human', seat_idx: selectedSeatIdx }, 'fold');
    await window.BackendClient.executeAction('p_human', 'fold');
  });

  btnCheckCall.addEventListener('click', async () => {
    if (!currentState) return;
    const hero = currentState.players ? currentState.players.find(p => p.id === 'p_human') : null;
    if (!hero) return;

    const callNeeded = currentState.current_high_bet - hero.current_bet;
    const action = callNeeded > 0 ? 'call' : 'check';

    if (action === 'call' && window.AudioSynth) {
      window.AudioSynth.playChipStack();
    }

    triggerCharacterDialogue(hero, action);
    await window.BackendClient.executeAction('p_human', action);
  });

  btnRaise.addEventListener('click', async () => {
    const amt = parseInt(raiseSlider.value, 10);
    if (window.AudioSynth) window.AudioSynth.playChipStack();
    const hero = currentState && currentState.players ? currentState.players.find(p => p.id === 'p_human') : null;
    if (hero) triggerCharacterDialogue(hero, 'raise');
    await window.BackendClient.executeAction('p_human', 'raise', amt);
  });

  btnCloseWinner.addEventListener('click', () => {
    winnerOverlay.classList.remove('show');
    btnStartHand.click();
  });

  // 11. Game State UI Renderer
  function onGameStateUpdate(state, lastEvent = "") {
    if (!state) return;
    currentState = state;

    if (lastEvent) {
      logMessage(lastEvent);

      // Trigger dialogues based on event text
      if (state.players) {
        state.players.forEach(p => {
          if (lastEvent.includes(p.name) || lastEvent.includes(p.id)) {
            if (lastEvent.includes('folded')) triggerCharacterDialogue(p, 'fold');
            else if (lastEvent.includes('raise') || lastEvent.includes('All-In')) triggerCharacterDialogue(p, 'raise');
            else if (lastEvent.includes('call')) triggerCharacterDialogue(p, 'call');
            else if (lastEvent.includes('check')) triggerCharacterDialogue(p, 'check');
          }
        });
      }
    }

    if (state.stage !== prevStage && (state.stage === 'FLOP' || state.stage === 'TURN' || state.stage === 'RIVER')) {
      if (window.AudioSynth) window.AudioSynth.playCardDeal();
    }
    prevStage = state.stage;

    stageBadge.innerText = `STAGE: ${state.stage}`;
    potAmountDisplay.innerText = `$${state.pot}`;

    const heroSeat = (state.hero_seat_idx !== undefined) ? state.hero_seat_idx : selectedSeatIdx;
    selectedSeatIdx = heroSeat;
    btnOpenSeatPicker.innerText = `🪑 SEAT: ${SEAT_NAMES[heroSeat] || 'SOUTH'}`;
    btnOpenSeatPicker.disabled = state.hand_in_progress && state.stage !== 'WAITING' && state.stage !== 'SHOWDOWN';

    // Render Community Cards
    communityCardsBox.innerHTML = '';
    if (state.community_cards && state.community_cards.length > 0) {
      state.community_cards.forEach(card => {
        const cardElem = window.SpriteRenderer.createCardElement(card, false);
        communityCardsBox.appendChild(cardElem);
      });
    } else {
      const placeholder = document.createElement('span');
      placeholder.style.fontFamily = "var(--font-retro)";
      placeholder.style.fontSize = "18px";
      placeholder.style.color = "#6B7280";
      placeholder.innerText = "WAITING FOR FLOP...";
      communityCardsBox.appendChild(placeholder);
    }

    // Render 4 Player Seats
    if (state.players) {
      state.players.forEach((p, idx) => {
        const seatIdx = (p.seat_idx !== undefined) ? p.seat_idx : idx;
        const seatElem = document.getElementById(`seat-pos-${seatIdx}`);
        if (!seatElem) return;

        const isTurn = (state.current_player_id === p.id) && state.stage !== 'SHOWDOWN' && state.stage !== 'WAITING';
        if (isTurn) {
          seatElem.classList.add('active-turn');
        } else {
          seatElem.classList.remove('active-turn');
        }

        const nameElem = document.getElementById(`name-seat-${seatIdx}`);
        const chipsElem = document.getElementById(`chips-seat-${seatIdx}`);
        const actionElem = document.getElementById(`action-seat-${seatIdx}`);
        const avatarIconElem = document.getElementById(`avatar-icon-${seatIdx}`);

        const avatarIcons = {
          'hero': '👑',
          'rogue': '🗡️',
          'wizard': '🧙‍♀️',
          'knight': '🛡️'
        };

        if (avatarIconElem) avatarIconElem.innerText = avatarIcons[p.avatar] || (p.is_ai ? '🤖' : '👑');
        if (nameElem) nameElem.innerText = p.name.toUpperCase();
        if (chipsElem) chipsElem.innerText = `$${p.chips}`;

        if (actionElem) {
          if (p.folded) {
            actionElem.innerText = "[ FOLDED ]";
            actionElem.style.color = "#EF4444";
          } else if (p.last_action) {
            actionElem.innerText = `[ ${p.last_action.toUpperCase()} ]`;
            actionElem.style.color = "#FCD34D";
          } else {
            actionElem.innerText = "";
          }
        }

        // Render Player Cards
        const cardsContainer = document.getElementById(`cards-seat-${seatIdx}`);
        if (cardsContainer) {
          cardsContainer.innerHTML = '';
          const revealCards = (p.id === 'p_human') || (state.stage === 'SHOWDOWN');

          if (p.cards && p.cards.length > 0 && (revealCards || !p.is_ai)) {
            p.cards.forEach(c => {
              const cardElem = window.SpriteRenderer.createCardElement(c, false);
              cardsContainer.appendChild(cardElem);
            });
          } else if (!p.folded && (p.chips > 0 || p.total_bet_in_hand > 0) && state.stage !== 'WAITING' && state.hand_in_progress) {
            cardsContainer.appendChild(window.SpriteRenderer.createCardElement(null, true));
            cardsContainer.appendChild(window.SpriteRenderer.createCardElement(null, true));
          }
        }
      });
    }

    // Update Hero Controls
    const hero = state.players ? state.players.find(p => p.id === 'p_human') : null;
    const isHeroTurn = (state.current_player_id === 'p_human') && state.stage !== 'SHOWDOWN' && state.stage !== 'WAITING';

    if (hero) {
      btnFold.disabled = !isHeroTurn;
      btnCheckCall.disabled = !isHeroTurn;
      btnRaise.disabled = !isHeroTurn;

      const callNeeded = state.current_high_bet - hero.current_bet;
      if (callNeeded > 0) {
        if (callNeeded >= hero.chips) {
          btnCheckCall.innerText = `ALL-IN $${hero.chips}`;
          btnCheckCall.className = "btn-pixel btn-red btn-hud";
        } else {
          btnCheckCall.innerText = `CALL $${callNeeded}`;
          btnCheckCall.className = "btn-pixel btn-green btn-hud";
        }
      } else {
        btnCheckCall.innerText = "CHECK";
        btnCheckCall.className = "btn-pixel btn-hud";
      }

      const minR = state.min_raise || 20;
      raiseSlider.min = minR;
      raiseSlider.max = Math.max(minR, hero.chips);
      if (parseInt(raiseSlider.value, 10) < minR) {
        raiseSlider.value = minR;
        raiseValDisplay.innerText = `$${minR}`;
      }
    }

    // Hand Strength Flame Gauge & Rating Banner
    if (hero && hero.cards && hero.cards.length === 2) {
      const allCards = [...hero.cards, ...(state.community_cards || [])];
      const evalRes = evaluateHandStrength(allCards);
      handRatingBanner.innerText = `YOUR HAND: ${evalRes.desc.toUpperCase()}`;
      flameBarFill.style.width = `${evalRes.pct}%`;
      flamePercent.innerText = `${evalRes.pct}%`;
    } else {
      handRatingBanner.innerText = "YOUR HAND: CHOOSE SEAT & DEAL TO BEGIN";
      flameBarFill.style.width = "10%";
      flamePercent.innerText = "10%";
    }

    // Deal Hand button status
    if (state.stage === 'SHOWDOWN' || state.stage === 'WAITING' || !state.hand_in_progress) {
      btnStartHand.innerText = "🔥 DEAL HAND";
      btnStartHand.disabled = false;
    } else {
      btnStartHand.innerText = "HAND IN PROGRESS";
      btnStartHand.disabled = true;
    }

    // Show Winner Overlay & Trigger Win Fanfare
    if (state.stage === 'SHOWDOWN' && state.winners_info && state.winners_info.length > 0) {
      const w = state.winners_info[0];
      winnerDesc.innerText = `${w.name} wins $${w.win_amount} with ${w.hand_name}!`;
      winnerOverlay.classList.add('show');
      if (window.AudioSynth) window.AudioSynth.playWinFanfare();

      const winningPlayer = state.players ? state.players.find(p => p.id === w.player_id) : null;
      if (winningPlayer) triggerCharacterDialogue(winningPlayer, 'win');
    }
  }

  // Hand Strength & Flame Gauge Evaluator
  function evaluateHandStrength(cards) {
    if (!cards || cards.length === 0) return { desc: "No Cards", pct: 10 };
    const rankNames = { 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
    const suitSyms = { 'clubs': 'C', 'spades': 'S', 'hearts': 'H', 'diamonds': 'D' };

    if (cards.length === 2) {
      const r1 = cards[0].rank, r2 = cards[1].rank;
      const n1 = rankNames[r1] || String(r1);
      const n2 = rankNames[r2] || String(r2);
      const s1 = suitSyms[cards[0].suit] || '';
      const s2 = suitSyms[cards[1].suit] || '';
      if (r1 === r2) {
        const pct = 35 + Math.floor((r1 / 14) * 25);
        return { desc: `Pocket Pair of ${n1}s (${n1}${s1}, ${n2}${s2})`, pct };
      }
      const highR = Math.max(r1, r2);
      const pct = 15 + Math.floor((highR / 14) * 15);
      return { desc: `Hole Cards (${n1}${s1}, ${n2}${s2})`, pct };
    }

    const counts = {};
    const suits = {};
    cards.forEach(c => {
      counts[c.rank] = (counts[c.rank] || 0) + 1;
      suits[c.suit] = (suits[c.suit] || 0) + 1;
    });

    const isFlush = Object.values(suits).some(cnt => cnt >= 5);
    const sortedCounts = Object.values(counts).sort((a, b) => b - a);

    if (sortedCounts[0] >= 4) return { desc: "Four of a Kind", pct: 95 };
    if (sortedCounts[0] >= 3 && sortedCounts[1] >= 2) return { desc: "Full House", pct: 90 };
    if (isFlush) return { desc: "Flush", pct: 82 };
    if (sortedCounts[0] >= 3) return { desc: "Three of a Kind", pct: 70 };
    if (sortedCounts[0] >= 2 && sortedCounts[1] >= 2) return { desc: "Two Pair", pct: 55 };
    if (sortedCounts[0] >= 2) return { desc: "One Pair", pct: 35 };
    return { desc: "High Card", pct: 20 };
  }

  function logMessage(msg) {
    const entry = document.createElement('div');
    entry.className = msg.includes('wins') ? 'log-entry highlight' : 'log-entry';
    entry.innerText = `> ${msg}`;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
  }

  logMessage("Campfire Poker RPG Edition initialized. Welcome to the campfire!");
});
