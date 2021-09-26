cnvs = document.getElementsByTagName('canvas')[0];
ctx = cnvs.getContext('2d');
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
auto = true;
h_constant = 1;
class Grid {
    grid;
    exCol = 'green';
    unExCol = 'red';
    currentGrid = undefined;
    explored = [];
    smallest = [];
    constructor(options = {}) {
        let {spaces = 50, start = [1,1], target = [Math.floor(Math.random() * 50), Math.floor(Math.random() * 50)]} = options;
        this.start = start;
        this.target = target;
        this.produceGrid(spaces);
        this.grid[start[0]][start[1]].g = 0;
        this.grid[start[0]][start[1]].h = 0;
        this.grid[start[0]][start[1]].computed = true;
        this.produceFeatures();
    }
    produceGrid(spaces) {
        let grid = [];
        for (let ii = 0; ii < spaces; ii++) {
            grid.push([]);
            for (let jj = 0; jj < spaces; jj++) {
               grid[ii].push(new Space(ii,jj));
            }
        }
        this.grid = grid;
        this.drawGrid()
    }
    drawGrid() {
        let height = cnvs.height, width = cnvs.width;
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 20px serif';
        for (let ii = 0; ii < this.grid.length; ii++) {
            for (let jj = 0; jj < this.grid[ii].length; jj++) {
                if (!this.grid[jj][ii].passable) ctx.fillStyle = 'black';
                else if (this.grid[jj][ii].road) ctx.fillStyle = 'brown';
                else if ((jj === this.start[0] && ii === this.start[1])) ctx.fillStyle = 'orange';
                else if ((jj === this.start[0] && ii === this.start[1]) || this.checkExplored(jj,ii)) ctx.fillStyle = 'green';
                else if ((jj === this.target[0] && ii === this.target[1])) ctx.fillStyle = 'orange';
                else if ((jj === this.target[0] && ii === this.target[1]) || this.grid[jj][ii].computed) ctx.fillStyle = 'red';
                else ctx.fillStyle = 'white';
                ctx.strokeRect(jj * width / this.grid[ii].length, ii * height / this.grid.length, (jj+1) * width / this.grid[ii].length, (ii+1) * height / this.grid.length)
                ctx.fillRect(jj * width / this.grid[ii].length, ii * height / this.grid.length, (jj+1) * width / this.grid[ii].length, (ii+1) * height / this.grid.length)
            
                if (this.grid[jj][ii].computed) {
                    ctx.strokeText(this.grid[jj][ii].getTotal().toFixed(1), (jj+0.5) * width / this.grid[jj].length, (ii+0.5) * height / this.grid.length)
                }
            }
        }
    }
    pixelsToGrid(x,y) {
        let gridX = Math.floor(x / (cnvs.width / this.grid[0].length));
        let gridY = Math.floor(y / (cnvs.height / this.grid.length));
        return [gridX, gridY];
    }
    updateNeighbors() {
        // up
        if (this.currentGrid[1] > 0 && this.grid[this.currentGrid[0]]?.[this.currentGrid[1] - 1]?.passable) {
            this.grid[this.currentGrid[0]][this.currentGrid[1] - 1].computeCost(this.target, this.currentGrid);
        }
        // //northeast
        // if (this.currentGrid[1] > 0 && this.grid[this.currentGrid[0]+1]?.[this.currentGrid[1] - 1]?.passable) {
        //     this.grid[this.currentGrid[0]+1][this.currentGrid[1] - 1].computeCost(this.target, this.currentGrid);
        // }
        // //northwest
        // if (this.currentGrid[1] > 0 && this.grid[this.currentGrid[0]-1]?.[this.currentGrid[1] - 1]?.passable) {
        //     this.grid[this.currentGrid[0]-1][this.currentGrid[1] - 1].computeCost(this.target, this.currentGrid);
        // }
        
        // //southwest
        // if (this.currentGrid[1] > 0 && this.grid[this.currentGrid[0]-1]?.[this.currentGrid[1] + 1]?.passable) {
        //     this.grid[this.currentGrid[0]-1][this.currentGrid[1] + 1].computeCost(this.target, this.currentGrid);
        // }
        // //southeast
        // if (this.currentGrid[1] > 0 && this.grid[this.currentGrid[0]+1]?.[this.currentGrid[1] + 1]?.passable) {
        //     this.grid[this.currentGrid[0]+1][this.currentGrid[1] + 1].computeCost(this.target, this.currentGrid);
        // }
        // right
        if (this.currentGrid[0] < this.grid[0].length - 1 && this.grid[this.currentGrid[0]+1]?.[this.currentGrid[1]]?.passable) {
            this.grid[this.currentGrid[0] + 1][this.currentGrid[1]].computeCost(this.target, this.currentGrid);
        }

        // left
        if (this.currentGrid[0] > 0 && this.grid[this.currentGrid[0]-1]?.[this.currentGrid[1]]?.passable) {
            this.grid[this.currentGrid[0] - 1][this.currentGrid[1]].computeCost(this.target, this.currentGrid);
        }

        // down
        if (this.currentGrid[0] < this.grid.length - 1 && this.grid[this.currentGrid[0]]?.[this.currentGrid[1]+1]?.passable) {
            this.grid[this.currentGrid[0]][this.currentGrid[1] + 1].computeCost(this.target, this.currentGrid);
        }
    }
    checkExplored(x, y) {
        let filteredExplored = this.explored.filter(space => {
            return space[0] === x && space[1] === y;
        })
        return filteredExplored.length > 0;
    }
    findSmallest() {
        let small = 1e8, smallCoor = null;
        for (let yy = 0; yy < this.grid.length; yy++) {
            for (let xx = 0; xx < this.grid[yy].length; xx++) {
                if (this.grid[xx][yy].getTotal() < small && !this.checkExplored(xx,yy)) {
                    small = this.grid[xx][yy].getTotal();
                    smallCoor = [xx, yy];
                }
                // else if (this.grid[xx][yy].getTotal() === small && this.grid[xx][yy].h < this.grid[smallCoor[0]][smallCoor[1]].h) {
                //     small = this.grid[xx][yy].getTotal();
                //     smallCoor = [xx, yy];
                // }
            }
        }
        return smallCoor;
    }
    updateCurrentGrid(xx,yy) {
        this.currentGrid = [xx, yy];
        this.explored.push([xx, yy]);
        this.updateNeighbors();
        // this.drawGrid();
    }
    produceFeatures() {
        for (let ii = 0; ii < this.grid.length; ii++) {
            for (let jj = 0; jj < this.grid[ii].length; jj++) {
                if ((ii === this.start[1] && jj === this.start[0]) || (ii === this.target[1] && jj === this.target[0])) continue;
                this.grid[jj][ii].passable = Math.random() < 0.75 ? true : false;
                if (this.grid[jj][ii].passable) {
                    // this.grid[jj][ii].road = Math.random() < 0.25 ? true : false;
                }
            }
        }
        this.drawGrid();
    }
    resetGrid() {
        for (let yy = 0; yy < this.grid.length; yy++) {
            for (let xx = 0; xx < this.grid[yy].length; xx++) {
                this.grid[xx][yy].g = 1e6;
                this.grid[xx][yy].h = 1e6;
                this.grid[xx][yy].computed = false;
                this.grid[xx][yy].parent = undefined;
            }
        }
        this.explored = [];
        this.currentGrid = undefined;
        this.grid[this.start[0]][this.start[1]].g = 0;
        this.grid[this.start[0]][this.start[1]].h = 0;
        this.grid[this.start[0]][this.start[1]].computed = true;
        this.drawGrid();
    }
}

