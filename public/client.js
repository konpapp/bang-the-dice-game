$(document).ready(function () {
  /* Global io */
  let socket = io();
  
  socket.on('disconnect', () => {
    alert('User already exists or room is full. Disconnected from server.');
    window.location = "/"; 
  });

  socket.on('user', (data) => {
    $('#announce').text('');
    $('#room-id').text(data.roomId);
    $('#rdy-form').removeClass('hide').addClass('show');
    $('.pos-border, .pos-border-rdy').text('');
    $('.pos-border-rdy').removeClass('pos-border-rdy').addClass('pos-border');
    for (let i = 0; i < data.users.length; i++) {
      $(`#pos${i}`).text(data.users[i]);

      // Ready check
      if (data.readyUsers) {
        let usernames = data.readyUsers.map(elem => elem[1]);
        if (usernames.indexOf(data.users[i]) != -1) {
          $(`#pos${i}`).removeClass('pos-border').addClass('pos-border-rdy');
        }
      }
    }

    // Toggle text for users online
    if (data.users.length === 1) {
      $('#num-users').text('1 user online');
    } else { $('#num-users').text(data.users.length + ' users online'); }

    // Announce new user on chat
    let message = data.name + (data.connected ? ' has joined the chat.' : ' has left the chat.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>').addClass('rounded-pill'));
  });

  socket.on('chat message', (data) => {
    $('#messages').append($('<li>').html(`<b>${data.name}</b>: ${data.message}`).addClass('rounded'));
  });

  socket.on('ready button', (data) => {
    if ($(`#pos${data.posNum}`).hasClass("pos-border")) {
      $(`#pos${data.posNum}`).removeClass('pos-border').addClass('pos-border-rdy');
    } else {
      $(`#pos${data.posNum}`).removeClass('pos-border-rdy').addClass('pos-border');
    }
  })

  // Form submittion with new message in field with id 'm'
  $('#msg-form').submit(function () {
    let messageToSend = $('#m').val();
    // Send message to server here?
    socket.emit('chat message', messageToSend);
    $('#m').val('');
    return false; // Prevent form submit from refreshing page
  });

  $('#rdy-form').submit(function () {
    let id = $('#room-id').text();
    socket.emit('ready button', id);
    return false;
  })

  // Start the game
  socket.on('start game', (data) => {
    if (socket.id == data.creatorId) {
      $('#start-form').removeClass('hide').addClass('show');
    }
    $('#rdy-form').removeClass('show').addClass('hide')
    $('#start-form').submit(function () {
      $('#start-form').removeClass('show').addClass('hide');
      let id = $('#room-id').text();
      socket.emit('assign roles', id);
      return false;
    })
  })
  $('#announce-turn').text("Sheriff plays first.");

  socket.on('assign roles', (data) => {
    $('.pos-border-rdy').removeClass('pos-border-rdy').addClass('pos-border');

    // Clear up open positions on board
    for (let i=0; i < 8; i++) {
      if ($(`#pos${i}`).text() == '') {
        $(`#pos${i}`).css({ 'background': '' });
        $(`#pos${i}`).css({ 'border': 'none' });
      }
    }
    
    // Assign arrows
    for (let z = 0; z < 9; z++) {
      $('#arrow-area').prepend(`<img id="arrow-${z}" class="img-arrow" src="/public/images/indian_arrow.png" />`);
    }
    for (let i = 0; i < data.players.length; i++) {

      // Assign portraits
      $(`#pos${i}`).css('background-image', `url('/public/images/chars/${data.players[i].char}.jpg')`);

      // Assign health points
      for (let j = 0; j < data.players[i].health; j++) {
        $(`#health${i}`).prepend(`<img id="health${i}-${j}" class="img-bullet" src="/public/images/bullet.png" />`);
      }

      // Announce and mark the sheriff
      if (data.players[i].role == 'sheriff') {
        $('#num-users').text(data.players[i].name + ' is the Sheriff.');
        $(`#pos${i}`).removeClass('pos-border').addClass('pos-border-sheriff');
      }

      // Assign each role privately
      if (data.players[i].socketId == socket.id) {
        switch (data.players[i].role) {
          case 'sheriff':
            $('#announce').text('You are the sheriff. Survive by eliminating outlaws and renegades!');
            $('#roll-form').removeClass('hide').addClass('show');
            $('#roll-form').submit(function () {
              $('#roll-form').removeClass('show').addClass('hide');
              let id = $('#room-id').text();
              let diceNum = 5;
              let roller = data.players[i].socketId;
              socket.emit('start turn', { id, diceNum, roller, playerPos: i });
              return false;
            })
            break;
          case 'deputy':
            $('#announce').text('You are a deputy. Keep your sheriff alive by eliminating outlaws and renegades!');
            break;
          case 'outlaw':
            $('#announce').text('You are an outlaw. Kill the sheriff!');
            break;
          case 'renegade':
            $('#announce').text('You are a renegade. Survive to the end alone with the sheriff, and eliminate him!');
            break;
        }
      }
    }
  })

  socket.on('start turn', (data) => {
    let id = $('#room-id').text();
    $('#dice-area, .pos-health').html('');
    $('#reroll-form, #end-turn-form').removeClass('show').addClass('hide');
    for (let i=0; i < data.players.length; i++) {
      for (let j=0; j < data.players[i].health; j++) {
        $(`#health${i}`).prepend(`<img id="health${i}-${j}" class="img-bullet" src="/public/images/bullet.png" />`)
      }
    }
    for (let i=0; i < data.dice.length; i++) {
      $('#dice-area').prepend(`<img id="die-${i}" class="dice ${data.dice[i]}" src="/public/images/dice/${data.dice[i]}.jpg" />`);
      if (data.arrowIndices && data.arrowIndices.includes(i)) {
        $(`#die-${i}`).addClass('used');
      }
    }
    if (socket.id == data.roller) {
      let reRolls = 2;
      let toReroll = 0;
      let usableDice = 0;
      let countDynamites = 0;
      let countArrows = 0;
      let countGatling = 0;
      let alivePlayers = data.players.filter(player => player.alive).map(player => player.name);

      // Helper sets to store droppable positions
      let beerPositions = new Set();
      let bang1Positions = new Set();
      let bang2Positions = new Set();
      let selectedPos = new Set();
      for (let i=0; i < data.dice.length; i++) {
        if ($(`#die-${i}`).hasClass('arrow') && !$(`#die-${i}`).hasClass('used')) {
          countArrows++;
        }
        if ($(`#die-${i}`).hasClass('gatling')) {
          countGatling++;
        }
        if ($(`#die-${i}`).is('.bang1, .bang2, .beer')) {
          usableDice++;

          // Set draggable dice
          $(`#die-${i}`).draggable(({ revert: 'invalid', containment: '.board' }));
          $(`#die-${i}`).draggable('enable');

          // Set droppables
          if ($(`#die-${i}`).hasClass('beer')) {
            for (let i = 0; i < alivePlayers.length; i++) {
              beerPositions.add(alivePlayers[i]);
            }
          } else if ($(`#die-${i}`).hasClass('bang1')) {
            let bang1Arr = alivePlayers.filter(player =>  {

              // Expanding the array to cover edge cases (ex. When 6 players (0 - 5), player in position 0 can shoot player in position 5).
              let expandedArr = alivePlayers.concat(alivePlayers);
              if ((expandedArr[alivePlayers.length + data.playerPos - 1] == player || expandedArr[data.playerPos + 1] == player) && expandedArr[data.playerPos] != player) {
                return player;
              }
            });
            for (let i=0; i < bang1Arr.length; i++) {
              bang1Positions.add(bang1Arr[i]);
            }
          } else {
            let bang2Arr = alivePlayers.filter(player => {

              // Expanding the array to cover edge cases (ex. When 6 players (0 - 5), player in position 1 can shoot player in position 5).
              let expandedArr = alivePlayers.concat(alivePlayers);

              // If only 2 players, use as bang1
              if (alivePlayers.length == 2) {
                if ((expandedArr[alivePlayers.length + data.playerPos - 1] == player || expandedArr[data.playerPos + 1] == player) && expandedArr[data.playerPos] != player) {
                  return player;
                }
              } else {
                if ((expandedArr[alivePlayers.length + data.playerPos - 2] == player || expandedArr[data.playerPos + 2] == player) && expandedArr[data.playerPos] != player) {
                  return player;
                }
              }
            });
            for (let i = 0; i < bang2Arr.length; i++) {
              bang2Positions.add(bang2Arr[i]);
            }
          }
        }
        if ($(`#die-${i}`).hasClass('dynamite')) {
          countDynamites++;
          continue;
        }

        // Click on dice to reroll
        if ((!data.reRolls && data.reRolls != 0) || data.reRolls > 0) {
          $(`#die-${i}`).click(() => {
            if ($(`#die-${i}`).hasClass('select')) {
              $(`#die-${i}`).removeClass('select');
              selectedPos.delete(i);
              toReroll--;
              if ($(`#die-${i}`).is('.bang1, .bang2, .beer')) {
                $(`#die-${i}`).draggable('enable');
              }
              $('#dice-num').text(toReroll);
              if (reRolls == 0 || toReroll == 0) {
                $('#reroll-form').addClass('hide');
              }
            } else {
              if ($(`#die-${i}`).is('.bang1, .bang2, .beer')) {
                $(`#die-${i}`).draggable();
                $(`#die-${i}`).draggable('disable');
              }
              $(`#die-${i}`).addClass('select');
              selectedPos.add(i);
              toReroll++;
              if (toReroll > 0) {
                $('#reroll-form').removeClass('hide');
                $('#dice-num').text(toReroll);
                $('#reroll-form').off();
                $('#reroll-form').submit(() => {
                  $('#dice-num').text('');
                  $('#reroll-form').addClass('hide');
                  toReroll = 0;

                  // Adjust selected positions
                  let dicePositions = [...selectedPos];
                  let corr;
                  for (let i = 0; i < dicePositions.length; i++) {
                    corr = 0;
                    for (let j = 0; j < dicePositions[i]; j++) {
                      if (!$(`#die-${j}`).length) {
                        corr++;
                      }
                    }
                    dicePositions[i] -= corr;
                  }
                  $('.select').remove();
                  socket.emit('start turn', { 
                    id,
                    playerPos: data.playerPos,
                    reRolls: data.reRolls,
                    dicePositions,
                    roller: data.roller,
                    currentDice: data.dice
                  });
                  return false;
                })
              }
            }
          })
        }
      }

      // Assign droppable positions
      for (let i=0; i < data.players.length; i++) {
        let name = $(`#pos${i}`).text();
        if ([...beerPositions].includes(name) || [...bang1Positions].includes(name) || [...bang2Positions].includes(name)) {
          $(`#pos${i}`).droppable({
            drop: function (event, ui) {
              $(this).css('background-color', '');
              $(this).css('opacity', '');
              let id = $('#room-id').text();
              usableDice--;
              if ($(ui.draggable).hasClass('beer')) {
                for (let i=0; i < data.dice.length; i++) {
                  if (data.dice[i] == 'beer') {
                    data.dice.splice(i, 1);
                  }
                }
                $(ui.draggable).remove();
                socket.emit('gain health', { id, playerPos: i });
              } else {
                if ($(ui.draggable).hasClass('bang1')) {
                  for (let i = 0; i < data.dice.length; i++) {
                    if (data.dice[i] == 'bang1') {
                      data.dice.splice(i, 1);
                    }
                  }
                } else {
                  for (let i = 0; i < data.dice.length; i++) {
                    if (data.dice[i] == 'bang2') {
                      data.dice.splice(i, 1);
                    }
                  }
                }
                $(ui.draggable).remove();
                socket.emit('lose health', { id, playerPos: i, dmgType: 'bang' });
              }
              if (usableDice == 0) {
                $('#end-turn-form').addClass('show');
              }
            },
            over: function (event, ui) {
              $(this).css('background-color', 'rgb(68, 65, 65)');
              $(this).css('opacity', '0.4');
            },
            out: function (event, ui) {
              $(this).css('background-color', '');
              $(this).css('opacity', '');
            }
          })
          let acceptArr = [];
          if ([...beerPositions].indexOf(name) != -1) {
            acceptArr.push('.beer');
          }
          if ([...bang1Positions].indexOf(name) != -1) {
            acceptArr.push('.bang1');
          }
          if ([...bang2Positions].indexOf(name) != -1) {
            acceptArr.push('.bang2');
          }
          $(`#pos${i}`).droppable({ accept: acceptArr.join(',') });
        }
      }

      // No rerolls left if dynamite is triggered
      if (countDynamites > 2) {
        reRolls = 0;
      }

      // Trigger gatling gun and lose arrows
      if (countGatling > 2) {
        
      }

      if (countArrows > 0) {

        // Count remaining arrows in the middle
        let arrowCount = 0;
        for (let j = 0; j < 9; j++) {
          if ($(`#arrow-${j}`).length) { arrowCount++; }
        }
        socket.emit('get arrow', { pos: data.playerPos, id, arrowCount, arrowsHit: countArrows, roller: data.roller });
      }

      if (reRolls == 0 || usableDice <= 0) {
        $('#end-turn-form').removeClass('hide').addClass('show');
      }

      $('#end-turn-form').off();
      $('#end-turn-form').click(endTurn(data.players));
    }
  })

  function endTurn(players) {
    $('#end-turn-form').submit(function () {
      $('#end-turn-form').removeClass('show').addClass('hide');
      data.currentDice = '';
      let id = $('#room-id').text();
      let diceNum = 5;
      let roller, playerPos;
      let alivePlayers = [];
      for (let i = 0; i < players.length; i++) {
        if ($(`#health${i}`).html() != '') {
          alivePlayers.push(players[i]);
        }
      }
      for (let i = 0; i < alivePlayers.length; i++) {
        if (alivePlayers[i].socketId == socket.id) {
          roller = alivePlayers.concat(alivePlayers)[i + 1].socketId;
          if (i + 1 >= alivePlayers.length) {
            playerPos = 0;
          } else {
            playerPos = i + 1;
          }
          socket.emit('turn transition', { id, diceNum, roller, playerPos, name: alivePlayers.concat(alivePlayers)[i + 1].name });
        }
      }
      return false;
    })
  }

  socket.on('turn transition', (data) => {
    $('#announce-turn').text(data.name + "'s turn.");
    $('#dice-area').html('');
    if (socket.id == data.roller) {
      $('#roll-form').removeClass('hide').addClass('show');
      $('#roll-form').submit(function () {
        $('#roll-form').removeClass('show').addClass('hide');
        let id = $('#room-id').text();
        socket.emit('start turn', { id, diceNum: 5, roller: data.roller });
        return false;
      })
    }
  })

  socket.on('lose health', (data) => {
    playSound(data.dmgType);
    $(`#health${data.playerPos}-${data.players[data.playerPos].health}`).remove();
  })

  socket.on('gain health', (data) => {
    playSound('beer');
    $(`#health${data.playerPos}`).prepend(`<img id="health${data.playerPos}-${data.players[data.playerPos].health + 1}" class="img-bullet" src="/public/images/bullet.png" />`)
  })

  function playSound(sound) {
    const audio = document.getElementById(`${sound}-sound`);
    audio.pause();
    audio.currentTime = 0;
    audio.play();
  }

  socket.on('player eliminated', (data) => {
    playSound('crow');
    $(`#health${data.playerPos}, #arrow${data.playerPos}`).html('');
    $(`#pos${data.playerPos}`).droppable('destroy').text(data.name).css('background-image', "url('/public/images/tombstone.png')");
    if (data.left <= 3) {
      for (let i=0; i < 5; i++) {
        if ((`#die-${i}`).hasClass('bang2')) {
          (`#die-${i}`).addClass('bang1');
        }
      }
    }
  })

  socket.on('get arrow', (data) => {
    playSound('arrow');
    for (let i=0; i < data.arrowsHit; i++) {
      $(`#arrow-${data.arrowCount - 1 - i}`).remove();
      $(`#arrow${data.pos}`).prepend(`<img class="img-arrow" src="/public/images/indian_arrow.png" />`);
    }
  })

  socket.on('refill arrows', (data) => {
    $('.pos-health, .pos-arrow, #arrow-area').html('');
    for (let i = 0; i < 9; i++) {
      $('#arrow-area').prepend(`<img id="arrow-${i}" class="img-arrow" src="/public/images/indian_arrow.png" />`);
    }
    for (let i = 0; i < data.players.length; i++) {
      for (let j = 0; j < data.players[i].health; j++) {
        $(`#health${i}`).prepend(`<img id="health${i}-${j}" class="img-bullet" src="/public/images/bullet.png" />`);
      }
    }
  })

});
