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
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });

  socket.on('chat message', (data) => {
    $('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
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

  socket.on('assign roles', (data) => {
    $('.pos-border-rdy').removeClass('pos-border-rdy').addClass('pos-border');

    // Clear up open positions on board
    for (let i=0; i < 8; i++) {
      if ($(`#pos${i}`).text() == '') {
        $(`#pos${i}`).css({ 'background': 'rgb(128, 94, 0)' });
        $(`#pos${i}`).css({ 'border': 'rgb(128, 94, 0)' });
      }
    }
    for (let i = 0; i < data.players.length; i++) {

      // Announce and mark the sheriff
      if (data.players[i].role == 'sheriff') {
        $('#num-users').text(data.players[i].name + ' is the Sheriff.');
        $(`#pos${i}`).removeClass('pos-border').addClass('pos-border-sheriff');
        $('#announce-turn').text(data.players[i].name + "'s turn.")
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
    $('#dice-area').html('');
    $('#reroll-form').addClass('hide');
    for(let i=0; i < data.dice.length; i++) {
      $('#dice-area').prepend(`<img id="die-${i}" class="dice ${data.dice[i]}" src="/public/images/${data.dice[i]}.png" />`)
    }
    if (socket.id == data.roller) {
      let reRolls = 2;
      let toReroll = 0;
      let countDynamites = 0;
      let countArrows = 0;
      let countGatling = 0;
      let selectedPos = new Set();
      for (let i=0; i < 5; i++) {
        if ($(`#die-${i}`).hasClass('arrow')) {
          countArrows++;
        }
        if ($(`#die-${i}`).hasClass('gatling')) {
          countGatling++;
        }
        if ($(`#die-${i}`).is('.bang1, .bang2, .beer')) {
          $(`#die-${i}`).draggable(({ revert: 'invalid', containment: '.board' }));
          $(`#die-${i}`).draggable('enable');

          // Set droppables for beer
          if ($(`#die-${i}`).hasClass('beer')) {
            for (let i=0; i < data.players.length; i++) {
              $(`#pos${i}`).droppable({
                accept: '.beer',
                drop: function (event, ui) {
                  if (!$(this).hasClass('drop-beer')) {
                    $(this).addClass('drop-beer');
                  }
                },
                over: function (event, ui) {
                  $(this).css('background-color', 'rgb(68, 65, 65)');
                }
              })
            }
          
          // Set droppables for bang1
          } else if ($(`#die-${i}`).hasClass('bang1')) {
            let bang1Arr = data.players.filter(player =>  {

              // Expanding the array to cover edge cases. (ex. When 6 players (0 - 5), player in position 0 can shoot player in position 5)
              let expandedArr = data.players.concat(data.players);
              if (data.playerPos <= data.players.length / 2) {
                if (expandedArr[data.players.length + data.playerPos - 1] == player || expandedArr[data.players.length + data.playerPos + 1] == player) {
                  return player;
                }
              } else {
                if (expandedArr[data.playerPos - 1] == player || expandedArr[data.playerPos + 1] == player) {
                  return player;
                }
              }
            });
            let names = data.players.map(player => player.name);
            for (let i=0; i < bang1Arr.length; i++) {
              $(`#pos${names.indexOf(bang1Arr[i].name)}`).droppable({
                accept: '.bang1',
                drop: function (event, ui) {
                  if (!$(this).hasClass('drop-bang')) {
                    $(this).addClass('drop-bang');
                  }
                },
                over: function (event, ui) {
                  $(this).css('background-color', 'rgb(68, 65, 65)');
                }
              })
            }

          // Set droppables for bang2
          } else {
            let bang2Arr = data.players.filter(player => {

              // Expanding the array to cover edge cases. (ex. When 6 players (0 - 5), player in position 1 can shoot player in position 5)
              let expandedArr = data.players.concat(data.players);
              if (data.playerPos <= data.players.length / 2) {
                if (expandedArr[data.players.length + data.playerPos - 2] == player || expandedArr[data.players.length + data.playerPos + 2] == player) {
                  return player;
                }
              } else {
                if (expandedArr[data.playerPos - 2] == player || expandedArr[data.playerPos + 2] == player) {
                  return player;
                }
              }
            });
            let names = data.players.map(player => player.name);
            for (let i = 0; i < bang2Arr.length; i++) {
              $(`#pos${names.indexOf(bang2Arr[i].name)}`).droppable({
                accept: '.bang2',
                drop: function (event, ui) {
                  if (!$(this).hasClass('drop-bang')) {
                    $(this).addClass('drop-bang');
                  }
                },
                over: function (event, ui) {
                  $(this).css('background-color', 'rgb(68, 65, 65)');
                }
              })
            }
          }
        }
        if ($(`#die-${i}`).hasClass('dynamite')) {
          countDynamites++;
          continue;
        }
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
            if (reRolls > 0 && toReroll > 0) {
              $('#reroll-form').removeClass('hide');
              $('#dice-num').text(toReroll);
              $('#reroll-form').off();
              $('#reroll-form').submit(() => {
                $('#dice-num').text('');
                $('#reroll-form').addClass('hide');
                $('.select').remove();
                let id = $('#room-id').text();
                let diceNum = toReroll;
                toReroll = 0;
                socket.emit('1st reroll', { id, diceNum, dicePositions: [...selectedPos], roller: data.roller });
                return false;
              })
            }
          }
        })
      }

      // No rerolls left if dynamite is triggered
      if (countDynamites > 2) {
        reRolls = 0;
      }

      // Trigger gatling gun and lose arrows
      if (countGatling > 2) {
        data.players = data.players.map(player => {
          if (socket.id != player.socketId) {
            player.health--;
          }
          return player;
        })
        countArrows = 0;
      }

    }
  })

  socket.on('1st reroll', (data) => {
    console.log(data)
    for (let i = 0; i < 5; i++) {
      if (data.dicePos.indexOf(i) != -1) {
        $(`#die-${i}`).remove();
      }
    }
    for (let i = 0; i < data.dice.length; i++) {
      $('#dice-area').prepend(`<img id="die-${data.dicePos[i]}" class="dice ${data.dice[i]}" src="/public/images/${data.dice[i]}.png" />`)
    }
    $('.dice').off();
    if (socket.id == data.roller) {
      let reRolls = 1;
      let toReroll = 0;
      let countDynamites = 0;
      let countArrows = 0;
      let countGatling = 0;
      let selectedPos = new Set();
      for (let i = 0; i < 5; i++) {
        if ($(`#die-${i}`).hasClass('arrow')) {
          countArrows++;
        }
        if ($(`#die-${i}`).hasClass('gatling')) {
          countGatling++;
        }
        if ($(`#die-${i}`).hasClass('dynamite')) {
          countDynamites++;
          continue;
        }
        $(`#die-${i}`).click(() => {
          if ($(`#die-${i}`).hasClass('select')) {
            $(`#die-${i}`).removeClass('select');
            selectedPos.delete(i);
            toReroll--;
            $('#dice-num').text(toReroll);
            if (reRolls == 0 || toReroll == 0) {
              $('#reroll-form').addClass('hide');
            }
          } else {
            $(`#die-${i}`).addClass('select');
            selectedPos.add(i);
            toReroll++;
            if (reRolls > 0 && toReroll > 0) {
              $('#reroll-form').removeClass('hide');
              $('#dice-num').text(toReroll);
              $('#reroll-form').off();
              $('#reroll-form').submit(() => {
                $('#dice-num').text('');
                $('#reroll-form').addClass('hide');
                $('.select').remove();
                let id = $('#room-id').text();
                let diceNum = toReroll;
                toReroll = 0;
                socket.emit('2nd reroll', { id, diceNum, dicePositions: [...selectedPos], roller: data.roller })
                return false;
              })
            }
          }
        })
      }
    }
  })

  socket.on('2nd reroll', (data) => {
    for (let i = 0; i < 5; i++) {
      if (data.dicePos.indexOf(i) != -1) {
        $(`#die-${i}`).remove();
      }
    }
    for (let i = 0; i < data.dice.length; i++) {
      $('#dice-area').prepend(`<img id="die-${data.dicePos[i]}" class="dice ${data.dice[i]}" src="/public/images/${data.dice[i]}.png" />`);
    }
    $('.dice').off();
    if (socket.id == data.roller) {
      let countDynamites = 0;
      let countArrows = 0;
      let countGatling = 0;
      for (let i = 0; i < 5; i++) {
        if ($(`#die-${i}`).hasClass('arrow')) {
          countArrows++;
        }
        if ($(`#die-${i}`).hasClass('gatling')) {
          countGatling++;
        }
        if ($(`#die-${i}`).hasClass('dynamite')) {
          countDynamites++;
          continue;
        }
        
      }
    }
    
  })

});
