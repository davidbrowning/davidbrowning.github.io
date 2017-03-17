/*jslint browser: true, white: true */
/*global CanvasRenderingContext2D, requestAnimationFrame, console, MyGame */

// ------------------------------------------------------------------
//
// This is the graphics rendering code for the game.
//
// ------------------------------------------------------------------
MyGame.graphics = (function() {
	'use strict';
	
	var canvas = document.getElementById('canvas'),
		context = canvas.getContext('2d');

	
	//------------------------------------------------------------------
	//
	// Place a 'clear' function on the Canvas prototype, this makes it a part
	// of the canvas, rather than making a function that calls and does it.
	//
	//------------------------------------------------------------------
	CanvasRenderingContext2D.prototype.clear = function() {
		this.save();
		this.setTransform(1, 0, 0, 1, 0, 0);
		this.clearRect(0, 0, canvas.width, canvas.height);
		this.restore();
	};
	
	//------------------------------------------------------------------
	//
	// Public function that allows the client code to clear the canvas.
	//
	//------------------------------------------------------------------
	function clear() {
		context.clear();
	}
    
    //------------------------------------------------------------------
    // This is used to create the ball 
    //
    //------------------------------------------------------------------


	function Ball(spec) {
		var that = {},
			ready = false,
			image = new Image();
		
        var game_begin = false;

		image.onload = function() { 
			ready = true;
		};
		image.src = spec.image;

        that.getGameStatus = function(){
            return game_begin;
        }

        that.current_x = 0
        that.current_x_depth = 1
        that.current_y = 0
        that.current_y_depth = 1

        that.newGame = function(){
            game_begin = true
        }

        that.flipY = function(){
            if(that.current_y === 1){
                that.current_y = 0;
            }
            else{that.current_y = 1}
        }

        that.stopGame = function(){
            game_begin = false;
        }

        that.changeStatus = function(){
            game_begin = !game_begin
        }
		
		that.rotateRight = function(elapsedTime) {
			spec.rotation += spec.rotateRate * (elapsedTime / 1000);
		};
		
		that.rotateLeft = function(elapsedTime) {
			spec.rotation -= spec.rotateRate * (elapsedTime / 1000);
		};
        that.checkPaddle = function(elapsedTime, x, w, new_center){
            if(Math.floor(spec.center.y) == canvas.height-120 || Math.floor(spec.center.y) == canvas.height - 119){
                //console.log('hit')
                if(spec.center.x > x-(w/2) && spec.center.x < (x+(w/2))){
                    //TODO if on left half of paddle go left, right? go right.
                    var paddle_left = (x-(w/2));
                    var paddle_mid = x; //?
                    var paddle_right = (x+(w/2));
                    console.log('mid',paddle_mid,'left',paddle_left,'right',paddle_right);
                    if(spec.center.x > paddle_left && spec.center.x < paddle_mid){
                        that.current_x = 0;
                        if(spec.center.x < ((paddle_mid - paddle_left)/2)+paddle_left && that.current_x_depth < 3){
                            //alert('augmenting depth')
                            that.current_x_depth++;
                        }
                        else if(that.current_x_depth > 1){
                            that.current_x_depth--;
                        }
                        //console.log(((paddle_mid + paddle_right)/2)+paddle_right)
                        else if(spec.center.x > (((paddle_right - paddle_mid)/2) + paddle_mid) && that.current_x_depth < 3){
                            //alert('augmenting depth')
                            that.current_x_depth++;
                        }
                        else if(that.current_x_depth > 1){
                            that.current_x_depth--;
                        }
                        console.log("current depth", that.current_x_depth)
                    }
                    else{
                        that.current_x = 1
                    }
                    var alt_center = spec.center.y - spec.moveRate * (elapsedTime/1000);
                    new_center = alt_center
                    that.current_y = 0
                    
                }    
            } 
        }
			
		that.moveLeft = function(elapsedTime) {
            var new_center = spec.center.x - spec.moveRate * (elapsedTime/1000);
            if(new_center > 0 && that.current_x == 0){
			    spec.center.x = new_center;            
            }
            else{
                var alt_center = spec.center.x + spec.moveRate * (elapsedTime/1000);
                spec.center.x = alt_center
                that.current_x = 1
            }
		};
		
		that.moveRight = function(elapsedTime) {
            var new_center = spec.center.x + spec.moveRate * (elapsedTime/1000);
            if(new_center < canvas.width && that.current_x == 1){
			    spec.center.x = new_center;            
            }
            else{
                var alt_center = spec.center.x - spec.moveRate * (elapsedTime/1000);
			    spec.center.x = alt_center;            
                that.current_x = 0
            }
            
		};
		
		that.moveUp = function(elapsedTime) {
            var new_center = spec.center.y - spec.moveRate * (elapsedTime/1000);
            if(new_center > 0 && that.current_y == 0){
			    spec.center.y = new_center;            
            }
            else{
                var alt_center = spec.center.y + spec.moveRate * (elapsedTime/1000);
                spec.center.y = alt_center
                that.current_y = 1
            }
		};
		
		that.moveDown = function(elapsedTime, x, w) {
            var new_center = spec.center.y + spec.moveRate * (elapsedTime/1000);
            if(new_center < canvas.height && that.current_y == 1){
                that.checkPaddle(elapsedTime, x, w, new_center)
                spec.center.y = new_center;             
            }
            else{
                var alt_center = spec.center.y - spec.moveRate * (elapsedTime/1000);
			    spec.center.y = alt_center;            
                that.current_y = 0
            }
		};

        that.checkRow = function(mx){
            //console.log(mx)
            //If I think about it, I might be able to derive an equation to 
            // get which two(?) bricks it could be colliding with
            // spec.center.x (~50 for the sake of example) / canvas.width 500 * 10 = 1.
            // spec.center.x (~250) / canvas.width (500) = .5 * 10 == 5. 
            var cell = Math.floor((spec.center.x / canvas.width) *10)
            if(mx[cell].getStatus()){
                mx[cell].explode()
                that.flipY()
            }
        }

        that.checkCollisions = function(brickMatrix){
            //if ball_y is greater than the value of the lowest brick, return
            //else, determine ball_x and check against row w/in ball_y
            if(typeof(brickMatrix)!='undefined'){
                var row = 0
                //if(spec.center.y < 150 && spec.center.y > 130){console.log('blue');that.checkRow(brickMatrix[4])}    
                //if(spec.center.y < 130 && spec.center.y > 110){console.log('pink');that.checkRow(brickMatrix[3])}    
                //if(spec.center.y < 110 && spec.center.y > 90){console.log('yellow');that.checkRow(brickMatrix[2])}    
                //if(spec.center.y < 90 && spec.center.y > 70){console.log('green');that.checkRow(brickMatrix[1])}    
                //if(spec.center.y < 70 && spec.center.y > 50){console.log('red');that.checkRow(brickMatrix[0])}    
                //if(spec.center.y < 50){alert('top')}
                if(spec.center.y < 135 && spec.center.y > 115){that.checkRow(brickMatrix[4])}    
                if(spec.center.y < 110 && spec.center.y > 90){that.checkRow(brickMatrix[3])}    
                if(spec.center.y < 85 && spec.center.y > 65){that.checkRow(brickMatrix[2])}    
                if(spec.center.y < 60 && spec.center.y > 40){that.checkRow(brickMatrix[1])}    
                if(spec.center.y < 35 && spec.center.y > 15){that.checkRow(brickMatrix[0])}    
                    
                //console.log('x:',spec.center.x, 'y',spec.center.y);
            }

        }

        that.validMove = function(elapsedTime, x, w, brickMatrix){
            that.checkCollisions(brickMatrix)
            if(that.current_x == 1){
                for(var i = 0; i < that.current_x_depth; i++){
                    that.moveRight(elapsedTime)
                }
            }
            else{
                for(var i = 0; i < that.current_x_depth; i++){
                    that.moveLeft(elapsedTime)
                }
            }
            if(that.current_y == 1){
                for(var i = 0; i < that.current_y_depth; i++){
                    that.moveDown(elapsedTime, x, w)
                }
            }
            else{
                for(var i = 0; i < that.current_y_depth; i++){
                    that.moveUp(elapsedTime)
                }
            }
        }

        that.keepGoing = function(elapsedTime){

        }

        that.changeCourse = function(elapsedTime){

        }
        
        that.move = function(elapsedTime, x, w, brickMatrix){
            that.validMove(elapsedTime, x, w, brickMatrix)
            
        }

        that.stickToPaddle = function(pos, elapsedTime){
            if(game_begin == false){
                if(pos > spec.center.x){
                    that.moveRight(elapsedTime)
                }
                if(pos < spec.center.x){
                    that.moveLeft(elapsedTime)
                }
            }
        }

		that.draw = function() {
			if (ready) {
				context.save();
				
				context.translate(spec.center.x, spec.center.y);
				context.rotate(spec.rotation);
				context.translate(-spec.center.x, -spec.center.y);
				
				context.drawImage(
					image, 
					spec.center.x - spec.width/2, 
					spec.center.y - spec.height/2,
					spec.width, spec.height);
				
				context.restore();
			}
		};
		
		return that;
	}


	
	//------------------------------------------------------------------
	//
	// This is used to create a texture function that can be used by client
	// code for rendering.
	//
	//------------------------------------------------------------------
	function Texture(spec) {
		var that = {},
			ready = false,
			image = new Image();
		
		//
		// Load the image, set the ready flag once it is loaded so that
		// rendering can begin.
		image.onload = function() { 
			ready = true;
		};
		image.src = spec.image;
		
		that.rotateRight = function(elapsedTime) {
			spec.rotation += spec.rotateRate * (elapsedTime / 1000);
		};

        that.getPosition = function(){
            return spec.center.x
        }

        that.getWidth = function(){
            return spec.width
        }
		
		that.rotateLeft = function(elapsedTime) {
			spec.rotation -= spec.rotateRate * (elapsedTime / 1000);
		};
		
		that.moveLeft = function(elapsedTime) {
            var new_center = spec.center.x - spec.moveRate * (elapsedTime/1000);
            if(new_center > 0){
			    spec.center.x = new_center;            
            }
		};
		
		that.moveRight = function(elapsedTime) {
            var new_center = spec.center.x + spec.moveRate * (elapsedTime/1000);
            if(new_center < canvas.width){
			    spec.center.x = new_center;            
            }
            
		};
		
		that.moveUp = function(elapsedTime) {
			spec.center.y -= spec.moveRate * (elapsedTime / 1000);
		};
		
		that.moveDown = function(elapsedTime) {
			spec.center.y += spec.moveRate * (elapsedTime / 1000);
		};
        

		
		that.draw = function() {
			if (ready) {
				context.save();
				
				context.translate(spec.center.x, spec.center.y);
				context.rotate(spec.rotation);
				context.translate(-spec.center.x, -spec.center.y);
				
				context.drawImage(
					image, 
					spec.center.x - spec.width/2, 
					spec.center.y - spec.height/2,
					spec.width, spec.height);
				
				context.restore();
			}
		};
		
		return that;
	}

	function Brick(spec) {
		var that = {},
			ready = false,
			image = new Image();
		
		//
		// Load the image, set the ready flag once it is loaded so that
		// rendering can begin.
		image.onload = function() { 
			ready = true;
		};
		image.src = spec.image;
		
        that.getPosition = function(){
            return spec.center.x
        }

        that.erase = function(){
            ready = false;
        }

        that.getStatus = function(){
            return ready;
        }

        that.getWidth = function(){
            return spec.width
        }
		
        that.explode = function(){
            //alert("you haven't written explode yet")
            that.erase();

        }

		that.draw = function() {
			if (ready) {
				context.save();
				
				context.translate(spec.center.x, spec.center.y);
				context.rotate(spec.rotation);
				context.translate(-spec.center.x, -spec.center.y);
				
				context.drawImage(
					image, 
					spec.center.x - spec.width/2, 
					spec.center.y - spec.height/2,
					spec.width, spec.height);
				
				context.restore();
			}
		};
		
		return that;
	}

	function BrickMatrix(spec) {
		var that = {},
			ready = false,
            mx = [];
            
    
		
        for(var i = 0; i < 5; i++){
            var img
            switch(i){
                case 0:
                    img = 'images/brickRed.png' 
                    break;
                case 1: 
                    img = 'images/brickGreen.png' 
                    break;
                case 2: 
                    img = 'images/brickOrange.png' 
                    break;
                case 3: 
                    img = 'images/brickPink.png' 
                    break;
                default: 
                    img = 'images/paddle.png' 
            }
            //console.log(img)
            mx.push(new Array())
            for(var j = 0; j < 10; j++){
                mx[i].push(Brick({
	        		image : img,
	        		center : { x : (j+.5)*100, y : (i+1)*25 },
	        		width : 95, height : 20,
	        		moveRate : 500,			// pixels per second
	        		rotateRate : 3.14159	// Radians per second
	        	}))
            }
        }
        ready = true;

        that.getBricks = function(){
            return mx
        }

		that.draw = function() {
			if (ready) {
                //TODO draw each brick still alive in the matrix
                mx.forEach(function(row){
                    row.forEach(function(cell){
                        cell.draw()
                    })
                })
			}
		};
        return that;
    }


	return {
		clear : clear,
		Texture : Texture,
        Ball : Ball,
        BrickMatrix : BrickMatrix,
	};
}());

