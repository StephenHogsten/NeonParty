gameObject = {};

window.addEventListener('load', function() {
	let c = document.getElementById('my-canvas')
	let ctx = c.getContext('2d');
	let w = c.getAttribute('width');
	let h = c.getAttribute('height');
	let pixelsPerGameUnit = 10;
	let gameBoard = new GameBoard(w/pixelsPerGameUnit, h/pixelsPerGameUnit, pixelsPerGameUnit);
	gameObject = gameBoard;
	gameBoard.drawEverything(ctx);
})

function printGrid(grid) {
	g = [];
	for (let j=0; j<grid.length; j++) {
		g.push(grid.reduce((last, curr)=>last.concat(curr[j]), []).join(''));
	}
	console.log(g.join('\n'));
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
		this.ppg = ppg;
		this.buildEmptyGrid();
		console.log(printGrid(this.grid))
		// create rooms
		let roomCount = 20;
    this.rooms = [];
		this.doors = [];
		let newRoom;
		let colorVal=10;
    for (let r=0; r<roomCount; r++) {
      newRoom = new Room(this.grid, this.rooms, this.doors, X, Y, 'pink', ppg);
			if (!newRoom.hasOwnProperty('hasError')) {
				this.rooms.push(newRoom); 
			}
    }
		this.roomCount = this.rooms.length;
		// add monsters
		let monsterCount = 10;
		this.monsters = [];
		for (let m=0; m<monsterCount; m++) {
			this.monsters.push(new Monster(this.grid, this.rooms, this.roomCount, ppg, 'red', 100, 15));
		}
		// add random health
		let healthCount = 5;
		this.healthCubes = [];
		for (let h=0; h<healthCount; h++) {
			this.healthCubes.push(new HealthCube(this.grid, this.rooms, this.roomCount, ppg, 'green', 10*Math.floor(3*Math.random()+1)));
		}
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
		ctx.fillStyle = 'white';
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
		let x, y;
		while (true) {
			x = randomPos(g.xpos, g.xpos + g.xdim);
			y = randomPos(g.ypos, g.ypos + g.ydim);
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
	constructor(grid, rooms, roomCount, ppg, color, health, damage) {
		super(grid, rooms, roomCount, ppg, color);
		this.health = health;
		this.damage = damage;
	}
}

class Weapon extends RoomObject{
	constructor(grid, rooms, roomCount, ppg, color, name, damage) {
		super(grid, rooms, roomCount, ppg, color);
		this.name = name; 
		this.damage = damage;
	}
}

class HealthCube extends RoomObject{
	constructor(grid, rooms, roomCount, ppg, color, health) {
		super(grid, rooms, roomCount, ppg, color);
		this.health = health;
	}
}