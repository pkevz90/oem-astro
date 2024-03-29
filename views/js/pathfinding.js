cnvs = document.getElementsByTagName('canvas')[0];
ctx = cnvs.getContext('2d');
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
auto = true;
let h_constant = 1;
let intervalVar;
class Grid {
    grid;
    exCol = 'green';
    unExCol = 'red';
    currentGrid = undefined;
    explored = [];
    minTree = [];
    smallest = [];
    hash = [];
    constructor(options = {}) {
        let {spaces = 100, start = [1,1]} = options;
        this.start = start;
        this.target =  [Math.floor(Math.random() * spaces), Math.floor(Math.random() * spaces)];
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
                else if ((jj === this.start[0] && ii === this.start[1])) ctx.fillStyle = 'rgb(255,168,0)';
                else if ((jj === this.target[0] && ii === this.target[1])) ctx.fillStyle = 'rgb(255,168,0)';
                else ctx.fillStyle = 'white';
                ctx.strokeRect(jj * width / this.grid[ii].length, ii * height / this.grid.length, (jj+1) * width / this.grid[ii].length, (ii+1) * height / this.grid.length)
                ctx.fillRect(jj * width / this.grid[ii].length, ii * height / this.grid.length, (jj+1) * width / this.grid[ii].length, (ii+1) * height / this.grid.length)
            
            }
        }
    }
    pixelsToGrid(x,y) {
        let gridX = Math.floor(x / (cnvs.width / this.grid[0].length));
        let gridY = Math.floor(y / (cnvs.height / this.grid.length));
        return [gridX, gridY];
    }
    updateNeighbors() {
        let gridToSearch =[
            [-1, 0],
            [1, 0],
            [0,1],
            [0,-1],
            [1,-1],
            [1,1],
            [-1,1],
            [-1,-1]
        ];
        let addToHeap = [];
        gridToSearch.forEach(grid => {
            // console.log(grid, this.currentGrid[1] >= 0 , this.grid[this.currentGrid[0]+ grid[0]]?.[this.currentGrid[1] + grid[1]]?.passable , !this.grid[this.currentGrid[0] + grid[0]]?.[this.currentGrid[1] + grid[1]]?.explored);
            if (this.currentGrid[1] >= 0 && this.grid[this.currentGrid[0]+ grid[0]]?.[this.currentGrid[1] + grid[1]]?.passable && !this.grid[this.currentGrid[0] + grid[0]]?.[this.currentGrid[1] + grid[1]]?.explored) {
                if (!this.grid[this.currentGrid[0]+ grid[0]][this.currentGrid[1]+ grid[1]].computed) {
                    addToHeap.push(this.grid[this.currentGrid[0]+ grid[0]][this.currentGrid[1]+ grid[1]]);
                }
                // console.log(this.currentGrid[0]+ grid[0],this.currentGrid[1]+ grid[1]);
                this.grid[this.currentGrid[0]+ grid[0]][this.currentGrid[1]+ grid[1]].computeCost(this.target, this.currentGrid);
            }
        })
        if (addToHeap.length > 0) this.addToHash(addToHeap);
    }
    findSmallest() {
        let small = 1e8, smallCoor = null;
        for (let yy = 0; yy < this.grid.length; yy++) {
            for (let xx = 0; xx < this.grid[yy].length; xx++) {
                if (this.grid[xx][yy].getTotal() < small && !this.grid[xx][yy].explored) {
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
        if (!this.grid[xx][yy].passable) {
            clearInterval(intervalVar);
            console.log('no solution');
        }
        this.currentGrid = [xx, yy];
        this.explored.push([xx, yy]);
        this.grid[xx][yy].explored = true;
        ctx.fillStyle = 'green';
        ctx.strokeRect(xx * cnvs.width / this.grid[yy].length, yy * cnvs.height / this.grid.length,cnvs.width / mainGrid.grid[yy].length,cnvs.height / mainGrid.grid.length)
        ctx.fillRect(xx * cnvs.width / this.grid[yy].length, yy * cnvs.height / this.grid.length, cnvs.width / mainGrid.grid[yy].length, cnvs.height / mainGrid.grid.length)
        // console.time('update');
        this.updateNeighbors();
        // console.timeEnd('update');
        // this.drawGrid();
    }
    produceFeatures() {
        for (let ii = 0; ii < this.grid.length; ii++) {
            for (let jj = 0; jj < this.grid[ii].length; jj++) {
                if ((ii === this.start[1] && jj === this.start[0]) || (ii === this.target[1] && jj === this.target[0])) continue;
                let isWallNear = !this.grid[jj-1]?.[ii]?.passable;
                
                let isRoadNear = this.grid[jj]?.[ii-1]?.road;
                let notNext = this.grid[jj-1]?.[ii]?.road
                // console.log(isWallNear);
                this.grid[jj][ii].passable = Math.random() < (isWallNear ? 0.4 : 0.8) ? true : false;
                if (this.grid[jj][ii].passable) {
                    // this.grid[jj][ii].road = Math.random() < (notNext ? 0: 1)*(isRoadNear ? 0.75 : 0.05) ? true : false;
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
                this.grid[xx][yy].explored = false;
                this.grid[xx][yy].parent = undefined;
                this.hash = [];
            }
        }
        this.explored = [];
        this.currentGrid = undefined;
        this.grid[this.start[0]][this.start[1]].g = 0;
        this.grid[this.start[0]][this.start[1]].h = 0;
        this.grid[this.start[0]][this.start[1]].computed = true;
        this.drawGrid();
    }
    switchElements(a,b,list) {
        let el = list[b];
        list[b] = list[a];
        list[a] = el;
        return list;
    }
    sortHash(startElement) {
        if (!startElement) startElement = this.hash.length - 1;
        let element = startElement, checkElement;
        while (true) {
            checkElement = Math.floor((element-1) / 2);
            if (this.hash[checkElement].getTotal() > this.hash[element].getTotal()) {
                this.hash = this.switchElements(element, checkElement, this.hash);
                element = checkElement + 0;
            }
            else break;
            if (element === 0) break;
        }
    }
    addToHash(listToAdd) {
        if (!listToAdd.length) listToAdd = [listToAdd];
        listToAdd.forEach(element => {
            this.hash.push(element);
            if (this.hash.length > 1) this.sortHash();
        });
    }
    removeSmallestFromHash() {
        let smallest = this.hash[0];
        let element = 0;
        while (true) {
            let switchedElement = this.hash[element*2+2] ? (this.hash[element*2+1]?.getTotal() < this.hash[element*2+2]?.getTotal() ? element*2+1 : element*2+2) : element*2 + 1;
            if (!this.hash[switchedElement]) break;
            this.hash = this.switchElements(switchedElement, element, this.hash);
            element = switchedElement;
        }
        this.hash.splice(element,1);
        if (this.hash.length > element) this.sortHash(element)
        return smallest;
    }
}

class Space {
    constructor(x, y) {
        this.coor = [x, y];
        this.computed = false;
        this.explored = false;
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
        // let roadM = mainGrid.grid[parent[0]][parent[1]].road && this.road ? 0.75 : 1;
        let roadM = this.road ? 0.75 : 1;
        let g = mainGrid.grid[parent[0]][parent[1]].g + roadM*((this.coor[0] - parent[0]) ** 2 + (this.coor[1] - parent[1]) ** 2) ** (1/2);
        let h = h_constant*((this.coor[0] - target[0]) ** 2 + (this.coor[1] - target[1]) ** 2) ** (1/2);
        // let h = 0;
        if ((g + h) < this.getTotal()) {
            this.g = g;
            this.h = h;
            this.parent = parent;
            if (this.computed) {
                let index = mainGrid.hash.findIndex(element => element.h === this.h && element.g === this.g)
                mainGrid.sortHash(index);
            }
        }
        
        this.computed = true;
        ctx.font = 'bold ' + cnvs.height * 0.5 / mainGrid.grid.length + 'px serif';
        ctx.fillStyle = 'red';
        ctx.fillStyle = (this.coor[0] === mainGrid.start[0] && this.coor[1] === mainGrid.start[1]) || (this.coor[0] === mainGrid.target[0] && this.coor[1] === mainGrid.target[1]) ? 'orange' : ctx.fillStyle;
        // console.log(this.coor);
        ctx.strokeRect(this.coor[0] * cnvs.width / mainGrid.grid[this.coor[1]].length, this.coor[1] * cnvs.height / mainGrid.grid.length,cnvs.width / mainGrid.grid[this.coor[1]].length,cnvs.height / mainGrid.grid.length)
        ctx.fillRect(this.coor[0] * cnvs.width / mainGrid.grid[this.coor[1]].length, this.coor[1] * cnvs.height / mainGrid.grid.length, cnvs.width / mainGrid.grid[this.coor[1]].length, cnvs.height / mainGrid.grid.length)
     
        ctx.fillStyle = 'black';
        let text = this.coor[0] === mainGrid.start[0] && this.coor[1] === mainGrid.start[1] ? 'S' : this.coor[0] === mainGrid.target[0] && this.coor[1] === mainGrid.target[1] ? 'T' :  this.getTotal().toFixed(1);
        ctx.fillText(text, (this.coor[0]+0.5) * cnvs.width / mainGrid.grid[this.coor[0]].length, (this.coor[1]+0.5) * cnvs.height / mainGrid.grid.length)
        // ctx.lineWidth = 2;
        // ctx.beginPath()
        // ctx.moveTo((0.5+this.coor[0]) * cnvs.width / mainGrid.grid[this.coor[1]].length, (0.5+this.coor[1]) * cnvs.height / mainGrid.grid.length)
        // ctx.lineTo((0.5+parent[0]) * cnvs.width / mainGrid.grid[parent[1]].length, (0.5+parent[1]) * cnvs.height / mainGrid.grid.length)
        // ctx.stroke();
        // ctx.lineWidth = 1;
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
        intervalVar = setInterval(() => {
            for (let ii = 0; ii < 40; ii++){
            let loc = mainGrid.removeSmallestFromHash().coor;
            if (loc[0] === mainGrid.target[0] && loc[1] === mainGrid.target[1]) {
                loc = [mainGrid.target[0],mainGrid.target[1]];
                loc = mainGrid.grid[loc[0]][loc[1]].parent;
                let ii = 0;
                ctx.fillStyle = 'orange';
                let width = cnvs.width;
                let height = cnvs.height;
                while (loc[0] !== mainGrid.start[0] || loc[1] !== mainGrid.start[1]) {
                    ctx.strokeRect(loc[0] * width / mainGrid.grid[loc[1]].length, loc[1] * height / mainGrid.grid.length, width / mainGrid.grid[loc[1]].length, height / mainGrid.grid.length)
                    ctx.fillRect(loc[0] * width / mainGrid.grid[loc[1]].length, loc[1] * height / mainGrid.grid.length, width / mainGrid.grid[loc[1]].length, height / mainGrid.grid.length)
                    loc = mainGrid.grid[loc[0]][loc[1]].parent;
                    if (ii >= 10000) break;
                    ii++;
                }
                console.log(ii);
                clearInterval(intervalVar)
            }
            mainGrid.updateCurrentGrid(loc[0], loc[1]);
            }
        }, 1)
    }
    else {
        // console.time()
        // console.log(mainGrid.findSmallest());
        let loc = mainGrid.removeSmallestFromHash().coor;
        // console.log(loc);
        // console.timeEnd()
        if (loc[0] === mainGrid.target[0] && loc[1] === mainGrid.target[1]) {
            loc = [mainGrid.target[0],mainGrid.target[1]];
            let ii = 0;
            ctx.fillStyle = 'orange';
            let width = cnvs.width;
            let height = cnvs.height;
            while (loc[0] !== mainGrid.start[0] || loc[1] !== mainGrid.start[1]) {
                loc = mainGrid.grid[loc[0]][loc[1]].parent;
                ctx.strokeRect(loc[0] * width / mainGrid.grid[loc[1]].length, loc[1] * height / mainGrid.grid.length, width / mainGrid.grid[loc[1]].length, height / mainGrid.grid.length)
                ctx.fillRect(loc[0] * width / mainGrid.grid[loc[1]].length, loc[1] * height / mainGrid.grid.length, width / mainGrid.grid[loc[1]].length, height / mainGrid.grid.length)
                if (ii >= 10000) break;
                ii++;
            }
            return;
        }
        mainGrid.updateCurrentGrid(loc[0], loc[1]);
        // console.log(mainGrid.hash.length);
        // console.log(mainGrid.hash[0].coor);

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