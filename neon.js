//GAMEPLAN
//XX Change colors
//XX add player
//XX make them move / have board be redrawn
//XX fog of war
//XX display game attributes
//XX add game attributes (health, weapon, level)
//XX place weapons
//XX add interaction with game Objects
//XX switch colors around
//XX die correctly
//XX add 'portal' game object
//XX add boss man
//XX add victory
//	 take out old stuff
//	 play tune a little bit

gameObject = {};
function getColor(cname) {
	switch (cname) {
		case 'orange': 
			return "#ffa300";
		case 'red': 
			return "#cf0060";
		case 'green':
			return "#39FF14"
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

window.addEventListener('load', newEverything);

function newEverything() {
	document.removeEventListener('keydown', newEverything);
	let c = document.getElementById('my-canvas')
	let ctx = c.getContext('2d');
	let w = c.getAttribute('width');
	let h = c.getAttribute('height')-70;
	let pixelsPerGameUnit = 10;
	let gameBoard = new GameBoard(w/pixelsPerGameUnit, h/pixelsPerGameUnit, pixelsPerGameUnit, ctx);
	gameObject = gameBoard;
	gameBoard.drawFoggy(ctx);
	gameBoard.pressKey = function(event) {
		if (gameBoard.player.state !== 'normal') {
			document.removeEventListener('keydown', gameBoard.pressKey);
			return;
		}
		pressKey(event, gameBoard);
	};
	document.addEventListener('keydown', gameBoard.pressKey);
	requestAnimationFrame(() => eachFrame(gameBoard, ctx));
}

function eachFrame(gameBoard, ctx) {
	// console.log('new frame');
	if (gameBoard.player.state !== 'normal') return; 
	if (gameBoard.playerMoves[0] === 0 && gameBoard.playerMoves[1] === 0) {
		requestAnimationFrame(() => eachFrame(gameBoard, ctx));
		return;
	}
	gameBoard.drawFoggy(ctx)
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

function randomPos(xmin, xmax, X) {
	//completely random
	xmin = Math.max(xmin, 0);
	if (X) xmax = Math.min(xmax, X);
	let xpos = Math.floor((xmax - xmin) * Math.random() + xmin);
	return xpos;		
}

class GameBoard {
  constructor(X, Y, ppg, ctx) {
    let x, y;
		this.X = X;
		this.Y = Y;
		this.realX = X*ppg;
		this.realY = Y*ppg;
		this.ppg = ppg;
		this.pressKey = '';
		this.buildEmptyGrid();
		this.levelSetup = {
			1: [20, 14, [6, 10, 12], [20, 25, 30], 8, [15, 20], 2, 1],
			2: [20, 20, [10, 15, 20], [25, 28, 31], 10, [15, 20], 2, 0],
			3: [23, 25, [50, 70, 100], [100, 110, 130], 10, [20, 25], 2, 0],
			4: [23, 25, [75, 150, 160], [100, 130, 160], 3, [30], 1, true]
		}
		this.fillWithObjects.apply(this, this.levelSetup[1]);
		// add player
		this.player = new Player(this.grid, this.rooms, this.roomCount, ppg);
		this.playerDirection = 0;
		this.playerMoves = [0, 0];
		// draw the info pane
		ctx.fillStyle = getColor('black');
		ctx.fillRect(0, this.realY, this.realX, 70);
		let xblock = this.realX / 18;
		let yblock = this.realY + 20;
		this.stops = [1*xblock, 3*xblock, 7*xblock, 9*xblock, 14*xblock];
		ctx.fillStyle = getColor('orange');
		ctx.font = '20px Arial';
		ctx.fillText('Level', this.stops[0], yblock)
		ctx.fillText('XP to Next Level', this.stops[1], yblock);
		ctx.fillText('Lumens', this.stops[2], yblock);
		ctx.fillText('Weapon', this.stops[3], yblock);
		ctx.fillText('Which Dungeon', this.stops[4], yblock);
	}
	buildEmptyGrid() {
		// -1 means room border
		// 0 means empty/wall, 
		// 1 means empty room,
		// 2 means monster
		// 3 means health
		// 4 means weapon
		this.grid = [];
		for (let x=0; x<this.X; x++) {
			this.grid.push(Array(this.Y).fill(0));
		}
	}
	fillWithObjects(roomCount, monsterCount, monsterDamages, monsterHealths, healthCount, healthVals, weaponCount, boss) {
		// create rooms
    this.rooms = [];
		this.doors = [];
		let newRoom;
    for (let r=0; r<roomCount; r++) {
			newRoom = new Room(this.grid, this.rooms, this.doors, this.X, this.Y, getColor('pink'), this.ppg);
			if (!newRoom.hasOwnProperty('hasError')) this.rooms.push(newRoom);
    }
		this.roomCount = this.rooms.length;
		// add portal
		if (boss) {
			//making a boss
			this.boss = new Boss(this.grid, this.rooms, this.roomCount, this.ppg);
		} else {
			//making a portal
			this.portal = new Portal(this.grid, this.rooms, this.roomCount, this.ppg);
		}
		// add monsters
		this.monsters = [];
		let whichHealth, whichDamage;
		for (let m=0; m<monsterCount; m++) {
			whichHealth = monsterHealths[Math.floor(monsterHealths.length * Math.random())];
			whichDamage = monsterDamages[Math.floor(monsterDamages.length * Math.random())];
			this.monsters.push(new Monster(this.grid, this.rooms, this.roomCount, this.ppg, whichHealth, whichDamage));
		}
		// add random health
		this.healthCubes = [];
		let healthVal;
		for (let h=0; h<healthCount; h++) {
			healthVal = healthVals[Math.floor(healthVals.length*Math.random())];
			this.healthCubes.push(new HealthCube(this.grid, this.rooms, this.roomCount, this.ppg, healthVal));
		}
		// add weapons
		this.weapons = [];
		for (let w=0; w<weaponCount; w++) {
			this.weapons.push(new Weapon(this.grid, this.rooms, this.roomCount, this.ppg));
		}
	}
	drawFoggy(ctx) {
		//blackout
		if (this.player.move(this.playerMoves, this.playerDirection, this.grid)) {
			//move to the next level
			this.buildEmptyGrid();
			this.fillWithObjects.apply(this, this.levelSetup[this.player.whichDungeon]);
			this.player.respawn(this.grid, this.rooms, this.roomCount);
		}
		ctx.fillStyle = getColor('black');
		ctx.fillRect(0, 0, this.realX, this.realY);
		let px = this.player.gamePos.x;
		let py = this.player.gamePos.y;
		let dist=this.player.fogDist;
		let dist2 = dist*dist;
		let x, y;
		for (x=Math.max(px-dist, 0); x<=px + dist; x++) {
			if (x >= this.X) continue;
			for (y=Math.max(py - dist, 0); y<=py + dist; y++) {
				if (y >= this.Y) continue;
				if (Math.pow(x-px, 2) + Math.pow(y-py, 2) > dist2) continue;
				ctx.fillStyle = this.translateCellColor(x, y);
				ctx.fillRect(x*this.ppg, y*this.ppg, this.ppg, this.ppg);
			}
		}
		this.player.draw(ctx, this.realX, this.realY, this.stops);
	}
	translateCellColor(x, y) {
		let g = this.grid[x][y];
		if (g === -1 || g === 0) return getColor('green');
		if (g === 1) return getColor('pink');		//room open cell
		return g.color;
	}
}

class Room {
  constructor(grid, rooms, doors, X, Y, color, ppg) {
		let x, y, xdim, ydim, xpos, ypos, newDoor;
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
						if (grid[x][y] !== 0) {
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
				newDoor = new Door(newStuff[0][0], newStuff[0][1], ppg, this.color, grid);
				doors.push(newDoor);
				this.parent = baseRoomIdx;
				rooms[baseRoomIdx].sides[sideIdx] = false;
				this.side = sideIdx;
				this.sides[(sideIdx + 2) % 4] = false;
			}
		}
		//register this part of the grid as open
		//  include one extra in every direction to make sure rooms don't directly 'touch'
		let newVal = 1;
		for (x=xpos-1; x<X && x<xpos+xdim+1; x++) {
			if (x<0) continue;
			for (y=ypos-1; y<Y && y<ypos+ydim+1; y++) {
				if (y<0) continue;
				grid[x][y] = (x==xpos-1 || x==xpos+xdim || y==ypos-1 || y==ypos+ydim)? -1: 1;
			}
		}
		if (newDoor) grid[newDoor.gamePos.x][newDoor.gamePos.y] = 1;
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
				door = [basePos.xpos + basePos.xdim, randomPos(basePos.ypos, basePos.ypos + basePos.ydim, Y)];
				xpos = basePos.xpos + basePos.xdim + 1;
				ypos = randomPos(door[1] - ydim + 1, door[1], Y);
				break;
			case 3:
				door = [basePos.xpos - 1, randomPos(basePos.ypos, basePos.ypos+basePos.ydim, Y)];
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
}

class Door {
	constructor(x, y, ppg, color, grid) {
		this.gamePos = {x:x, y:y};
		this.realPos = {x:x*ppg, y:y*ppg};
		this.ppg = ppg;
		this.color = color;
		grid[x][y] = 1;
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
		grid[x][y] = this;
	}
	interact(player, grid) {}
}

class Monster extends RoomObject{
	constructor(grid, rooms, roomCount, ppg, health, damage) {
		super(grid, rooms, roomCount, ppg, getColor('black'));
		this.health = health;
		this.damage = damage;
		this.cellType = 2;
	}
	interact(player, grid) {
		this.health -= player.damage;
		if (this.health <= 0) {
			grid[this.gamePos.x][this.gamePos.y] = 1;
			player.addXP(Math.pow(2*this.damage, 2) + 4*this.health);
		} else {
			player.loseHealth(this.damage);
		}
	}
}

class Boss {
	constructor(grid, rooms, roomCount, ppg) {
		let g;
		while (true) {
			this.room = rooms[Math.floor(roomCount * Math.random())];
			g = this.room.gamePos;
			if (g.xdim > 3 && g.ydim > 3) break;
		}
		let X = grid.length;
		let Y = grid[0].length;
		let x, y;
		while (true) {
			x = randomPos(g.xpos, g.xpos + g.xdim, X);
			y = randomPos(g.ypos, g.ypos + g.ydim, Y);
			if (grid[x][y]===1 && grid[x-1][y]===1 && grid[x-1][y-1]===1 && grid[x][y-1]) break;
		}
		this.gamePos = {x:x, y:y};
		this.realPos = {x:x*ppg, y:y*ppg};
		this.ppg = ppg;
		grid[x][y] = this;
		grid[x-1][y] = this;
		grid[x-1][y-1] = this;
		grid[x][y-1] = this;
		this.color = getColor('black');
		this.health = 2000;
		this.damage = 200;
		this.cellType = 5;
	}
	interact(player, grid) {
		this.health -= player.damage;
		if (this.health <= 0) {
			//you win
			player.state = 'win';
		} else {
			player.loseHealth(this.damage);
		}
	}
}

class HealthCube extends RoomObject{
	constructor(grid, rooms, roomCount, ppg, health) {
		super(grid, rooms, roomCount, ppg, getColor('orange'));
		this.health = health;
		this.cellType = 3;
	}
	interact(player, grid) {
		// eat the health
		grid[this.gamePos.x][this.gamePos.y] = 1;
		player.health += this.health;
		player.addXP(100);
	}
}

class Weapon extends RoomObject{
	constructor(grid, rooms, roomCount, ppg) {
		super(grid, rooms, roomCount, ppg, getColor('blue'));
		this.cellType = 4;
	}
	interact(player, grid) {
		grid[this.gamePos.x][this.gamePos.y] = 1;
		player.whichWeapon += 1;
		player.addXP(100 * player.whichWeapon);
		player.damage += Math.min(150, player.damage);
	}
}

class Portal extends RoomObject{
	constructor(grid, rooms, roomCount, ppg) {
		super(grid, rooms, roomCount, ppg, getColor('red'));
		this.cellType = 5;
	}
	interact(player, grid) {
		player.whichDungeon += 1;
		return true;
	}
}

class Player extends RoomObject {
	constructor (grid, rooms, roomCount, ppg) {
		super(grid, rooms, roomCount, ppg, getColor('red'), 1);
		grid[this.gamePos.x][this.gamePos.y] = 1;
		this.X = grid.length;
		this.Y = grid[0].length;
		this.color2 = getColor('orange');
		this.health = 100;
		this.damage = 5;
		this.level = 1;
		this.weapons = [
			'Thumb Paint', 
			'Fine-tip Paintbrush', 
			'Extra-wide Brush', 
			'Paint Roller', 
			'Paint Bucket',
			'Paintball Blaster',
			'Massive Paint Bomb'
			];
		this.whichWeapon = 0;
		this.fogDist = 5;
		this.direction = 0;
		this.xp = 0;
		this.xpBuckets = [0, 1000, 2500, 5000, 9000, 16000, 25000, 50000, 100000];
		this.whichDungeon = 1;
		this.state = 'normal';
	}
	addXP(amount) {
		this.xp += amount;
		while (true) {
			if (this.xp > this.xpBuckets[this.level]) {
				//level up
				this.level += 1;
				this.health = Math.max(2*this.health, 75*this.level);
				this.fogDist += 1;
				this.damage = Math.max(1.5 * this.damage, 10*(this.level - 1));
			} else {
				break;
			}
		}
	}
	loseHealth(amount) {
		this.health -= amount;
		if (this.health <= 0) {
			//die
			this.state = 'dead';
		}
	}
	respawn(grid, rooms, roomCount) {
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
		this.realPos = {x:x*this.ppg, y:y*this.ppg};
	}
	//return true if we should go to the next level
	move(moves, direction, grid) {
		this.direction = direction;
		let x = this.gamePos.x;
		let y = this.gamePos.y;
		let X = grid.length;
		let Y = grid[0].length;
		if (moves[0]) {
			x += moves[0]; 
			moves[0] = 0;
		} else if (moves[1]) {
			y += moves[1]; 
			moves[1] = 0;
		}
		if (x>=X || x<0 || y>=Y || y<0) return false;
		let cell = grid[x][y];
		let goToNextLevel;
		if (typeof(cell) === 'object') goToNextLevel = cell.interact(this, grid);
		if (goToNextLevel) return true;
		switch (cell) {
			case 1:
				//open space, let's move
				this.m(x, y);
				break;
			default:
				//do nothing by default
		}
	}
	m(x, y) {
		this.gamePos.x = x;
		this.gamePos.y = y;
		this.realPos.x = x*this.ppg;
		this.realPos.y = y*this.ppg;
	}
	makeColor() {
		let color = Array(3).fill(0);
		color[0] = Math.max(Math.min(this.health, 255), 0);
		color[1] = Math.max(Math.min(this.health, 255), 0);
		color[2] = Math.max(Math.min(this.health, 255), 0);
		return 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
	}
	draw(ctx, realX, realY, stops) {
		//draw big box
		ctx.fillStyle = this.makeColor()
    ctx.fillRect(this.realPos.x, this.realPos.y, this.ppg, this.ppg);
		//draw secondary direction box
		let s3 = this.ppg/3;
    ctx.fillStyle = this.color2;
    switch (this.direction) {
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
		//draw player info
		// clear out old ones
		ctx.fillStyle = getColor('black');
		ctx.fillRect(0, realY+30, realX, 40);
		ctx.fillStyle = getColor('orange');
		ctx.font = '20px Arial';
		let yblock = realY + 50;
		ctx.fillText(this.level, stops[0], yblock)
		ctx.fillText(this.xpBuckets[this.level] - this.xp, stops[1], yblock);
		ctx.fillText(this.health, stops[2], yblock);
		ctx.fillText(this.weapons[this.whichWeapon], stops[3], yblock);
		ctx.fillText(this.whichDungeon + '/4', stops[4], yblock);
		//draw message
		switch (this.state) {
			case 'dead':
				ctx.fillStyle = 'white';
				ctx.font = '50px Arial';
				ctx.fillText('You were extinguished!', this.X*this.ppg/4, this.Y*this.ppg / 2);
				document.addEventListener('keydown', newEverything);
				break;
			case 'win':
				ctx.fillStyle = 'white';
				ctx.font = '50px Arial';
				ctx.fillText('You Won!!!!!!', this.X*this.ppg/4, this.Y*this.ppg/2);
				document.addEventListener('keydown', newEverything);
		}
	}
}