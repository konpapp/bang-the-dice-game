$(document).ready(function () {
  /* Global io */
  let socket = io();

  socket.on('max users', (data) => {
    $('#num-users').text(data.message)
    data.connected = false;
  });

  socket.on('user', (data) => {
    $('.pos-border').text('');
    for (let i=0; i < data.loggedUsers.length; i++) {
      $(`#pos${i + 1}`).text(data.loggedUsers[i]);
    }
    if (data.currentUsers === 1) {
      $('#num-users').text(data.currentUsers + ' user online');
    } else { $('#num-users').text(data.currentUsers + ' users online'); }
    let message = data.name + (data.connected ? ' has joined the chat.' : ' has left the chat.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });

  socket.on('chat message', (data) => {
    console.log('socket.on 1');
    $('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
  });

  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    let messageToSend = $('#m').val();
    // Send message to server here?
    socket.emit('chat message', messageToSend);
    $('#m').val('');
    return false; // Prevent form submit from refreshing page
  });
});
