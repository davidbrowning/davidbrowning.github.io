let canvas;
let context;
let myCell;

document.addEventListener('keydown', function(event) {
    if(event.keyCode == 37) {
        myCell.moveLeft();
    }
    else if(event.keyCode == 39) {
        myCell.moveRight();
    }
    else if(event.keyCode == 38) {
        myCell.moveUp();
    }
    else if(event.keyCode == 40) {
        myCell.moveDown();
    }
});

function cell(spec){
    let that = {};
    that.moveRight = function(){
        spec.position.x = spec.position.x + spec.width;
    }
    that.moveLeft = function(){
        spec.position.x = spec.position.x - spec.width;
    }
    that.moveUp = function(){
        spec.position.y = spec.position.y - spec.height;
    }
    that.moveDown = function(){
        spec.position.y = spec.position.y + spec.height;
    }
    that.draw = function(){
        context.fillStyle = spec.color;
        context.arc(spec.position.x, spec.position.y,0,40,true);
        context.fill();
        context.strokeRect(spec.position.x,spec.position.y,spec.width,spec.height);
    }
    return that;
}


myCell = cell({
    position: {x: 50, y: 50},
    height: 50,
    width: 50,
    color: 'rgb(0,255,0)'
})


function init(){
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    gameLoop(performance.now());
}

function gameLoop(timestamp){
    update();
    render();
}

function update(){

}

function render(){
    context.save();
    context.clearRect(0,0,canvas.width, canvas.height);
    myCell.draw();
    context.restore();
    requestAnimationFrame(gameLoop);
}
