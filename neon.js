//GAMEPLAN
//Change colors
//add player
//make them move / have board be redrawn
//fog of war
//add game attributes (health, weapon, level)
//place weapons
//add interaction with game Objects
//add 'portal' game object
//tweak game object appearance

gameObject = {};
function getColor(cname) {
	switch (cname) {
		case 'orange': 
			return "#ffa300";
		case 'red': 
			return "#cf0060";
		case 'pink': 
			return "#ff00ff";
		case 'blue': 
			return "#13a8fe";
		case 'black': 
			return "#000117";
		case 'white': 
			return '#FFFFFF';
		default:
			return 'green';
	}
}

window.addEventListener('load', function() {
	let c = document.getElementById('my-canvas')
	let ctx = c.getContext('2d');
	let w = c.getAttribute('width');
	let h = c.getAttribute('height');
	let pixelsPerGameUnit = 10;
	let gameBoard = new GameBoard(w/pixelsPerGameUnit, h/pixelsPerGameUnit, pixelsPerGameUnit);
	gameObject = gameBoard;
	gameBoard.drawEverything(ctx);
	document.addEventListener('keydown', (event)=>pressKey(event, gameBoard));
	requestAnimationFrame(() => eachFrame(gameBoard, ctx));
})

function eachFrame(gameBoard, ctx) {
	// console.log('new frame');
	if (gameBoard.playerMoves[0] === 0 && gameBoard.playerMoves[1] === 0) {
		requestAnimationFrame(() => eachFrame(gameBoard, ctx));
		return;
	}
	gameBoard.drawEverything(ctx)
	requestAnimationFrame(() => eachFrame(gameBoard, ctx));
}

function pressKey(event, gameBoard) {
	let playerSpeed = 1;
	let playerXMove = playerYMove = 0;
	let playerDirection;
	switch (event.keyCode) {
		case 37:
			playerXMove = -playerSpeed;
			playerDirection = 3;
			break;
		case 38:
			playerYMove = -playerSpeed;
			playerDirection = 0;
			break;
		case 39:
			playerXMove = playerSpeed;
			playerDirection = 1;
			break;
		case 40:
			playerYMove = playerSpeed;
			playerDirection = 2;
			break;
	}
	gameBoard.playerMoves = [playerXMove, playerYMove];
	gameBoard.playerDirection = playerDirection;
}

function getGrid(grid) {
	g = [];
	for (let j=0; j<grid.length; j++) {
		g.push(grid.reduce((last, curr)=>last.concat(curr[j]), []).join(''));
	}
	return g.join('\n');
}

function randomPos(xmin, xmax, X) {
	//completely random
	xmin = Math.max(xmin, 0);
	if (X) xmax = Math.min(xmax, X);
	let xpos = Math.floor((xmax - xmin) * Math.random() + xmin);
	return xpos;		
}

class GameBoard {
  constructor(X, Y, ppg) {
    let x, y;
		this.X = X;
		this.Y = Y;
		this.realX = X*ppg;
		this.realY = Y*ppg;
		this.ppg = ppg;
		this.buildEmptyGrid();
		// create rooms
		let roomCount = 20;
    this.rooms = [];
		this.doors = [];
		let newRoom;
		let colorVal=10;
    for (let r=0; r<roomCount; r++) {
			newRoom = new Room(this.grid, this.rooms, this.doors, X, Y, getColor('pink'), ppg);
			if (!newRoom.hasOwnProperty('hasError')) {
				this.rooms.push(newRoom); 
			}
    }
		this.roomCount = this.rooms.length;
		// add monsters
		let monsterCount = 10;
		this.monsters = [];
		for (let m=0; m<monsterCount; m++) {
			this.monsters.push(new Monster(this.grid, this.rooms, this.roomCount, ppg, 100, 15));
		}
		// add random health
		let healthCount = 5;
		this.healthCubes = [];
		for (let h=0; h<healthCount; h++) {
			this.healthCubes.push(new HealthCube(this.grid, this.rooms, this.roomCount, ppg, 10*Math.floor(3*Math.random()+1)));
		}
		// add player
		this.player = new Player(this.grid, this.rooms, this.roomCount, ppg);
		this.playerDirection = 0;
		this.playerMoves = [0, 0];
	}
	buildEmptyGrid() {
		// 0 means empty/wall, 
		// 1 means empty room,
		// 2 means room object
		this.grid = [];
		for (let x=0; x<this.X; x++) {
			this.grid.push(Array(this.Y).fill(0));
		}
	}
	drawEverything(ctx) {
		//background
		ctx.fillStyle = getColor('white');
		ctx.fillRect(0, 0, this.realX, this.realY)
		// rooms
		for (let r=0; r<this.roomCount; r++) {
			this.rooms[r].draw(ctx);
		}
		// doors
		for (let d=0; d<this.doors.length; d++) {
			this.doors[d].draw(ctx);
		}
		// monsters 
		for (let m=0; m<this.monsters.length; m++) {
			this.monsters[m].draw(ctx);
		}
		// health cubes
		for (let h=0; h<this.healthCubes.length; h++) {
			this.healthCubes[h].draw(ctx);
		}
		// player
		this.player.draw(ctx, this.playerMoves, this.playerDirection, this.grid);
	}
}

