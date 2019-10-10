var cells
var next_cells
var colors
var num_clicks = 0
var pause = false


function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    click.x = event.clientX - rect.left
    click.y = event.clientY - rect.top
    console.log("x, y", click.x, click.y)
    if(click.x < 50 && click.y < 15){
        pause = ! pause
    }

    if(num_clicks === 0)
    {
        next_cells = [];
        cells = []; // Initialize array
        colors = [];
        for (var i = -1 ; i < width+1; i++) {
            cells[i] = []; // Initialize inner array
            next_cells[i] = []; // Initialize inner array
            colors[i] = [];
            for (var j = -1; j < height+1; j++) { // i++ needs to be j++
                cells[i][j] = 0;
                next_cells[i][j] = 0; // Initialize inner array
                
                colors[i][j] = 'white';
            }
        }
    }
    for (var i = (click.x - user.xl) ; i < (click.x + user.xr); i++) {
        console.log(click, user);
        //cells[i] = []; // Initialize inner array
        //next_cells[i] = []; // Initialize inner array
        for (var j = (click.y - user.yl); j < (click.y + user.yr); j++) { // i++ needs to be j++
            if(cells){
             cells[i][j] = 1;
             next_cells[i][j] = 0; // Initialize inner array
             colors[i][j] = `rgb(${25+num_clicks}, ${num_clicks*2}, ${255-num_clicks})`;
            }
        }
    }

    //console.log("x: " + click.x + " y: " + click.y)
    num_clicks++;
}
var canvas = document.getElementById("canvas")
canvas.addEventListener('mousedown', function(e) {
        getCursorPosition(canvas, e)

})
var ctx = canvas.getContext("2d")
var width
var height
//const canvas = document.querySelector('canvas')


var resize = function() {
  width = window.innerWidth-2
  height = window.innerHeight-2
  canvas.width = width
  canvas.height = height
}
window.onresize = resize
resize()



var click = {
    x: 0,
    y: 0,
}

var user = {
    xl: 20,
    xr: 20,
    yl: 10,
    yr: 10,
}


function update(progress) {
    //cells = []; // Initialize array
    if(cells && next_cells){
        for (var i = 0 ; i < width; i++) {
            //cells[i] = []; // Initialize inner array
            for (var j = 0; j < height; j++) { // i++ needs to be j++
                live_neighbors = 0;
                if(cells[i-1][j-1] === 1){live_neighbors++}
                if(cells[i-1][j] === 1){live_neighbors++}
                if(cells[i-1][j+1] === 1){live_neighbors++}
                if(cells[i][j-1] === 1){live_neighbors++}
                if(cells[i][j+1] === 1){live_neighbors++}
                if(cells[i+1][j-1] === 1){live_neighbors++}
                if(cells[i+1][j] === 1){live_neighbors++}
                if(cells[i+1][j+1] === 1){live_neighbors++}
                if(cells[i][j] === 1){
                    if(live_neighbors < 2){next_cells[i][j] = 0}
                    else if(live_neighbors == 2 && live_neighbors ==3){next_cells[i][j] = 1}
                    else if(live_neighbors > 3){next_cells[i][j] = 0}
                }
                else{
                    if(live_neighbors === 3){
                        next_cells[i][j] = 1;
                    }
                }
            }
        }
    }
}

function draw() {
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)
    //ctx.fillStyle = 'yellow'
    //ctx.fillRect(0,0,45,15)
    ctx.fillStyle = 'white'
    ctx.font = "10px Comic Sans MS";
    if(pause === false){
        ctx.fillText("Pause", 2,10,100, 50); 
    }


    //console.log(`rgb(${num_clicks}, ${num_clicks}, ${255-num_clicks})`)
    if(cells && next_cells){
        for (var i = 0 ; i < width; i++) {
            //cells[i] = []; // Initialize inner array
            for (var j = 0; j < height; j++) { // i++ needs to be j++
                cells[i][j] = next_cells[i][j];
                if(cells[i][j] === 1){
                    ctx.fillStyle = colors[i][j]
                    ctx.fillRect(i, j, 1, 1)
                }
            }
        }
    }



}
function resume(){
    user.xl = parseInt(document.getElementById("xl").value);
    user.xr = parseInt(document.getElementById("xr").value);
    user.yl = parseInt(document.getElementById("yl").value);
    user.yr = parseInt(document.getElementById("yr").value);
    pause = false;
    console.table(user)
}

function loop(timestamp) {
    if(pause === false){  

        var progress = (timestamp - lastRender)

        update(progress)
        draw()
        
        lastRender = timestamp
    }
    else{
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, 100, 15)
        ctx.fillStyle = 'white'
        ctx.fillText("Resume", 2,10,100, 50); 
    }

  window.requestAnimationFrame(loop)

}
var lastRender = 0
window.requestAnimationFrame(loop)