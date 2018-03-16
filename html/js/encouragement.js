
function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fade(element) {
   await sleep(2000);
   var op = 1;  // initial opacity
   var timer = setInterval(function () {
       if (op <= 0.1){
           clearInterval(timer);
           element.style.display = 'none';
       }
       element.style.opacity = op;
       element.style.filter = 'alpha(opacity=' + op * 100 + ")";
       op -= op * 0.1;
   }, 50);
}

async function unfade(element) {
    var op = 0.1;  // initial opacity
    element.style.display = 'block';
    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += op * 0.1;
    }, 10);
}


function encourage(){
var encouragement = ["You're doing so well", "It's very hard right now...", "That's it.. that's the way",
 "Don't change a thing", "You're doing it!", "You are so strong", "You're working with this so well", 
 "Every moment of difficulty is a moment closer to your goal", "Let your body tell you what to do", 
 "It's okay to cry", "I'm right here", "I will help you", "Let me help you more", 
 "Let me take some of the tension away", "Trust that you CAN do it", "Perfect... just perfect", 
 "Just keep on keeping on", "You're doing exactly what you need to be doing", "Release and open up for the baby",
 "Breathe", "Your pain is your power. It's telling you what you need to do", "I'm proud of you",
 "Try not to resist the contractions. They are bringing Calvin", "Contractions are your energy and your power",
 "Let's take it one contraction at a time", "Follow me", "That was a good one!", "Focus on your breathing",
 "Let yourself feel it", "You can do it!", "Let the pain work for you", "Go deeper, that's the way", 
 "Ride the contractions like a wave", "Those are good sounds", "Ease the baby out", "Open/Release/Let the baby come"]
   document.body.addEventListener('click', encourage, true); 
   var n = Math.floor(Math.random() * encouragement.length);
   fade(document.getElementById("enc"));
   document.getElementById("enc").innerHTML = encouragement[n]; 
   unfade(document.getElementById("enc"));
   
//   document.getElementById("enc").fadeIn();
} 