//------------------------------------------------------------------
//
// This function performs the one-time game initialization.
//
//------------------------------------------------------------------
MyGame.main = (function(graphics, input) {
	'use strict';

    var drawBricks = true;
	var lastTimeStamp = performance.now(),
		myKeyboard = input.Keyboard(),
		myTexture = graphics.Texture( {
			image : 'images/paddle.png',
			center : { x : 100, y : 400 },
			width : 100, height : 20,
			moveRate : 500,			// pixels per second
			rotateRate : 3.14159	// Radians per second
		});


    var myBricks = graphics.BrickMatrix({
            mx : [[]]
        });


	var	myBall = graphics.Ball( {
			image : 'images/ball.png',
			center : { x : 100, y : 375 },
			width : 25, height : 25,
			moveRate : 100,			// pixels per second
			rotateRate : 3.14159	// Radians per second
		});


    myBall.newGame(drawBricks)

	//------------------------------------------------------------------
	//
	// Process the registered input handlers here.
	//
	//------------------------------------------------------------------
	function processInput(elapsedTime) {
		myKeyboard.update(elapsedTime);
	}
	
	//------------------------------------------------------------------
	//
	// Update the state of the "model" based upon time.
	//
	//------------------------------------------------------------------
	function update(elapsedTime) {
		// Only we don't have anything to do here, kind of a boring game
        if(myBall.getGameStatus() == false){
            myBall.stickToPaddle(myTexture.getPosition(), elapsedTime)
        }
        else{
            //console.log('move called')
            myBall.validMove(elapsedTime, myTexture.getPosition(), myTexture.getWidth(), myBricks.getBricks())
            myBall.move(elapsedTime, myTexture.getPosition(), myTexture.getWidth())    
        }
	}

	//------------------------------------------------------------------
	//
	// Render the state of the "model", which is just our texture in this case.
	//
	//------------------------------------------------------------------
	function render(elapsedTime) {
        if(Math.floor(elapsedTime) > 3){
		    graphics.clear();
		myTexture.draw();
        myBall.draw();
        myBricks.draw();
        }
	}

	//------------------------------------------------------------------
	//
	// This is the Game Loop function!
	//
	//------------------------------------------------------------------
	function gameLoop(time) {

		var elapsedTime = time - lastTimeStamp;
		lastTimeStamp = time;

		processInput(elapsedTime);
		update(elapsedTime);
		render(elapsedTime);

		requestAnimationFrame(gameLoop);
	};

	console.log('game initializing...');
	
	//
	// Create the keyboard input handler and register the keyboard commands
	myKeyboard.registerCommand(KeyEvent.DOM_VK_A, myTexture.moveLeft);
	myKeyboard.registerCommand(KeyEvent.DOM_VK_D, myTexture.moveRight);
	//myKeyboard.registerCommand(KeyEvent.DOM_VK_W, myTexture.moveUp);
	//myKeyboard.registerCommand(KeyEvent.DOM_VK_S, myTexture.moveDown);
	//myKeyboard.registerCommand(KeyEvent.DOM_VK_Q, myTexture.rotateLeft);
	//myKeyboard.registerCommand(KeyEvent.DOM_VK_E, myTexture.rotateRight);

	//
	// Get the game loop started
	requestAnimationFrame(gameLoop);
 
}(MyGame.graphics, MyGame.input));

