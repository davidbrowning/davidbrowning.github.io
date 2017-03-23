MyGame.screens['game-play'] = (function(game) {
	'use strict';
	var cancelNextRequest = false;
	
	function initialize() {
		document.getElementById('id-game-play-back').addEventListener(
		'click',
		function() {
			cancelNextRequest = true; 
			game.showScreen('main-menu'); 
		});
	}

	//------------------------------------------------------------------
	//
	// This is the Game Loop function!
	//
	//------------------------------------------------------------------
	function gameLoop(time) {
		
		// update(elapsedTime);
		// render(elapsedTime);
		
		if (!cancelNextRequest) {
			requestAnimationFrame(gameLoop);
		}
	}
	
	function run() {
		//
		// Start the animation loop
        MyGame.go()
		cancelNextRequest = false;
		//requestAnimationFrame(gameLoop);
	}
	
	return {
		initialize : initialize,
		run : run
	};
}(MyGame.game));
