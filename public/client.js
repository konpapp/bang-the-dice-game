$(document).ready(function () {
  /* Global io */
  let socket = io();
  
  socket.on('disconnect', () => {
    alert('User already exists or room is full. Disconnected from server.');
    window.location = "/"; 
  });

  socket.on('user', (data) => {
    $('#room-id').text(data.roomId);
    $('#rdy-form').removeClass('hide').addClass('show');
    $('.pos-border, .pos-border-rdy').text('');
    $('.pos-border-rdy').removeClass('pos-border-rdy').addClass('pos-border');
    for (let i = 0; i < data.users.length; i++) {
      $(`#pos${i}`).text(data.users[i]);

      // Ready check
      if (data.readyUsers) {
        for (let i=0; i < data.readyUsers.length; i++) {
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
    for (let i = 0; i < data.players.length; i++) {
      if (data.players[i].role == 'sheriff') {
        $('#num-users').text(data.players[i].name + ' is the Sheriff.');
      }
    }
  })

});
