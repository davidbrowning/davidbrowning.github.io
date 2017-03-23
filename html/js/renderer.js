/*jslint browser: true, white: true */
/*global CanvasRenderingContext2D, requestAnimationFrame, console, MyGame */

// ------------------------------------------------------------------
//
// This is the graphics rendering code for the game.
//
// ------------------------------------------------------------------
MyGame.graphics = (function() {
	'use strict';
    var stop = false
	
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
    function Score(spec){
        var that = {}

        that.draw = function(){
            context.font = '12px serif';
            context.fillStyle = 'rgb(255,255,255)'
            context.fillText('Current Score: '+MyGame.current_score, canvas.width-100, canvas.height-20)
        }

        return that
    }

    function CountDown(spec){
        var that = {}
        
        that.decrement = function(){
            spec.count--;
        }

        that.setValue = function(x){
            spec.count = x
        }

        that.draw = function(){
            context.font = '50px serif';
            context.fillStyle = 'rgb(255,255,255)'
            context.fillText(spec.count, canvas.width/2, canvas.height/2)
        }

        return that
    }

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
        that.split = false;

        that.getSplit = function(){
            return that.split
        }

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
            if(Math.floor(spec.center.y) > canvas.height-120 && Math.floor(spec.center.y) < canvas.height - 115){
                //console.log('hit')
                if(spec.center.x > x-(w/2) && spec.center.x < (x+(w/2))){
                    //TODO if on left half of paddle go left, right? go right.
                    var paddle_left = (x-(w/2));
                    var paddle_mid = x; //?
                    var paddle_right = (x+(w/2));
                    //console.log('mid',paddle_mid,'left',paddle_left,'right',paddle_right);
                    if(spec.center.x > paddle_left && spec.center.x < paddle_mid){
                        that.current_x = 0;
                        /*if(spec.center.x < ((paddle_mid - paddle_left)/2)+paddle_left && that.current_x_depth < 3){
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
                        //console.log("current depth", that.current_x_depth)*/
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
            var new_center = spec.center.x - spec.moveRate * (elapsedTime/spec.speed);
            if(new_center > 0 && that.current_x == 0){
			    spec.center.x = new_center;            
            }
            else{
                var alt_center = spec.center.x + spec.moveRate * (elapsedTime/spec.speed);
                spec.center.x = alt_center
                that.current_x = 1
            }
		};
		
		that.moveRight = function(elapsedTime) {
            var new_center = spec.center.x + spec.moveRate * (elapsedTime/spec.speed);
            if(new_center < canvas.width && that.current_x == 1){
			    spec.center.x = new_center;            
            }
            else{
                var alt_center = spec.center.x - spec.moveRate * (elapsedTime/spec.speed);
			    spec.center.x = alt_center;            
                that.current_x = 0
            }
            
		};
		
		that.moveUp = function(elapsedTime) {
            var new_center = spec.center.y - spec.moveRate * (elapsedTime/spec.speed);
            if(new_center > 0 && that.current_y == 0){
			    spec.center.y = new_center;            
            }
            else{
                var alt_center = spec.center.y + spec.moveRate * (elapsedTime/spec.speed);
                spec.center.y = alt_center
                that.current_y = 1
            }
		};
		
		that.moveDown = function(elapsedTime, x, w) {
            var new_center = spec.center.y + spec.moveRate * (elapsedTime/spec.speed);
            if(new_center < canvas.height && that.current_y == 1){
                that.checkPaddle(elapsedTime, x, w, new_center)
                spec.center.y = new_center;             
            }
            else{
                var alt_center = spec.center.y - spec.moveRate * (elapsedTime/spec.speed);
			    spec.center.y = alt_center;            
                //that.current_y = 0
                that.current_x = -1

            }
            if(that.current_x == -1){
                MyGame.stop = true;
            }
		};

        that.exp_count = 0;

        that.particle = {}

        that.getParticle = function(){
            return that.particle
        }

        that.checkRow = function(mx, points){
            var cell = Math.floor((spec.center.x / canvas.width) *14)
            if(mx[cell].getStatus()){
                that.particle = mx[cell].explode()
                MyGame.current_score += points;
                that.exp_count++;
                if(that.exp_count === 4){
                    spec.speed = spec.speed - 100
                }
                if(that.exp_count === 12){
                    spec.speed = spec.speed - 100;
                }
                if(that.exp_count === 36){
                    spec.speed = spec.speed - 100;
                }
                if(that.exp_count === 62){
                    spec.speed = spec.speed - 100;
                }
                if(that.exp_count === 112){
                    MyGame.gameover()
                }
                //console.log(spec.speed)
                //console.log(that.exp_count)
                that.flipY()
            }
        }

        that.checkCollisions = function(brickMatrix){
            if(typeof(brickMatrix)!='undefined'){
                var row = 0
                //if(spec.center.y < 150 && spec.center.y > 130){console.log('blue');that.checkRow(brickMatrix[4])}    
                if(spec.center.y < 210 && spec.center.y > 190){that.checkRow(brickMatrix[7], 1)}    
                if(spec.center.y < 185 && spec.center.y > 165){that.checkRow(brickMatrix[6], 1)}    
                if(spec.center.y < 160 && spec.center.y > 140){that.checkRow(brickMatrix[5], 2)}    
                if(spec.center.y < 135 && spec.center.y > 115){that.checkRow(brickMatrix[4], 2)}    
                if(spec.center.y < 110 && spec.center.y > 90){that.checkRow(brickMatrix[3], 3)}    
                if(spec.center.y < 85 && spec.center.y > 65){that.checkRow(brickMatrix[2], 3)}    
                if(spec.center.y < 60 && spec.center.y > 40){that.checkRow(brickMatrix[1], 5)}    
                if(spec.center.y < 35 && spec.center.y > 15){that.checkRow(brickMatrix[0], 5);that.split = true}    
                
                    
                //console.log('x:',spec.center.x, 'y',spec.center.y);
                //console.log(MyGame.current_score)
                
            }

        }

        that.validMove = function(elapsedTime, x, w, brickMatrix, paddle){
            that.checkCollisions(brickMatrix,paddle)
            if(that.current_x == 1){
                for(var i = 0; i < that.current_x_depth; i++){
                    that.moveRight(elapsedTime,1000)
                }
            }
            else{
                for(var i = 0; i < that.current_x_depth; i++){
                    that.moveLeft(elapsedTime,1000)
                }
            }
            if(that.current_y == 1){
                for(var i = 0; i < that.current_y_depth; i++){
                    that.moveDown(elapsedTime, x, w, 1000)
                }
            }
            else{
                for(var i = 0; i < that.current_y_depth; i++){
                    that.moveUp(elapsedTime, 1000)
                }
            }
        }

        that.keepGoing = function(elapsedTime){

        }

        that.changeCourse = function(elapsedTime){

        }
        
        that.move = function(elapsedTime, x, w, brickMatrix,paddle){
            that.validMove(elapsedTime, x, w, brickMatrix,paddle)
            
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
		
        that.isSplit = false;

        that.split = function(){
            if(that.isSplit == false){
                spec.width = spec.width/2
                that.isSplit = true;
            }
        }

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
            var particle = 0,
                aliveParticles = [],
                negX,
                negY,
                p;
        
                negX = Math.random() < 0.5 ? 1 : -1;
                negY = Math.random() < 0.5 ? 1 : -1;
                p = {
                    getPosition : function(){return this.position},
                    position: {x: spec.center.x, y: spec.center.y},
                    direction: {x: Math.random() * negX, y: Math.random() * negY},
                    speed: Math.random() * 1, // pixels per second
                    rotation: 0,
                    lifetime:  Math.random() * 4    // seconds
                };
                //console.log(p.position.x)
               
            that.erase();
            return([p.position.x, p.position.y])

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
            
    
		
        for(var i = 0; i < 8; i++){
            var img
            switch(i){
                case 0:
                    img = 'images/brickRed.png' 
                    break;
                case 1:
                    img = 'images/brickRed.png' 
                    break;
                case 2: 
                    img = 'images/brickGreen.png' 
                    break;
                case 3: 
                    img = 'images/brickGreen.png' 
                    break;
                case 4: 
                    img = 'images/brickOrange.png' 
                    break;
                case 5: 
                    img = 'images/brickOrange.png' 
                    break;
                case 6: 
                    img = 'images/brickPink.png' 
                    break;
                case 7: 
                    img = 'images/brickPink.png' 
                    break;
                default: 
                    img = 'images/paddle.png' 
            }
            //console.log(img)
            mx.push(new Array())
            for(var j = 0; j < 14; j++){
                mx[i].push(Brick({
	        		image : img,
	        		center : { x : (j+.5)*72, y : (i+1)*25 },
	        		width : 65, height : 20,
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

    function Particle(spec) {
        var that = {};
        
        spec.width = (Math.random() * 20);
        spec.height = (Math.random() * 5);
        spec.fill = 'rgba(100, 0, 255, .75)'; 
        spec.stroke = 'rgba(0, 0, 0, 1)';
        spec.alive = 0;
        that.getPosition = function(){
            return spec.position.x
        }

        that.update = function(elapsedTime) {
            //
            // We work with time in seconds, elapsedTime comes in as milliseconds
            elapsedTime = elapsedTime / 1000;
            //
            // Update how long it has been alive
            spec.alive += elapsedTime;
            
            //
            // Update its position
            spec.position.x += (elapsedTime * spec.speed * spec.direction.x);
            spec.position.y += (elapsedTime * spec.speed * spec.direction.y);
            
            //
            // Rotate proportional to its speed
            spec.rotation += spec.speed / 500;
            
            //
            // Return true if this particle is still alive
            return (spec.alive < spec.lifetime);
        };

        that.draw = function() {
            context.save();
            context.translate(spec.position.x + spec.width / 2, spec.position.y + spec.height / 2);
            context.rotate(spec.rotation);
            context.translate(-(spec.position.x + spec.width / 2), -(spec.position.y + spec.height / 2));
            
            context.fillStyle = spec.fill;
            context.fillRect(spec.position.x, spec.position.y, spec.width, spec.height);
            
            context.strokeStyle = spec.stroke;
            context.strokeRect(spec.position.x, spec.position.y, spec.width, spec.height);

            context.restore();
        };
        
        return that;
    }

function Lives(spec){
    var that = {},
    ready = false,
    image = new Image();

		image.onload = function() { 
			ready = true;
		};
    image.src = spec.image;
    that.draw = function(){
				context.save();
				
				context.translate(spec.center.x, spec.center.y);
				context.rotate(spec.rotation);
				context.translate(-spec.center.x, -spec.center.y);
				
                for(var i = 0; i < MyGame.lives; i++){
				context.drawImage(
					image, 
					canvas.width - (spec.width * (i + 2)), 
					spec.height/4,
					spec.width - 10, 5);
				
				context.restore();
                }


    }

    return that;
    }


	return {
		clear : clear,
		Texture : Texture,
        Score : Score,
        CountDown : CountDown,
        Ball : Ball,
        BrickMatrix : BrickMatrix,
        Particle : Particle,
        Lives : Lives
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

    function setLastTimeStamp(){
        lastTimeStamp = performance.now()
    }

    var myBricks = graphics.BrickMatrix({
            mx : [[]]
        });
    var myCount = graphics.CountDown({
        count :3
        })

    var myLives = graphics.Lives({
	        		image : 'images/paddle.png', 
	        		center : { x :1, y : 10 },
	        		width : 75, height : 20
	        	});

	var	myBall = graphics.Ball( {
			image : 'images/ball2.png',
			center : { x : 100, y : 375 },
			width : 25, height : 25,
			moveRate : 100,			// pixels per second
			rotateRate : 3.14159, // Radians per second
            speed: 1000
		});

    var myScore = graphics.Score();

    myBall.newGame(drawBricks)

        

	//------------------------------------------------------------------
	//
	// Process the registered input handlers here.
	//
	//------------------------------------------------------------------
	function processInput(elapsedTime) {
		myKeyboard.update(elapsedTime);
	}
	
    var particles = [],
        lastTimeStamp = performance.now();


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
            var p = myBall.getParticle()
            var particle = 0,
                aliveParticles = [],
                negX,
                negY,
                p1;

                aliveParticles.length = 0;
                for (particle = 0; particle < particles.length; particle++) {
                    //
                    // A return value of true indicates this particle is still alive
                    if (particles[particle].update(elapsedTime)) {
                        aliveParticles.push(particles[particle]);
                    }
                }
                particles = aliveParticles;

                //
                // Generate some new particles
                for (particle = 0; particle < 8; particle++) {
                    negX = Math.random() < 0.5 ? 1 : -1;
                    negY = Math.random() < 0.95 ? 1 : -1;
                    graphics.stop = true;
                    p1 = {
                        position: {x: p[0], y: p[1]},
                        direction: {x: Math.random() * negX, y: Math.random() * negY},
                        speed: Math.random() * 20, // pixels per second
                        rotation: 4,
                        lifetime:  Math.random() *2     // seconds
                    };
                    
                    particles.push(graphics.Particle(p1));
                }

            myBall.validMove(elapsedTime, myTexture.getPosition(), myTexture.getWidth(), myBricks.getBricks())
            myBall.move(elapsedTime, myTexture.getPosition(), myTexture.getWidth())    
            if(myBall.getSplit()){
                myTexture.split()
            }
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
        myScore.draw();
        //console.log(myLives)
        myLives.draw();
        if(MyGame.TotalTime < 3){
            myCount.draw();
        }
        for(var particle = 0; particle < particles.length; particle++){
            particles[particle].draw()
        }
        
        }
	}

    MyGame.TotalTime = 0;
    MyGame.lives = 3;
    MyGame.stop = false;
    MyGame.gameover = function(){
        var person = prompt("Please enter your name");
        MyGame.persistence.add(person, MyGame.current_score)
    }

	//------------------------------------------------------------------
	//
	// This is the Game Loop function!
	//
    //
	//------------------------------------------------------------------
	function gameLoop(time) {

		var elapsedTime = time - lastTimeStamp;
		lastTimeStamp = time;
        MyGame.TotalTime += elapsedTime/1000;
        var secondsPassed = Math.floor(MyGame.TotalTime)
        if(MyGame.TotalTime > 3){
		    update(elapsedTime);
        }
        else{
            myCount.setValue(3 - secondsPassed)
        }
		processInput(elapsedTime);
		render(elapsedTime);
        if(MyGame.stop === false){
		    requestAnimationFrame(gameLoop);
        }
        else{
            MyGame.lives--;
            if(MyGame.lives < 1){
                MyGame.gameover()
            }
            else{
                MyGame.nextLife()
            }
        }
	};

    MyGame.nextLife = function(){
        MyGame.stop = false;
	    myBall = graphics.Ball( {
	   	    image : 'images/ball2.png',
	   	    center : { x : myTexture.getPosition(), y : 375 },
	   	    width : 25, height : 25,
	   	    moveRate : 100,			// pixels per second
	   	    rotateRate : 3.14159, // Radians per second
            speed: 1000
	    });
        myBall.newGame(drawBricks)
        MyGame.TotalTime = 0;
        requestAnimationFrame(gameLoop);
    
    }
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
    MyGame.current_score = 0;
    MyGame.go = function(){
        setLastTimeStamp()
        requestAnimationFrame(gameLoop)    
    }
 
}(MyGame.graphics, MyGame.input));

