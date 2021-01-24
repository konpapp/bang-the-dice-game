let roles = ['sheriff', 'renegade', 'outlaw', 'outlaw'];
let die = ['arrow', 'bang1', 'bang2', 'beer', 'dynamite', 'gatling'];
let chars = ['bartC', 'blackJ', 'calamityJ', 'elG', 'jesseJ', 'jourdonnais', 'kitC', 'luckyD', 'paulR', 'pedroR', 'roseD', 'sidK', 'slabTK', 'suzyL', 'vultureS', 'willyTK'];

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
    playerObj.arrows = 0;
    playerObj.health = 8;
    playerObj.maxHealth = 8;
    playerObj.alive = true;
    players.push(Object.assign({}, playerObj));
    if (players[i].role == 'sheriff') {
      players[i].health += 2;
      players[i].maxHealth += 2;
    }
  }
  return players;
}

function getChars(users) {
  let characterList = [];
  chars = shuffle(chars);
  for (let i=0; i < users.length; i++) {
    characterList.push(chars[i]);
  }
  return characterList;
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

function winCheck(players) {
  let alivePlayers = players.filter(player => player.alive);
  if (alivePlayers.length === 1 && alivePlayers[0].role == 'renegade') {
    return alivePlayers[0].name + ' wins as Renegade!';
  }
  if (alivePlayers.find(player => player.role == 'sheriff') == undefined) {
    let outlawList = players.filter(player => player.role == 'outlaw').map(player => player.name);
    return outlawList.join(', ') + ' win as Outlaws!';
  }
  if (alivePlayers.find(player => player.role == 'outlaw' || player.role == 'renegade') == undefined) {
    let sheriffName = alivePlayers.filter(player => player.role == 'sheriff')[0].name;
    let deputyList = players.filter(player => player.role == 'deputy').map(player => player.name);
    if (players.length == 6) {
      return sheriffName + ' and ' + deputyList[0] + ' win as Sheriff and Deputy!';
    } else if (players.length == 7) {
      return sheriffName + ', ' + deputyList.join(', ') + ' win as Sheriff and Deputies!';
    } else {
      return sheriffName + ' wins as Sheriff!';
    }
  }
  return false;
}

exports.getRoles = getRoles;
exports.getChars = getChars;
exports.rollDice = rollDice;
exports.winCheck = winCheck;