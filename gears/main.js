var it;
var img;
var scrn_ctx;
var coff_ctx;
var scrn_ctx;
var ctx;

function init() {
  it = 0;
  img = document.getElementById("programming");
  ctx = document.getElementById('gears').getContext('2d');
  scrn_ctx = document.getElementById('screen').getContext('2d');
  coff_ctx = document.getElementById('coffee').getContext('2d');
  window.requestAnimationFrame(draw);
}

function draw() {

  //
  //scrn_ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  scrn_ctx.strokeStyle = 'rgb(1,'+it/2+','+(it+50)+')';
  //scrn_ctx.clearRect(0, 0, 300, 300);
  scrn_ctx.drawImage(img, 0, 0);
  scrn_ctx.moveTo(159, 245);
  scrn_ctx.lineTo(159, 230);
  //scrn_ctx.stroke();

  scrn_ctx.moveTo(148, 220);
  scrn_ctx.lineTo(95, 220);
  //scrn_ctx.stroke();

  scrn_ctx.moveTo(159, 210);
  scrn_ctx.lineTo(159, 190);
  //scrn_ctx.stroke();

  scrn_ctx.moveTo(148, 182);
  scrn_ctx.lineTo(66, 182);
  scrn_ctx.lineTo(66, 142);
  //scrn_ctx.stroke();

  scrn_ctx.moveTo(159, 173);
  scrn_ctx.lineTo(159, 140);
  scrn_ctx.lineTo(230, 140);
  scrn_ctx.lineTo(230, 105);


  
      coff_ctx.clearRect(0, 0, 300, 300); // clear canvas
      //speed = time.getSeconds()/20;
      coff_ctx.translate(0, 2);
      it += 2;
      if ( it > 400 ){ it = -100; coff_ctx.translate(0,-501);}
   
      coff_ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      coff_ctx.strokeStyle = 'rgba(255, 255, 255, 1)';

      //coff_ctx.fillRect(130, 10, 40, 60); // coffee cup
      coff_ctx.moveTo(130, 15);
      coff_ctx.lineTo(170, 15);
      coff_ctx.lineTo(160, 70);
      coff_ctx.lineTo(140, 70);
      coff_ctx.lineTo(130, 15);
      coff_ctx.fill();
      //coff_ctx.stroke();

  // green circle
      coff_ctx.beginPath();
      coff_ctx.fillStyle = 'rgba(0, 112, 74, 1)';
      coff_ctx.arc(150, 35, 10, 0, Math.PI * 2, false); //
   //   coff_ctx.stroke();
      coff_ctx.fill();
  // lid
      coff_ctx.save();
      coff_ctx.transform(1,0,0,0.25,1,1);
      coff_ctx.beginPath();
      coff_ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      coff_ctx.arc(149, 35, 22, 0, Math.PI * 2, false); //
      coff_ctx.fill();
      coff_ctx.restore();


  ctx.globalCompositeOperation = 'destination-over';
  ctx.clearRect(0, 0, 300, 300); // clear canvas

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  var time = new Date();
  var rot = time.getMilliseconds()/50;
  ctx.save();
  //ctx.translate(150, 150);

  function drawGear(gear){
    ctx.save();
    ctx.beginPath();
    ctx.arc(gear.center, gear.center, gear.inner_rad, 0, Math.PI * 2, false); //
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(gear.center, gear.center, gear.outer_rad, 0, Math.PI * 2, false); //
    ctx.stroke();

    for (var r = 0; r < 4; r++){
      ctx.translate(gear.center, gear.center);
      if(r > 0){
        ctx.rotate(-rot * gear.dir);
      }
      ctx.rotate(rot * gear.dir+(2*gear.dir) );
      //console.log(rot);
      ctx.translate(-gear.center, -gear.center);
      //ctx.translate(time.getMilliseconds()/5, 0);
      ctx.fillRect(gear.x, gear.y, gear.size, gear.size); //
    }
    ctx.restore();
  }

  var gear = {
    x: 30,
    y: 30,
    center: 70,
    size: 80,
    inner_rad: 10,
    outer_rad: 20,
    dir: 1 
  }

  var gear2 = {
    x: 100,
    y: 100,
    center: 140,
    size: 80,
    inner_rad: 10,
    outer_rad: 20,
    dir: -1 
  }

  var gear3 = {
    x: 170,
    y: 170,
    center: 210,
    size: 80,
    inner_rad: 10,
    outer_rad: 20,
    dir: 1 
  }
  drawGear(gear);
  drawGear(gear2);
  drawGear(gear3);

  scrn_ctx.stroke();
  window.requestAnimationFrame(draw);
}

init();

