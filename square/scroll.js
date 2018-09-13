var map = {
    tsize: 32,
    layers: Array(2).fill(new Map()),
    getTile: function (layer, col, row) {
        // We must use a string as a key because two arrays
        // with are same elements are not equal according to js
        // [0, 0] != [0, 0]
        var k = col + "," + row;
        return this.layers[layer].get(k);
    },
    setTile: function (layer, col, row, value) {
        var k = col + "," + row;
        if (value == 0) {
            // No need to store "empty" tiles
            this.layers[layer].delete(k);
        } else {
            this.layers[layer].set(k, value);
        }
    }
};

function Camera(map, width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.scale = 1.0;
    this.tsize = map.tsize * this.scale;
}

Camera.SPEED = 256; // pixels per second

Camera.prototype.move = function (delta, dirx, diry) {
    // move camera
    this.x += (dirx * Camera.SPEED * delta) * this.scale;
    this.y += (diry * Camera.SPEED * delta) * this.scale;
};

Camera.prototype.moveRaw = function (dirx, diry) {
    // move camera
    this.x += dirx;
    this.y += diry;
};

Camera.prototype.zoom = function (newF) {
    var old_center_x = (this.x + this.width / 2) / this.tsize - 0.5;
    var old_center_y = (this.y + this.height / 2) / this.tsize - 0.5;
    this.scale *= newF;
    this.scale = Math.max(this.scale, 0.1);
    this.tsize = map.tsize * this.scale;
    // Move camera so that center stays constant
    this.centerAt(old_center_x, old_center_y);
};

Camera.prototype.centerAt = function (x, y) {
    this.x = (x + 0.5) * this.tsize - this.width / 2;
    this.y = (y + 0.5) * this.tsize - this.height / 2;
}

Game.load = function () {
    return [
        Loader.loadImage('tiles', '../assets/tiles.png'),
    ];
};

Game.init = function () {
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
    this.tileAtlas = Loader.getImage('tiles');
    this.camera = new Camera(map, 512, 512);
    this.showGrid = true;
};

Game.update = function (delta) {
    // handle camera movement with arrow keys
    var dirx = 0;
    var diry = 0;
    if (Keyboard.isDown(Keyboard.LEFT)) { dirx = -1; }
    if (Keyboard.isDown(Keyboard.RIGHT)) { dirx = 1; }
    if (Keyboard.isDown(Keyboard.UP)) { diry = -1; }
    if (Keyboard.isDown(Keyboard.DOWN)) { diry = 1; }

    this.camera.move(delta, dirx, diry);
};

Game._drawLayer = function (layer) {
    var startCol = Math.floor(this.camera.x / this.camera.tsize);
    var endCol = startCol + (this.camera.width / this.camera.tsize);
    var startRow = Math.floor(this.camera.y / this.camera.tsize);
    var endRow = startRow + (this.camera.height / this.camera.tsize);
    var offsetX = -this.camera.x + startCol * this.camera.tsize;
    var offsetY = -this.camera.y + startRow * this.camera.tsize;

    //console.log([startCol, endCol, startRow, endRow, offsetX, offsetY]);

    // TODO: iterator over the Map instead
    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile(layer, c, r);
            //console.log(tile);
            var x = (c - startCol) * this.camera.tsize + offsetX;
            var y = (r - startRow) * this.camera.tsize + offsetY;
            if (tile !== 0) { // 0 => empty tile
                var colors = ["white", "green", "red"];
                if (tile <= 2) {
                    this.ctx.fillStyle = colors[tile];
                    this.ctx.fillRect(
                        Math.round(x),  // target x
                        Math.round(y), // target y
                        this.camera.tsize, // target width
                        this.camera.tsize // target height
                    );
                }
            }
        }
    }

    // Draw grid lines
    if (this.showGrid) {
        this.ctx.strokeStyle = "#AAA";
        this.ctx.lineWidth = 1;
        for (var c = startCol; c <= endCol; c++) {
            var x = (c - startCol) * this.camera.tsize + offsetX;
            x = Math.round(x);
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 512);
            this.ctx.stroke();
        }
        for (var r = startRow; r <= endRow; r++) {
            var y = (r - startRow) * this.camera.tsize + offsetY;
            y = Math.round(y);
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(512, y);
            this.ctx.stroke();
        }
    }
};

Game.render = function () {
    // draw map background layer
    this._drawLayer(0);
    // draw map top layer
    this._drawLayer(1);
};

Game.mouse_coords_to_game_coords_float = function(x, y) {
    var tx = (x + this.camera.x) / this.camera.tsize;
    var ty = (y + this.camera.y) / this.camera.tsize;
    return [tx, ty];
};

Game.mouse_coords_to_game_coords = function(x, y) {
    var txty = this.mouse_coords_to_game_coords_float(x, y);
    var tx = txty[0];
    var ty = txty[1];
    tx = Math.floor(tx);
    ty = Math.floor(ty);
    return [tx, ty];
};

Game.clickTile = function(x, y) {
    var txty = this.mouse_coords_to_game_coords(x, y);
    var tx = txty[0];
    var ty = txty[1];
    /*
    console.log("Clicked " + x + "," + y);
    console.log("Which is: " + tx + "," + ty);
    console.log(this.camera);
    */
    var a = map.getTile(0, tx, ty);
    if (a == undefined) { a = 0; }
    a += 1;
    if (a >= 3) { a = 0; }
    map.setTile(0, tx, ty, a);
};

// Get all the (x, y) pairs from a layer with the given value
Game.getSelection = function(layer, value) {
    // Iterators in JS dont have .filter()
    var s = [];
    map.layers[layer].forEach((v, k) => {
        var xy = k.split(",").map(a => Number.parseInt(a));
        //console.log(k + " => " + v);
        //console.log(layer_x_y);
        var x = xy[0];
        var y = xy[1];
        if (v == value) {
            s.push([x, y]);
        }
    });
    return s;
};

Game.scrollBy = function(x, y) {
    this.camera.moveRaw(x, y);
};

Game.zoomBy = function(f) {
    this.camera.zoom(f);
};

Game.centerAt = function(x, y) {
    this.camera.centerAt(Number.parseInt(x), Number.parseInt(y));
};