class Room {
  constructor(grid, rooms, doors, X, Y, color, ppg) {
		let x, y, xdim, ydim, xpos, ypos;
		let roomsLen = rooms.length;
		this.color = color? color: 'blue';
		this.sides = Array(4).fill(true) 	//sides open for connections: top, right, bottom, left 
		if (roomsLen === 0) {
			//first box - don't need to check for conflicts
			xdim = this.randomDim(X);
			ydim = this.randomDim(Y); 
			xpos = randomPos(0, X);
			ypos = randomPos(0, Y);
			this.parent = 'base';
			this.side = 'n/a';
		} else {
			let newStuff, testCount, baseRoomIdx, sideIdx, inBounds, badRoom;
			let testLimit = 20;
			let shouldContinue = false;
			for (testCount=0; testCount<testLimit; testCount++) {
				//try to place this room
				xdim = this.randomDim(X);
				ydim = this.randomDim(Y);
				newStuff = this.pickRoomBranch(grid, rooms, xdim, ydim, X, Y);
				xpos = newStuff[1];
				ypos = newStuff[2];
				sideIdx = newStuff[3];
				baseRoomIdx = newStuff[4];
				inBounds = false;
				badRoom = false;
				// make sure this room has a little bit on the grid, and has no overlaps/touching edges with existing rooms
				for (x=xpos; x<xpos+xdim; x++) {
					if (x<0) continue;
					if (x>=X) break;
					for (y=ypos; y<ypos+ydim; y++) {
						if (y<0) continue;
						if (y>=Y) break;
						inBounds = true;
						if (grid[x][y] === 1) {
							// already open - we can't have overlaps
							badRoom = true;
							break;
						}
					}
					if (badRoom) break;
				}
				if (inBounds && !badRoom) break;
			}
			if (!inBounds || badRoom) {
				// We couldn't find a place to fit our room
				this.hasError = true;
				return;
			} else {
				// We found a place to fit our room!
				doors.push(new Door(newStuff[0][0], newStuff[0][1], ppg, this.color));
				this.parent = baseRoomIdx;
				rooms[baseRoomIdx].sides[sideIdx] = false;
				this.side = sideIdx;
				this.sides[(sideIdx + 2) % 4] = false;
			}
		}
		//register this part of the grid as open
		//  include one extra in every direction to make sure rooms don't directly 'touch'
		for (x=xpos-1; x<X && x<xpos+xdim+1; x++) {
			if (x<0) continue;
			for (y=ypos-1; y<Y && y<ypos+ydim+1; y++) {
				if (y<0) continue;
				grid[x][y] = 1;
			}
		}
		//close sides too close to edge
		if (xpos <= 1) { this.sides[3] = false; }		
		else if (xpos + xdim >= X - 1) { this.sides[1] = false; }
		if (ypos <= 1) { this.sides[0] = false; }
		else if (ypos + ydim >= Y-1) { this.sides[2] = false; }
		//store info for redrawing this box
		this.gamePos = {
			xdim: xdim,
			ydim: ydim,
			xpos: xpos,
			ypos: ypos
		};
		this.realPos = {
			xdim: ppg * xdim,
			ydim: ppg * ydim,
			xpos: ppg * xpos,
			ypos: ppg * ypos
		};
  }
	pickRoomBranch(grid, rooms, xdim, ydim, X, Y) {
		////make our new room to sit next to an existing room
		//pick an existing box (must have available sides)
		let baseRoom, baseRoomSides, basePos, ypos, xpos;
		let r;
		let roomsLen = rooms.length;
		while (true) {
			r = Math.floor(roomsLen * Math.random())
			baseRoom = rooms[r];
			baseRoomSides = baseRoom.sides;
			if (baseRoomSides.filter((a) => {return a}).length > 0) break;
		}
		//pick a side 
		let sideIdx;
		while (true) {
			sideIdx = Math.floor(4 * Math.random());		
			if (baseRoomSides[sideIdx]) break;
		}
		this.side = sideIdx;	//store the side of the parent
		//  pick a space in the side for the door
		//	based on the size of the new room, position it relative to the door
		let door;
		basePos = baseRoom.gamePos;
		switch (sideIdx) {
			case 0:
				door = [randomPos(basePos.xpos, basePos.xpos+basePos.xdim, X), basePos.ypos-1];
				ypos = basePos.ypos - 1 - ydim;
				xpos = randomPos(door[0] - xdim + 1, door[0], X);
				break;
			case 2:
				door = [randomPos(basePos.xpos, basePos.xpos+basePos.xdim, X), basePos.ypos + basePos.ydim];
				ypos = basePos.ypos + basePos.ydim + 1;
				xpos = randomPos(door[0] - xdim + 1, door[0], X);
				break;
			case 1:
				door = [basePos.xpos + basePos.xdim, randomPos(basePos.ypos, basePos.ypos + basePos.ydim)];
				xpos = basePos.xpos + basePos.xdim + 1;
				ypos = randomPos(door[1] - ydim + 1, door[1], Y);
				break;
			case 3:
				door = [basePos.xpos - 1, randomPos(basePos.ypos, basePos.ypos+basePos.ydim)];
				xpos = basePos.xpos - xdim - 1;
				ypos = randomPos(door[1] - ydim + 1, door[1], Y);
				break;
		}
		return [door, xpos, ypos, sideIdx, r];
	}
	randomDim(X) {
		//uses a cube fn to more heavily favor the middle?
		let x6 = X / 6;
		let x43 = x6*8;
		let xdim = Math.floor(x43*Math.pow(Math.random()-0.5, 3) + x6) + 2;
		return xdim;
	}
	draw(ctx) {
		ctx.fillStyle = this.color;
		let p = this.realPos;
		ctx.fillRect(p.xpos, p.ypos, p.xdim, p.ydim);
	}
}