class Space {
    constructor(x, y) {
        this.coor = [x, y];
        this.computed = false;
        this.g = 1000000; // distance from start
        this.h = 1000000; // distance from target
        this.parent = undefined;
        this.passable = true;
        this.road = false;
    }
    getTotal() {
        return this.g + this.h;
    }
    computeCost(target, parent) {
        this.computed = true;
        let roadM = mainGrid.grid[parent[0]][parent[1]].road && this.road ? 0.75 : 1;
        let g = roadM*mainGrid.grid[parent[0]][parent[1]].g + ((this.coor[0] - parent[0]) ** 2 + (this.coor[1] - parent[1]) ** 2) ** (1/2);
        let h = h_constant*((this.coor[0] - target[0]) ** 2 + (this.coor[1] - target[1]) ** 2) ** (1/2);
        // let h = 0;
        if ((g + h) < this.getTotal() && !mainGrid.checkExplored(this.coor[0], this.coor[1])) {
            this.g = g;
            this.h = h;
            this.parent = parent;
        }
        ctx.fillStyle = mainGrid.checkExplored(this.coor[0], this.coor[1]) ? 'green' : 'red';
        // console.log(this.coor);
        ctx.strokeRect(this.coor[0] * cnvs.width / mainGrid.grid[this.coor[1]].length, this.coor[1] * cnvs.height / mainGrid.grid.length,cnvs.width / mainGrid.grid[this.coor[1]].length,cnvs.height / mainGrid.grid.length)
        ctx.fillRect(this.coor[0] * cnvs.width / mainGrid.grid[this.coor[1]].length, this.coor[1] * cnvs.height / mainGrid.grid.length, cnvs.width / mainGrid.grid[this.coor[1]].length, cnvs.height / mainGrid.grid.length)
     
        ctx.fillStyle = 'black';
        ctx.fillText(this.getTotal().toFixed(1), (this.coor[0]+0.5) * cnvs.width / mainGrid.grid[this.coor[0]].length, (this.coor[1]+0.5) * cnvs.height / mainGrid.grid.length)
        ctx.lineWidth = 2;
        ctx.beginPath()
        ctx.moveTo((0.5+this.coor[0]) * cnvs.width / mainGrid.grid[this.coor[1]].length, (0.5+this.coor[1]) * cnvs.height / mainGrid.grid.length)
        ctx.lineTo((0.5+parent[0]) * cnvs.width / mainGrid.grid[parent[1]].length, (0.5+parent[1]) * cnvs.height / mainGrid.grid.length)
        ctx.stroke();
        ctx.lineWidth = 1;
    }
}

