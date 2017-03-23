MyGame.screens['high-scores'] = (function(game) {
	'use strict';
	
	function initialize() {
		document.getElementById('id-high-scores-back').addEventListener(
			'click',
			function() { game.showScreen('main-menu'); });
	}
	
	function run() {
		//
		// I know this is empty, there isn't anything to do.
        //MyGame.persistence.add('bob', 89)
        MyGame.persistence.report()
	}
	
	return {
		initialize : initialize,
		run : run
	};
}(MyGame.game));



MyGame.persistence = (function () {
        'use strict';
        var highScores = {},
            previousScores = localStorage.getItem('MyGame.highScores');
        if (previousScores !== null) {
            highScores = JSON.parse(previousScores);
        }

        function add(key, value) {
            for (var keys in highScores){
                if(highScores[keys] < value){
                    highScores[key] = value;
                    delete highScores[keys]
                    break;
                }    
                else{
                    highScores[key] = value;    
                }
            }
            localStorage['MyGame.highScores'] = JSON.stringify(highScores);
        }

        function remove(key) {
            delete highScores[key];
            localStorage['MyGame.highScores'] = JSON.stringify(highScores);
        }

        function report() {
            var htmlNode = document.getElementById('div-console'),
                key;
            
            htmlNode.innerHTML = '';
            for (key in highScores) {
                htmlNode.innerHTML += ('Name: ' + key + ' | Score: ' + highScores[key] + '<br/>'); 
            }
            htmlNode.scrollTop = htmlNode.scrollHeight;
        }

        return {
            add : add,
            remove : remove,
            report : report
        };
    }())
