
const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

var clients = [];
var players = [];
var updatedPlayers = [];

wss.on('connection', function(ws) {
	clients.push(ws);

	players.push(new Player());
	
	ws.on('message', function(e) {
		var message = JSON.parse(e);

		if (message.type == 'playerUpdate') {
			if (players[message.info.id]) {
				players[message.info.id].moves = message.info.moves;
				players[message.info.id].updated = true;
			}
		}
// 		if (message.type == 'pong') {
// 			players[message.id].pong = true;
// 			if (message.id == players.length-1) {
// 				console.log("Reached end of players " + message.id);
// 				for (var i=0; i<players.length; i++) {
// 					if (players[i].pong = false) {
// 						clients[i].close();
// 						clients.splice(i, 1);
// 						players.splice(i, 1);
// 					}
// 				}
// 			}
// 		}
		if (message.type == 'close') {
			clients[message.id].close();
			clients.splice(message.id, 1);
			players.splice(message.id, 1);
			
			for (var i=0; i<clients.length; i++) {
				clients[i].send(JSON.stringify({
					type: 'delPlayer',
					id: message.id,
					newId: i
				}));
			}
		}
	});

	//Send new player array of current players
	for (var i=0; i<players.length; i++) {
		ws.send(JSON.stringify({
			type: 'initPlayers',
			info: players[i],
		}));

		ws.send(JSON.stringify({
			type: 'receiveId',
			id: players[players.length-1].id
		}));
	}

	//Send other players new player data
	for (var i=0; i<clients.length-1; i++) {
		clients[i].send(JSON.stringify({
			type: 'newPlayer',
			info: players[players.length-1],
		}));
	}
});


//Run game physics
setInterval(function() {
	for (var i=0; i<players.length; i++) {
		players[i].update();

		clients[i].send(JSON.stringify({
			type: 'playersUpdate',
			players: players
		}));
	}

	for (var i=0; i<players.length && players[i].id!=this.id; i++) {
		for (var j=0; j<players.length && j!=i; j++) {
			var distance = Math.sqrt(((players[i].x - players[j].x) * (players[i].x - players[j].x))+ ((players[i].y - players[j].y) * (players[i].y - players[j].y)));
			if (players.length >= 2 && distance<40) {
				c2c(players[i], players[j]);
			}
		}
	}


},30);


//Check if clients are still there
// setInterval(function() {
// 	for (var i=0; i<players.length; i++) {
// 		players[i].pong = false;
// 		clients[i].send(JSON.stringify({
// 			type: 'ping'
// 		}));
// 	}
// },1000);

function Player() {
	this.x = 200;
	this.velX = Math.random()*2;
	this.y = 200;
	this.velY = Math.random()*2;
	this.id = clients.length-1;
	this.moves = [false, false, false, false];
	this.updated = false;
	this.pong = true;
};

Player.prototype.update = function() {
	this.x += this.velX;
	this.y += this.velY;
	this.velX *= .97;
	this.velY *= .97;

	//Movement
	if (this.moves[0]) {
		this.velY -= .5;
	}
	else if (this.moves[2]) {
		this.velY += .5;
	}
	if (this.moves[1]) {
		this.velX += .5;
	}
	else if (this.moves[3]) {
		this.velX -= .5;
	}

	//Collisions
	if (this.x-10>400 || this.x+10<0) {
		// this.velX = -this.velX*1.1;
		this.x = Math.random()*300+50;
		this.y = Math.random()*300+50;
		this.velX = 0;
		this.velY = 0;
		clients[this.id].send(JSON.stringify({
			type: 'died',
			info: this.id
		}));
	}
	if (this.y-10>400 || this.y+10<0) {
		// this.velY = -this.velY*1.1;
		this.x = Math.random()*300+50;
		this.y = Math.random()*300+50;
		this.velX = 0;
		this.velY = 0;
		clients[this.id].send(JSON.stringify({
			type: 'died',
			info: this.id
		}));

	}
};






//http://jsfiddle.net/inkfood/juzsR/
function c2c(p1, p2) {
	dx = p1.x-p2.x;
    dy = p1.y-p2.y;
    collisionision_angle = Math.atan2(dy, dx);
    p1Mag = Math.sqrt(p1.velX*p1.velX+p1.velY*p1.velY);
    p2Mag = Math.sqrt(p2.velX*p2.velX+p2.velY*p2.velY);
    p1Dir = Math.atan2(p1.velY, p1.velX);
    p2Dir = Math.atan2(p2.velY, p2.velX);
    p1VelX = p1Mag*Math.cos(p1Dir-collisionision_angle);
    p1VelY = p1Mag*Math.sin(p1Dir-collisionision_angle);
    p2VelX = p2Mag*Math.cos(p2Dir-collisionision_angle);
    p2VelY = p2Mag*Math.sin(p2Dir-collisionision_angle);
    final_velX_1 = ((200-200)*p1VelX+(200+200)*p2VelX)/(200+200) * 1.2;
    final_velX_2 = ((200+200)*p1VelX+(200-200)*p2VelX)/(200+200) * 1.2;
    final_velY_1 = p1VelY * 1.2;
    final_velY_2 = p2VelY * 1.2;
    p1.velX = Math.cos(collisionision_angle)*final_velX_1+Math.cos(collisionision_angle+Math.PI/2)*final_velY_1;
    p1.velY = Math.sin(collisionision_angle)*final_velX_1+Math.sin(collisionision_angle+Math.PI/2)*final_velY_1;
    p2.velX = Math.cos(collisionision_angle)*final_velX_2+Math.cos(collisionision_angle+Math.PI/2)*final_velY_2;
    p2.velY = Math.sin(collisionision_angle)*final_velX_2+Math.sin(collisionision_angle+Math.PI/2)*final_velY_2;
    p1.x += p1.velX; 
    p1.y += p1.velY; 
    p2.x += p2.velX; 
    p2.y += p2.velY; 

}


















