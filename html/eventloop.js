var eventArray = [];
var start = null;
var canvas = document.getElementById("myCanvas");
var killLoop = false;
var updateArray = [];

function setStop(){
 killLoop = true;
}
function setGo(){
 killLoop = false;
 gameLoop(performance.now());
}

function gameLoop(timestamp) {
 if (!start) start = timestamp;
 var progress = timestamp - start;
 //console.log(eventArray);
 if(!killLoop){
  update(timestamp);
  render();
 }
}


function newEvent(name,interval,rept){
 //console.log('Event name: ' +name + '; Event interval: ' + interval + '; Event Repetitions: ' + rept);
 let event = {
  startTime: performance.now(),
  event_name: name,
  event_interval: interval,
  event_repetition: rept,
  event_start_rept: rept
 };
 eventArray.push(event);
 gameLoop(performance.now());
}


function update(time){
 //TODO: create a list of things to be rendered by determining if it is the appropriate interval, 
 // and if the repetitions haven't expired. 
 var index;
 updateArray = [];
 for (index = 0; index < eventArray.length; index++){
  //console.log("INDEX: "+index);
  ////console.log("REPETITIONS: "+eventArray[index].event_repetition);
  if(eventArray[index].event_repetition > 0){
   ////console.log("repetitions greater than 0");
   var repetitions_thus_far = (eventArray[index].event_start_rept - eventArray[index].event_repetition);
   //console.log("ESR: "+eventArray[index].event_start_rept);
   // I need time since event started, # times it has already been called. 
   var time_since_start = (time - eventArray[index].startTime);
   //console.log("TSS: "+time_since_start);
   //console.log("RTF: "+repetitions_thus_far);
   var intv = eventArray[index].event_interval;
   var times_called_x_interval = intv * repetitions_thus_far;
   var test = (time_since_start - times_called_x_interval);
   console.log("INTV: "+intv);
   console.log("TCXI: "+times_called_x_interval);
   console.log("TEST: "+test);
   if(test > intv){
     let updater = {
      name_event : eventArray[index].event_name,
      num_remaining : eventArray[index].event_repetition
     };
     eventArray[index].event_repetition--;
     updateArray.push(updater);
    
   }
  }
  else{
   eventArray.splice(index, 1);
  }
 }
}


function render(){
 //TODO: Insert the elements either by drawing them onto the canvas (somehow) or figuring out a better way 
 // to put them in some kind of a scrollable list.
 //document.getElementById("output").innerHTML = updateArray.length;
 if(updateArray.length > 0){
  var i;
  for(i = 0; i < updateArray.length; i++){
   document.getElementById("output").innerHTML += ("Event Name: "+updateArray[i].name_event+" ("+updateArray[i].num_remaining+" remaining)<br />");
   var out = document.getElementById("output");
    out.scrollTop=out.scrollHeight;
  }
 }
 window.requestAnimationFrame(gameLoop);
}

