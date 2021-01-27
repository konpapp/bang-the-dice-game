# BANG! The Dice Game Online
This is an online adaption of the board game. For an overview of the board game and its rules you can visit [this link](https://www.ultraboardgames.com/bang/dice-game-rules.php).

## Install
To start the application, download the repository and change into the root directory. Then type the following commands:
```
npm install
```
A few parameters need to be specified in the `.env` file before the application can start:  
1.`SESSION_SECRET`: Any personal string  
2.`MONGO_URI`: The app connects to a MongoDB. Paste your personal MONGO_URI, or edit the username and password fields on the draft.

After those are implemented, start the application with:
```
npm start
```

## Create / Join Game
The player can either create or join a game. On a game creation, a random 4-digit ID is generated corresponding to the room. On a new game creation, access may be restricted to people that the Game ID is shared with or allow everyone (create an open game).

To join a game, thep player can either join a random open game or enter a Game ID that has been shared.

## Lobby
A **minimum of 4 players** is required to start a game. Once this minimum number is reached, and all players are ready, the game creator can start the game.

## Preview
![preview gif](https://github.com/gusleak/bang-the-dice-game/blob/master/preview.gif)

## Requirements
Node.js