let mainGrid = new Grid();

cnvs.addEventListener('click', el => {
    // let loc = mainGrid.pixelsToGrid(el.clientX, el.clientY);
    // if (!mainGrid.grid[loc[0]][loc[1]].computed) return;
    if (mainGrid.currentGrid === undefined) {
        mainGrid.updateCurrentGrid(mainGrid.start[0], mainGrid.start[1]);
    }
    if (auto) {
        let a = setInterval(() => {
            let loc = mainGrid.findSmallest();
            
            if (loc[0] === mainGrid.target[0] && loc[1] === mainGrid.target[1]) {
                loc = [mainGrid.target[0],mainGrid.target[1]];
                let ii = 0;
                ctx.fillStyle = 'orange';
                let width = cnvs.width;
                let height = cnvs.height;
                while (loc[0] !== mainGrid.start[0] || loc[1] !== mainGrid.start[1]) {
                    loc = mainGrid.grid[loc[0]][loc[1]].parent;
                    // console.log(loc);
                    ctx.strokeRect(loc[0] * width / mainGrid.grid[loc[1]].length, loc[1] * height / mainGrid.grid.length, width / mainGrid.grid[loc[1]].length, height / mainGrid.grid.length)
                    ctx.fillRect(loc[0] * width / mainGrid.grid[loc[1]].length, loc[1] * height / mainGrid.grid.length, width / mainGrid.grid[loc[1]].length, height / mainGrid.grid.length)
                    if (ii >= 10000) break;
                    ii++;
                }
                clearInterval(a);
                return;
            }
            mainGrid.updateCurrentGrid(loc[0], loc[1]);
            
        }, 1)
    }
    else {
        let loc = mainGrid.findSmallest();
        if (loc[0] === mainGrid.target[0] && loc[1] === mainGrid.target[1]) {
            loc = [mainGrid.target[0],mainGrid.target[1]];
            console.log(loc);
            let ii = 0;
            ctx.fillStyle = 'orange';
            let width = cnvs.width;
            let height = cnvs.height;
            while (loc[0] !== mainGrid.start[0] || loc[1] !== mainGrid.start[1]) {
                loc = mainGrid.grid[loc[0]][loc[1]].parent;
                console.log(loc);
                ctx.strokeRect(loc[0] * width / mainGrid.grid[loc[1]].length, loc[1] * height / mainGrid.grid.length, width / mainGrid.grid[loc[1]].length, height / mainGrid.grid.length)
                ctx.fillRect(loc[0] * width / mainGrid.grid[loc[1]].length, loc[1] * height / mainGrid.grid.length, width / mainGrid.grid[loc[1]].length, height / mainGrid.grid.length)
                if (ii >= 10000) break;
                console.log(ii);
                ii++;
            }
            return;
        }
        mainGrid.updateCurrentGrid(loc[0], loc[1]);

    }
    // console.log(mainGrid.grid[14][17].parent, mainGrid.grid[14][17].getTotal());
})
cnvs.addEventListener('mousemove', el => {
    if (el.ctrlKey) {
        let loc = mainGrid.pixelsToGrid(el.clientX, el.clientY);
        mainGrid.grid[loc[0]][loc[1]].passable = false;
        mainGrid.drawGrid();
        return
    }
    else if (el.shiftKey) {
        let loc = mainGrid.pixelsToGrid(el.clientX, el.clientY);
        mainGrid.grid[loc[0]][loc[1]].road = true;
        mainGrid.drawGrid();
        return
    }
})

function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}