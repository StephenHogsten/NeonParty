gameObject = {};

window.addEventListener('load', function() {
	let c = document.getElementById('my-canvas')
	let ctx = c.getContext('2d');
	let w = c.getAttribute('width');
	let h = c.getAttribute('height');
	let pixelsPerGameUnit = 10;
	let roomCount = 30;
	let gameBoard = new GameBoard(w/pixelsPerGameUnit, h/pixelsPerGameUnit, pixelsPerGameUnit, 15);
	gameObject = gameBoard;
	gameBoard.draw(ctx);
})

class GameBoard {
  constructor(X, Y, ppg, roomCount) {
    let x, y;
		this.realX = X * ppg;
		this.realY = Y * ppg;
		this.grid = [];
		this.ppg = ppg;
    for (x=0; x<X; x++) {
      this.grid.push(Array(Y).fill(0));
    }
    this.rooms = [];
		this.doors = [];
		let newRoom;
		let colorVal=10;
    for (let r=0; r<roomCount; r++) {

      newRoom = new Room(this.grid, this.rooms, this.doors, X, Y, 'pink', ppg);
			if (!newRoom.hasOwnProperty('hasError')) {
				this.rooms.push(newRoom); 
				newRoom.color = '#' + colorVal + colorVal + colorVal;
			}
			colorVal += 5;
    }
		this.roomCount = this.rooms.length;
	}
	draw(ctx) {
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, this.realX, this.realY)
		for (let r=0; r<this.roomCount; r++) {

			this.rooms[r].draw(ctx);
		}
		ctx.fillStyle = 'green';
		let dims;
		for (let d=0,colorVal=10; d<this.doors.length; d++, colorVal+=5) {
			dims = this.doors[d];
			ctx.fillStyle = '#' + colorVal + colorVal + colorVal;
			ctx.fillRect(this.ppg*dims[0], this.ppg*dims[1], this.ppg, this.ppg);
		}
	}
}

class Room {
  constructor(grid, rooms, doors, X, Y, color, ppg) {
		let x, y, xdim, ydim, xpos, ypos;
		let roomsLen = rooms.length;
		this.sides = Array(4).fill(true) 	//sides open for connections: top, right, bottom, left 
		if (roomsLen === 0) {
			//first box - don't need to check for conflicts
			xdim = this.randomDim(X);
			ydim = this.randomDim(Y);
			xpos = this.randomPos(0, X);
			ypos = this.randomPos(0, Y);
			this.parent = 'base';
			this.side = 'n/a';
		} else {
			let newStuff, testCount, baseRoomIdx, sideIdx, inBounds, badRoom;
			let testLimit = 20;
			let shouldContinue = false;
			for (testCount=0; testCount<testLimit; testCount++) {

				xdim = this.randomDim(X);
				ydim = this.randomDim(Y);
				newStuff = this.pickRoomBranch(grid, rooms, xdim, ydim, X, Y);
				xpos = newStuff[1];
				ypos = newStuff[2];
				sideIdx = newStuff[3];
				baseRoomIdx = newStuff[4];
				inBounds = false;
				badRoom = false;
				for (x=xpos; x<xpos+xdim; x++) {
					if (x<0) continue;
					if (x>=X) break;
					for (y=ypos; y<ypos+ydim; y++) {
						if (y<0) continue;
						if (y>=Y) break;
						inBounds = true;
						if (grid[x][y] === 1) {
							//already open
							badRoom = true;
							break;
						}
					}
					if (badRoom) break;
				}
				if (inBounds && !badRoom) break;
			}
			if (!inBounds || badRoom) {

				this.hasError = true;
				return;
			} else {

				doors.push(newStuff[0]);
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
		this.color = color? color: 'blue';
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
				door = [this.randomPos(basePos.xpos, basePos.xpos+basePos.xdim, X), basePos.ypos-1];
				ypos = basePos.ypos - 1 - ydim;
				xpos = this.randomPos(door[0] - xdim + 1, door[0], X);
				break;
			case 2:
				door = [this.randomPos(basePos.xpos, basePos.xpos+basePos.xdim, X), basePos.ypos + basePos.ydim];
				ypos = basePos.ypos + basePos.ydim + 1;
				xpos = this.randomPos(door[0] - xdim + 1, door[0], X);
				break;
			case 1:
				door = [basePos.xpos + basePos.xdim, this.randomPos(basePos.ypos, basePos.ypos + basePos.ydim)];




				xpos = basePos.xpos + basePos.xdim + 1;
				ypos = this.randomPos(door[1] - ydim + 1, door[1], Y);
				break;
			case 3:
				door = [basePos.xpos - 1, this.randomPos(basePos.ypos, basePos.ypos+basePos.ydim)];
				xpos = basePos.xpos - xdim - 1;
				ypos = this.randomPos(door[1] - ydim + 1, door[1], Y);
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
	randomPos(xmin, xmax, X) {
		//completely random
		xmin = Math.max(xmin, 0);
		if (X) xmax = Math.min(xmax, X);
		let xpos = Math.floor((xmax - xmin) * Math.random() + xmin);
		return xpos;		
	}
	draw(ctx) {
		ctx.fillStyle = this.color;
		let p = this.realPos;
		ctx.fillRect(p.xpos, p.ypos, p.xdim, p.ydim);
	}
}