let roles = ['sheriff', 'renegade', 'outlaw', 'outlaw'];
let die = ['arrow', 'bang1', 'bang2', 'beer', 'dynamite', 'gatling'];

function shuffle(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

function getRoles(users) {
  switch (users.length) {
    case 5:
      roles.push('deputy');
      break;
    case 6:
      roles.push('deputy');
      roles.push('outlaw');
      break;
    case 7:
      roles.push('deputy');
      roles.push('outlaw');
      roles.push('deputy');
      break;
    case 8:
      roles.push('deputy');
      roles.push('outlaw');
      roles.push('deputy');
      roles.push('renegade');
      break;
  }
  roles = shuffle(roles);
  let players = [];
  let playerObj = {};
  for (let i=0; i < users.length; i++) {
    playerObj.name = users[i];
    playerObj.role = roles[i];
    playerObj.health = 5;
    players.push(Object.assign({}, playerObj));
    if (players[i].role == 'sheriff') {
      ++players[i].health;
    }
  }
  return players;
}

function rollDice(num) {
  let dice = [];
  let roll;
  for (let i=0; i < num; i++) {
    roll = shuffle(die);
    dice.push(roll[0]);
  }
  return dice;
}

exports.getRoles = getRoles;
exports.rollDice = rollDice;