class Door {
	constructor(x, y, ppg, color) {
		this.gamePos = {x:x, y:y};
		this.realPos = {x:x*ppg, y:y*ppg};
		this.ppg = ppg;
		this.color = color;
	}
	draw(ctx) {
		ctx.fillStyle = this.color;
		ctx.fillRect(this.realPos.x, this.realPos.y, this.ppg, this.ppg);
	}
}

class RoomObject { 
	constructor(grid, rooms, roomCount, ppg, color) {
		if (!color) color = 'red';
		this.color = color;
		this.room = rooms[Math.floor(roomCount * Math.random())];	
		let g = this.room.gamePos;
		let X = grid.length;
		let Y = grid[0].length;
		let x, y;
		while (true) {
			x = randomPos(g.xpos, g.xpos + g.xdim, X);
			y = randomPos(g.ypos, g.ypos + g.ydim, Y);
			if (grid[x][y] === 1) break;
		}
		this.gamePos = {x:x, y:y};
		this.realPos = {x:x*ppg, y:y*ppg};
		this.ppg = ppg;
		this.show = true;
		grid[x][y] = 2;
	}
	draw(ctx) {
		if (!this.show) return;
		ctx.fillStyle = this.color;
		ctx.fillRect(this.realPos.x, this.realPos.y, this.ppg, this.ppg);
	}
}

class Monster extends RoomObject{
	constructor(grid, rooms, roomCount, ppg, health, damage) {
		super(grid, rooms, roomCount, ppg, getColor('black'));
		this.health = health;
		this.damage = damage;
	}
}

class Weapon extends RoomObject{
	constructor(grid, rooms, roomCount, ppg, name, damage) {
		super(grid, rooms, roomCount, ppg, getColor('blue'));
		this.name = name; 
		this.damage = damage;
	}
}

class HealthCube extends RoomObject{
	constructor(grid, rooms, roomCount, ppg, health) {
		super(grid, rooms, roomCount, ppg, getColor('orange'));
		this.health = health;
	}
}

class Player extends RoomObject {
	constructor (grid, rooms, roomCount, ppg) {
		super(grid, rooms, roomCount, ppg, getColor('red'));
		this.color2 = getColor('orange');
		this.health = 100;
		this.damage = 5;
		this.level = 1;
		this.weapons = ['thumb paint', 'fine-tip paintbrush', 'extra-wide brush', 'paint roller', 'semi-automatic paintball blaster'];
		this.whichWeapon = 0;
	}
	draw(ctx, moves, direction, grid) {
    //move the player
		if (moves[0]) {
			this.gamePos.x += moves[0]; 
			this.realPos.x += moves[0]*this.ppg;
			moves[0] = 0;
		} else if (moves[1]) {
			this.gamePos.y += moves[1]; 
			this.realPos.y += moves[1]*this.ppg;
			moves[1] = 0;
		}
		//draw big box
		let s3 = this.ppg/3;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.realPos.x, this.realPos.y, this.ppg, this.ppg);
		//draw secondary direction box
    ctx.fillStyle = this.color2;
    switch (direction) {
      case 0:
        ctx.fillRect(this.realPos.x + s3, this.realPos.y, s3, s3);
        break;
      case 1:
        ctx.fillRect(this.realPos.x + 2*s3, this.realPos.y + s3, s3, s3);
        break;
      case 2:
        ctx.fillRect(this.realPos.x + s3, this.realPos.y + 2*s3, s3, s3);
        break;
      case 3:
        ctx.fillRect(this.realPos.x, this.realPos.y + s3, s3, s3);
        break;
		}
	}
}
