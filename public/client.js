

$(document).ready(function () {
  /* Global io */
  let socket = io();
  
  socket.on('disconnect', function () {
    alert('Existing user. Disconnected from server.');
    window.location = "/"; 
  });
  
  socket.on('max users', (data) => {
    $('#num-users').text(data.message)
    data.connected = false;
  });

  socket.on('user', (data) => {
    $('.pos-border, .pos-border-rdy').text('');
    let counter = 0;
    for (let user in data.loggedUsers) {
      counter++;
      $(`#pos${counter}`).removeClass('pos-border-rdy').addClass('pos-border');
      $(`#pos${counter}`).text(user);
      // Ready check
      if (data.loggedUsers[user]) {
        $(`#pos${counter}`).removeClass('pos-border').addClass('pos-border-rdy');
      }
    }
    if (Object.keys(data.loggedUsers).length === 1) {
      $('#num-users').text('1 user online');
    } else { $('#num-users').text(Object.keys(data.loggedUsers).length + ' users online'); }
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
    let counter = 0;
    let allReady = true;
    for (let user in data.loggedUsers) {
      counter++;
      if (!data.loggedUsers[user]) {
        allReady = false;
        break;
      }
    }
    if (allReady && counter >= 4) {
      $('#num-users').text('Game is starting!');
      socket.emit('start game', data.loggedUsers);
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
    socket.emit('ready button');
    return false;
  })

  // Start the game
  socket.on('start game', (data) => {
    for (let i=0; i < data.players.length; i++) {
      if (data.players[i].role == 'sheriff') {
        $('#num-users').text(data.players[i].name + ' is the Sheriff.');
      }
    }
  })

});
