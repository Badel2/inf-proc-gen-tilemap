//
// Asset loader
//

var Loader = {
    images: {}
};

Loader.loadImage = function (key, src) {
    var img = new Image();

    var d = new Promise(function (resolve, reject) {
        img.onload = function () {
            this.images[key] = img;
            resolve(img);
        }.bind(this);

        img.onerror = function () {
            reject('Could not load image: ' + src);
        };
    }.bind(this));

    img.src = src;
    return d;
};

Loader.getImage = function (key) {
    return (key in this.images) ? this.images[key] : null;
};

//
// Keyboard handler
//

var Keyboard = {};

Keyboard.LEFT = 37;
Keyboard.RIGHT = 39;
Keyboard.UP = 38;
Keyboard.DOWN = 40;

Keyboard._keys = {};

Keyboard.listenForEvents = function (keys) {
    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup', this._onKeyUp.bind(this));

    keys.forEach(function (key) {
        this._keys[key] = false;
    }.bind(this));
}

Keyboard._onKeyDown = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this._keys) {
        event.preventDefault();
        this._keys[keyCode] = true;
    }
};

Keyboard._onKeyUp = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this._keys) {
        event.preventDefault();
        this._keys[keyCode] = false;
    }
};

Keyboard.isDown = function (keyCode) {
    if (!keyCode in this._keys) {
        throw new Error('Keycode ' + keyCode + ' is not being listened to');
    }
    return this._keys[keyCode];
};

//
// Game object
//

var Game = {};

Game.run = function (context) {
    this.ctx = context;
    this._previousElapsed = 0;

    var p = this.load();
    Promise.all(p).then(function (loaded) {
        this.init();
        window.requestAnimationFrame(this.tick);
    }.bind(this));
};

Game.tick = function (elapsed) {
    window.requestAnimationFrame(this.tick);

    // clear previous frame
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, 512, 512);

    // compute delta time in seconds -- also cap it
    var delta = (elapsed - this._previousElapsed) / 1000.0;
    delta = Math.min(delta, 0.25); // maximum delta of 250 ms
    this._previousElapsed = elapsed;

    this.update(delta);
    this.render();
}.bind(Game);

// override these methods to create the demo
Game.init = function () {};
Game.update = function (delta) {};
Game.render = function () {};

//
// start up function
//

window.onload = function () {
    var context = document.getElementById('demo').getContext('2d');
    var pos_div = document.getElementById('position_info');
    var center_butt = document.getElementById('center_button');
    center_butt.onclick = function() {
        var x = document.getElementById('center_x').value;
        var z = document.getElementById('center_z').value;
        Game.centerAt(x, z);
    };
    var elem = document.getElementById('demo'),
    elemLeft = elem.offsetLeft,
    elemTop = elem.offsetTop,
    context = elem.getContext('2d'),
    elements = [];
    var dragging = null;

    // Add event listener for `click` events.
    elem.addEventListener('mousedown', function(event) {
        var x = event.pageX - elemLeft,
            y = event.pageY - elemTop;

        dragging = {x: x, y: y, initialX: x, initialY: y, actuallyScrolling: false};
    }, false);
    elem.addEventListener('mousemove', function(event) {
        var x = event.pageX - elemLeft,
            y = event.pageY - elemTop;
        var txty = Game.mouse_coords_to_game_coords_float(x, y);
        var tx = txty[0];
        var ty = txty[1];
        pos_div.innerHTML = "Chunk x: " + Math.floor(tx) + ", z: " + Math.floor(ty);
        pos_div.innerHTML += " --- Block x: " + Math.floor(tx*16) + ", z: " + Math.floor(ty*16);

        if (dragging) {
            if (dragging.actuallyScrolling == false && (Math.abs(dragging.x - x) > 10 || Math.abs(dragging.y - y) > 10)) {
                dragging.actuallyScrolling = true;
            }
            if (dragging.actuallyScrolling) {
                Game.scrollBy(dragging.x - x, dragging.y - y);
                dragging.x = x;
                dragging.y = y;
            }
        }
    }, false);
    elem.addEventListener('mouseup', function(event) {
        var x = event.pageX - elemLeft,
            y = event.pageY - elemTop;

        if (dragging.actuallyScrolling == false) {
            Game.clickTile(x, y);
        }
        dragging = null;
    }, false);
    Game.run(context);
};
