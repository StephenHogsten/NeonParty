window.addEventListener('load', function() {
	let ctx = document.getElementById('my-canvas').getContext('2d');
	let gameBoard = new GameBoard(160, 100, 5, 10);
	gameBoard.draw(ctx);
})

class GameBoard {
  constructor(X, Y, ppg, roomCount) {
    let x, y;
		this.realX = X * ppg;
		this.realY = Y * ppg;
		this.roomCount = roomCount;
		this.grid = []
    for (x=0; x<X; x++) {
      this.grid.push(Array(Y).fill(0));
    }
    this.rooms = [];
    for (let r=0; r<roomCount; r++) {
      this.rooms.push(new Room(this.grid, this.rooms, X, Y, 'pink', 5));
    }
	}
	draw(ctx) {
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, this.realX, this.realY)
		for (let r=0; r<this.roomCount; r++) {
			console.log('r = ' + r);
			console.log(this.rooms[r]);
			this.rooms[r].draw(ctx);
		}
	}
}

class Room {
  constructor(grid, rooms, X, Y, color, ppg) {
		let xdim, ydim, xpos, ypos;
		let roomsLen = rooms.length;
		this.sides = Array(4).fill(true) 	//sides open for connections: top, right, bottom, left 
		let dims = this.randomDims(X, Y);
		xdim = dims[0];
		ydim = dims[1];
		if (roomsLen === 0) {
			//first box - don't need to check for conflicts
			[xpos, ypos] = this.randomPos(0, X, 0, Y);
		} else {
			////make our new room to sit next to an existing room
			//pick an existing box (must have available sides)
			let baseRoom, baseRoomSides, basePos;
			let r;
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
			//  pick a space in the side for the door
			//	based on the size of the new room, position it relative to the door
			let door;
			basePos = baseRoom.gamePos;
			switch (sideIdx) {
				case 0:
					door = [this.randomPos(basePos.xpos, basePos.xpos+basePos.xdim), basePos.ypos-1];
					ypos = basePos.ypos - 1 - ydim;
					break;
				case 2:
					door = [this.randomPos(basePos.xpos, basePos.xpos+basePos.xdim), basePos.ypos + basePos.ydim + 1];
					ypos = basePos.ypos + basePos.ydim + 1;
					break;
				case 1:
					door = [basePos.xpos - 1, this.randomPos(basePos.ypos, basePos.ypos+basePos.ydim)];
					xpos = basePos.xpos - 1 - xdim;
					break;
				case 3:
					door = [basePos.xpos +basePos.xdim- 1, this.randomPos(basePos.ypos, basePos.ypos+basePos.ydim)];
					xpos = basePos.xpos + basePos.xdim + 1;
					break;
			}
		}
		//register this part of the grid as open
		let x, y;
		for (x=xpos; x<X && x<xpos+xdim; x++) {
			for (y=xpos; y<Y && y<ypos+ydim; y++) {
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
	randomDims(X, Y) {
		//uses a cube fn to more heavily favor the middle?
		let x6 = X / 6, y6 = Y / 6;
		let x43 = x6*8, y43 = y6*8;
		let xdim = Math.floor(x43*Math.pow(Math.random()-0.5, 3) + x6);
		let ydim = Math.floor(y43*Math.pow(Math.random()-0.5, 3) + y6);
		return [xdim, ydim];
	}
	randomPos(xmin, xmax, ymin, ymax) {
		//completely random
		let xpos = Math.floor((xmax - xmin) * Math.random() + xmin);
		if (!ymax) return xpos;		//enable usage for 1d
		let ypos = Math.floor((ymax - ymin) * Math.random() + ymin);
		return [xpos, ypos];
	}
	draw(ctx) {
		ctx.fillStyle = this.color;
		let p = this.realPos;
		ctx.fillRect(p.xpos, p.ypos, p.xdim, p.ydim);
	}
}