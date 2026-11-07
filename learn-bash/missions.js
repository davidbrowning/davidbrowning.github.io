// missions.js: missions 01-05 from learn-bash, ported from the original bash scripts.
// Story text is the original's, with the player renamed "agent" and paths updated.
'use strict';

function api(sh, io) {
  const s = {
    msg: t => io.out(box(t, sh.pane.cols())),
    cat: name => { const t = PICS[name] || ''; io.out(t.endsWith('\n') ? t : t + '\n'); },
    echo: t => io.out(t + '\n'),
    note: t => io.out('\n' + fold(t, sh.pane.cols() - 1).join('\n') + '\n'),
    read: async p => (await sh.read(p)).trim(),
    pause: p => sh.read(p || 'continue? (press enter)'),
    sleep: ms => sh.sleep(ms),
    run: line => sh.run(line),
    pwd: () => sh.cwd,
    node: p => { try { return FS.get(p); } catch { return null; } },
    tmuxCheck(redo) {
      s.msg('make sure you are in tmux and have a vertical split for this mission');
      if (Term.tmux) { s.echo('LOG: Inside tmux session'); return true; }
      s.msg(redo ? "You aren't in a tmux session... exiting. Use start command when you're ready, re-do mission 02 if you forgot tmux"
        : "You aren't in a tmux session... exiting. Use start command when you're ready, type tmux then enter to enter a tmux session");
      return false;
    },
  };
  return s;
}

async function missionIntro(sh, io) {
  sh.oldpwd = sh.cwd; sh.cwd = HOME + '/mission';
  const s = api(sh, io);
  s.cat('franz.txt');
  s.echo("Your mission, should you accept it, is to find and kill the evil fed franz.\nHe is contained in a file on your system and will be difficult to erase\n");
  s.echo(`In the new 'mission' directory, you will find directories that are numbered.\n\tStart with 01 and as you complete each mission, come back to\n\t${M}\n`);
  if (State.done.size) s.echo('missions complete: ' + [...State.done].sort().join(' ') + '\n');
}

async function startMission(sh, io) {
  let real = sh.cwd; try { real = FS.res(sh.cwd).real; } catch {}
  if (real !== sh.cwd && dirname(real) === M) { sh.cwd = real; } // walked through a portal: land in the real mission dir
  const dir = basename(real);
  const s = api(sh, io);
  io.out(`\nYou are currently in mission: ${dir}\n`);
  const names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const n = /^\d\d$/.test(dir) && dirname(real) === M ? +dir : 0;
  if (!n || n > 10) { io.out(`(missions live in ${M.replace(HOME, '~')}/01 through 10. cd into one, then type start)\n`); return 1; }
  const title = `Mission ${names[n - 1]}`;
  io.out(`\n${title}\n${'='.repeat(11)}\n`);
  const fn = MISSIONS[dir];
  if (!fn) {
    s.msg(`Mission ${dir} is still being ported from the original game. Franz is out there somewhere... while you wait, dad left some things lying around on this computer. Try: ls /home/dave`);
    return 0;
  }
  const ok = await fn(s, sh, io);
  if (ok) { State.done.add(dir); State.save(); }
  return 0;
}

const MISSIONS = {
  async '01'(s) {
    s.msg('you are now running a script. Press Ctrl + c to quit any script');
    s.cat('door.txt');
    s.msg('To begin locating franz, you follow up on a lead. A confidential informant told you about a high tech building that franz may be using. As you approach you find a sealed door. A voice asks you a question...');
    s.msg("what is your 'working directory' right now?");
    const response = await s.read('put another way, what is pwd at this moment?');
    const correct = M + '/01';
    if (s.pwd() !== correct) { s.msg('that is incorrect. Are you in the 01 mission directory?'); return; }
    if (response !== correct) { s.msg('that is incorrect. Type dad for help'); return; }
    s.cat('boom.txt');
    for (const c of 'creek') { s.echo(c); await s.sleep(1000); }
    s.msg('the heavy door swings open');
    s.msg('you enter and find a long staircase');
    s.cat('stairs.txt');
    const a = await s.read('do you want to butt scoot down it? (y/n)');
    if (a !== 'y') { s.msg('You run away crying, maybe franz is too big and too bad for you'); return; }
    s.msg('to butt scoot, you have to find your butt scooting carpet file. The dad command will remind you of what to do to LIST the files in your WORKING DIRECTORY (carefully read the output of the dad command)');
    s.msg('once you\'ve found the carpet file, check what\'s inside with the "cat" command.');
    s.msg('to print the contents of a file, we use "concatinate" - cat for short if your lister found a file called "bob", you could type "cat bob" to spill bob\'s guts');
    s.cat('cat.txt');
    return true;
  },

  async '02'(s) {
    if (!s.tmuxCheck()) return;
    s.msg('you are now running a script. Press Ctrl + c to quit any script');
    if (s.node(M + '/02/carpet')) s.msg('good job, you copied your carpet file!');
    else { s.msg("dude, where's my carpet file? how are you supposed to butt scoot without one? (hints: ls, dad, go back to ../01)"); return; }
    s.cat('slide-stairs.txt');
    s.msg('you take your carpet and slide down the stairs at full speed! At the bottom, you notice a table and on it are those sticky cards where you write your name to tell other people who you are. ');
    await s.pause();
    s.msg('"fill it out and put it on your computer" you\'re going to need this information later. You take a better look at the card');
    await s.pause();
    s.msg('HELLO, my hostname is: _____, my address is ___.___.__._');
    s.msg("wtf is a hostname? you ask yourself... see if your computer knows. Let's unlock a superpower. You are currently inside a program called tmux which has the ability to SPLIT your screen in HALF!!!");
    await s.pause();
    s.msg('read the following');
    for (const w of ['very', 'very', 'very']) { await s.sleep(1000); s.msg(w); }
    await s.sleep(1000); s.msg('closely');
    await s.pause();
    s.msg('To split your screen:');
    s.echo('1. Ctrl+b'); await s.sleep(2000);
    s.echo('2. Take your fingers off the keyboard'); await s.sleep(2000);
    s.echo('3. Press Shift+5');
    s.echo('   (on a phone: tap the ^B key below, then type %)'); await s.sleep(2000);
    s.msg("If it worked right, you can't do anything over here");
    await s.sleep(5000);
    s.cat('smirk.txt'); await s.sleep(3000);
    s.echo('...'); s.cat('smirk2.txt'); await s.sleep(2000);
    s.echo("yawn... I'm going to take a 10 second nap"); await s.sleep(1000);
    s.cat('sleeper.txt'); await s.sleep(10000);
    s.echo('...'); await s.sleep(1000);
    s.cat('smirk3.txt'); s.echo('...'); await s.sleep(1000);
    s.msg('ready to come back over here?'); await s.sleep(3000);
    s.msg('To switch between splits:');
    s.echo('1. Ctrl+b'); await s.sleep(2000);
    s.echo('2. Take your fingers off the keyboard'); await s.sleep(2000);
    s.echo('3. Press the left (or right) arrow key');
    s.echo('   (or just tap the split you want)');
    s.msg("don't forget, you're looking for my hostname.");
    s.echo('');
    let response;
    while (!(response = await s.read("please enter your computer's hostname: "))) { s.echo('Response cannot be empty, please try again.'); await s.sleep(1000); }
    if (response !== HOST) { s.msg("that is incorrect. Computers have names too. I wonder what this computer's name is. Could there be a command? use the start command when you're ready to try again"); return; }
    s.msg(`well done, that's right! The machine's name is ${HOST}`);
    await s.pause();
    s.msg('this hostname also has an address. You open a box next to the sticker and a magic ring is inside it. Engraved on the ring is the word "ping". What kind of cheap gas-station junk is this? You ask yourself. Then it dawns on you, "ping" might be the key to learning your address');
    s.msg('Press Ctrl + c to quit any program (including ping)');
    s.echo('');
    while (!(response = await s.read("please enter your computer's ip address: "))) { s.echo('Response cannot be empty, please try again.'); await s.sleep(1000); }
    if (response !== IP) { s.msg(`that is incorrect. Computers have addresses too. I wonder how ping could help us find it. what if we were to "ping ${HOST}"? Don't forget, Ctrl+c to stop an ongoing command. use the start command when you're ready to try again`); return; }
    s.msg(`well done, that's right! The machine's address is ${IP}`);
    s.cat('home.txt');
    s.msg('it makes you think of home...you slap this sticker equipped with its hostname and address onto your computer. Lights start going crazy!!! BEEP. CHANGE TO MISSION 03 BEEEP it screeches.');
    // easter egg
    s.note("(psst. there's another home on this computer. try: ls /home)");
    return true;
  },

  async '03'(s) {
    const dir = M + '/03';
    s.msg('you are now running a script. Press Ctrl + c to quit any script');
    if (!s.tmuxCheck(true)) return;
    await s.pause();
    s.msg("The beeping from your computer starts growing louder and louder. You notice a printer turn on and pages start flying out of the tray each with the message 'i made a new file in mission 03' on it. HURRY list the current working directory in the other tmux window to see how bad it has gotten!!!");
    for (let i = 1; i <= 8; i++) {
      s.echo(`animal${i}.txt`);
      FS.write(`${dir}/animal${i}.txt`, PICS[`animal${i}.txt`]);
      await s.sleep(1000);
    }
    s.msg('What a mess!!! Quick, create a directory named trashcan, and another one called zoo to clean up');
    for (let i = 0; i <= 1000; i++) {
      if (!s.node(`${dir}/${i}.txt`)) FS.write(`${dir}/${i}.txt`, '');
      await s.sleep(1000);
      const t = s.node(dir + '/trashcan/');
      if (t && t.t === 'd') { s.msg('You did it! You made the trashcan directory!'); break; }
      s.echo('papers and files keep piling up...they begin filling the room... better make a trashcan fast');
    }
    s.cat('trashcan.txt');
    s.msg('now that there\'s a trashcan, the printer calms down. Whew, looks like you\'ll live to see another day.');
    s.msg("We need to move all of this stuff and all of the animals to where they belong. I bet dad has a command that might help. See if he mentions the move command and use the tmux split to move the files to the right location.");
    await s.pause();
    s.msg('example: to move bob into the trashcan, you could first copy him over here from 01 like this');
    s.msg("'cp ../01/bob .' ");
    await s.pause();
    s.msg('then we move him to the trashcan like this: ');
    s.msg("'mv ./bob ./trashcan'");
    await s.pause();
    s.msg('sorry bob');
    await s.sleep(1000);
    s.msg("now, can you clean up all the txt files? You can list them with the 'ls' command.");
    s.msg('animals belong in the zoo, and number files belong in the trashcan');
    await s.pause();
    const txt = () => Object.keys((s.node(dir) || { c: {} }).c).filter(n => n.endsWith('.txt'));
    if (txt().length) {
      s.echo('Error: Found .txt files in mission 03');
      s.msg('you get one more chance before you fail the mission and have to try again. Check dad for a mission 03 hint');
      await s.pause();
      if (txt().length) { s.echo('Error: Found .txt files in mission 03'); return; }
    }
    s.msg("excellent work. You now have a zoo full of animals 'ls ./zoo' to see them and don't forget the 'cat' command");
    await s.pause();
    s.msg("now, take out the trashcan using the 'rm' command, see dad for help");
    await s.pause();
    s.msg('want to see a cow thinking about animal1.txt?');
    s.msg("type 'cat ./zoo/animal1.txt | cowsay -n' and then move on to mission 04 when you're ready");
    // easter egg
    s.note("(the animals say they escaped from dad's games folder: ls /home/dave/games)");
    return true;
  },

  async '04'(s, sh, io) {
    const dir = M + '/04';
    s.msg('You are now running a script. Press Ctrl + c to quit any script');
    s.msg('You now have enough tools in your toolbelt to explore the hallway in mission 04. You see a board with lights on it. All of them are currently lit up with a red light. Underneath the lights there is a locked door. You hear muffled speech on the other side of the door, "heeeeeelp!" the voice says when you listen on the other side. There must be a way to unlock the door...');
    await s.pause();
    s.msg('To check the status of the lights, you must be in ~/mission/mission/04. You can then run a script called light-status.sh');
    s.msg("Try it now. To run a script, you need to tell bash where it is. The way you do that is with the ./ character. ./ means look in the directory I'm current inside. Enter this exactly as shown in the next message");
    s.msg('./light-status.sh');
    let a = await s.read('do you want me to run it for you? (y/n)');
    if (a === 'y') {
      s.msg(`make sure my working directory is ~/mission/mission/04, by running pwd command (~ is a shortcut for ${HOME})`);
      await s.sleep(1000); await s.run('pwd');
      await s.pause('look good? (press enter to contine)');
      s.msg("alright, let's see if the script is there by running ls");
      await s.sleep(1000); await s.run('ls');
      await s.pause('look good? (press enter to contine)');
      s.msg("cool, now I'm entering this command ./light-status.sh");
      await s.sleep(1000); await s.run('./light-status.sh');
    }
    s.msg('Remember, you can open a tmux split to leave the start command running, or you can Ctrl+c and start again when you\'re ready');
    await s.pause();
    s.msg("You should have already run ls, but if you haven't yet, do it now.");
    await s.pause();
    s.msg("Explore the hallway. Once you have a feel for what's inside, continue here");
    await s.pause();
    s.msg("It seems like there's a good amount of buttons in the various rooms. Did you check whether there's anything in those button files?");
    await s.pause();
    s.msg('I wonder what happens when we turn some of those buttons on?');
    a = await s.read('do you want to learn about how to edit a file? (y/n)');
    if (a === 'y') {
      s.msg('If you want to go super deep, use the command vimtutor');
      s.msg("If not, I'll give you a super quick overview");
      await s.pause();
      s.msg("Once you're inside vim, the hardest part is actually quitting! To quit without saving, you type 'Shift :' (colon key), then the 'q' key, then the '!'");
      s.msg("Try that now by using the 'vim' command");
      await s.pause();
      s.msg('When you use the vim command without giving it a file, it opens nothing');
      await s.pause();
      s.msg('If you want to actually change a file, you have to tell vim what file you want to edit. For example: vim hallway/door0/closet/button');
      await s.pause();
      s.msg("Once inside vim, there are two 'modes'. The first (default) is called 'visual' mode and YOU MUST BE IN VISUAL MODE TO QUIT");
      await s.pause();
      s.msg("Movement is kind of weird. Use 'h,j,k,l' keys to move around in visual mode. h is left, j is down, k is up, l is right");
      await s.pause();
      s.msg("The second mode is called 'insert' mode and to get into insert mode, you press the 'i' key. To get back to visual mode, you press the Esc (escape) key");
      await s.pause();
      s.msg('Do it now. Open a button file, go into insert mode from visual mode, get out of insert mode, quit vim');
      await s.pause();
      s.msg("Finally, once in insert mode, you can make changes kind of like in notepad. Give it a shot. To save those changes, go back to visual mode and use the command 'Shift :' (colon key), then the 'w' key (for write), then the 'q' key (for quit).");
      // easter egg
      s.note("(dad keeps a vim cheat sheet on his website: open /home/dave/tools/vim.html)");
    }
    s.msg('Dang, there are a lot of buttons... I wonder which ones matter?');
    const isLockedDir = () => { try { const n = FS.get(dir + '/door', false); return n && n.t === 'd'; } catch { return false; } };
    let it = 0;
    while (isLockedDir()) {
      const r = await lightStatus(dir);
      io.status(`Check number ${it} ./light-status.sh output: ${r.html}`);
      if (r.locked === 0) {
        s.echo('\nsomething happened to the door in ~/mission/mission/04...');
        FS.del(dir + '/door');
        FS.put(dir + '/door', { t: 'l', to: '../05', o: USER, m: now() });
        break;
      }
      if (++it >= 300) { s.echo('\nMax checks reached. door mission failed. Use the start command to try again.'); return; }
      await s.sleep(3000);
    }
    if (!s.node(dir + '/door')) FS.put(dir + '/door', { t: 'l', to: '../05', o: USER, m: now() });
    s.echo('\n' + dir + '/door');
    s.msg('Well done. The door seems like it changed!! Run ll to take a deeper look.');
    await s.pause();
    s.msg('Try running ls on the door directory, example: ls ./door');
    s.msg('The door is a window pointing to mission 05! go there now');
    return true;
  },

  async '05'(s) {
    const dir = M + '/05';
    s.echo(FS.text(s.node(dir + '/prisoner') || { d: GAME_FILES.prisoner }).replace(/\n$/, ''));
    s.msg("You find the captive prisoner, he's bound, blindfolded, and has a rag in his mouth. He hears you and starts wiggling around and trying to tell you something");
    let a = await s.read('Take the rag out of his mouth? (y/n) ');
    if (a !== 'y') { s.msg("Nah, you think to yourself. I'll just leave him there and find the files on my own."); return; }
    s.msg('"Thank you!" He exclaims. "Franz captured me two weeks ago after he caught me trailing him and brought me here. I have no idea where I am... do you know what host we\'re on?" ');
    const h = await s.read("What's your hostname? ");
    if (h !== HOST) { s.msg('"That can\'t be right", the prisoner says. What does the hostname command return?"'); s.msg('Try again with the start command'); return; }
    s.msg('"Nice, the man says. Untie me and I\'ll tell you what I\'ve learned about the file franz put on your computer"');
    a = await s.read('Untie him? (y/n) ');
    if (a !== 'y') { s.msg("Nah, you think to yourself. I'll just leave him there and find the files on my own."); return; }
    s.msg('"Ugh, that\'s so much better. Now, about this file. I don\'t actually know where it is, but I\'ve discovered two really important tools to help you find and locate files"');
    s.msg('"My name is Jon by the way." he tells you. "I\'m going to open up a portal into mission 04 so we have some files we can work with". Jon invokes a tool called \'ln\', the linking tool, to create a soft-link into mission 04.');
    FS.write(dir + '/jon', PICS['dilbert.txt']);
    s.msg('ln -snf ../04 portal');
    try { FS.del(dir + '/portal'); } catch {}
    FS.put(dir + '/portal', { t: 'l', to: '../04', o: USER, m: now() });
    s.msg("whooooosh, the portal has appeared. Let's ls -la (or ll) to see what it looks like!");
    s.msg('Notice how jon came out of the prisoner file too? Run ls to see it (and cat it if you want)');
    await s.run('ls -la');
    await s.pause();
    s.msg("WARNING. find and locate are POWERFUL tools. By themselves they don't pose much of a risk; however, combined with the rm command you can accidentally delete LOTS of files you may not have meant to.");
    await s.pause();
    s.cat('magnifying-glass.txt');
    s.msg('"Let\'s start with find", Jon says. "Let\'s use it a couple times and then I\'ll point you to a list of examples."');
    s.msg("First, jump through the portal (cd ./portal). Open a tmux split if you haven't already");
    await s.pause();
    s.msg('Now, use this command to see what happens: ');
    s.msg('find . -name button');
    await s.pause();
    s.msg("Kinda cool right? Here's the breakdown: ");
    s.echo("'find' (the command)");
    s.echo("'.' (location to search)");
    s.echo("'-name' (we're searching by case sensitive filename)");
    s.echo("'button' (the specific name you are searching for, in this case, our button files)");
    s.msg('re-read that and make sure it makes sense');
    await s.pause();
    s.msg('change that command slightly and use a capitol B instead of lowercase b in button');
    s.msg('find . -name Button');
    await s.pause();
    s.msg('Notice how it failed to find anything called Button');
    await s.pause();
    s.msg('find can also be case insensitive by using -iname instead of -name');
    s.msg('Try this one:');
    s.msg('find . -iname Button');
    s.msg('or this one');
    s.msg('find . -iname BuTTon');
    await s.pause();
    s.msg('^^ This is how I use the command 99% of the time -Dad');
    await s.pause();
    s.msg('when I want to get really fancy, find has an exec subcommand so that you can do stuff once find has found a file');
    s.msg("let's see if we can not only find all the buttons, but see what their status is");
    s.msg('find . -iname button -exec cat {} \\;');
    await s.pause();
    s.msg("if you want to get really crazy, you can exec multiple things");
    s.msg('find . -iname button -exec ls {} \\; -exec cat {} \\;');
    await s.pause();
    s.msg("finally, there is an EXAMPLES section of the man page for find that is a treasure trove of ways you can use find. Run 'man find' and look for the EXAMPLES section");
    await s.pause();
    s.msg("find is somewhat limited. All it knows about is the path you tell it to look in. If you're sure that the thing you're searching for is in the place you're looking, find is awesome.");
    s.msg("But what about if you don't have a freaking clue where the file might be?");
    await s.pause();
    s.msg('Jon disappears...');
    try { FS.del(dir + '/jon'); } catch {}
    s.msg("go back out of the portal 'cd ..'");
    await s.pause();
    s.msg('The portal disappears...');
    try { FS.del(dir + '/portal'); } catch {}
    s.msg("You can run ls to see he's no longer here");
    s.msg('A phone starts ringing');
    a = await s.read('Answer it? (y/n) ');
    if (a !== 'y') { s.msg("Nah, I'll just keep going on my own"); return; }
    FS.put('/usr/local/share/jon', { t: 'f', pic: 'dilbert.txt', o: 'root', m: now() }, true);
    s.msg('"I moved somewhere else and you\'re going to need to find me to keep going" Jon said.');
    s.msg('locate has its own database of your whole system and is SUPER fast');
    s.msg("because it's so powerful, sometimes it can be overwhelming especially if the thing you're looking for isn't unique");
    s.msg("For example. There are lots of files involved in the program 'vim'");
    s.msg('locate vim');
    await s.pause();
    s.msg('overwhelming right?');
    s.msg('but stuff that is pretty unique is much easier to find');
    s.msg('locate prisoner');
    await s.pause();
    s.msg('use your new powers to figure out where jon went');
    a = await s.read('What is the path to the jon file? :');
    if (a !== '/usr/local/share/') {
      s.msg("That is incorrect, I'm looking for a very specific format. Make sure your path begins and ends with a slash character '/'. Also, remember that the PATH to a file does not include the filename itself. I'm basically asking, what would you cd to in order to ls jon? run start to try again");
      return;
    }
    s.msg("Well done. You're ready to move on to mission 06");
    // easter egg
    s.msg('Jon calls one more time: "Before franz grabbed me, I was snooping around a guy named dave. He knows things. Try: finger dave"');
    return true;
  },
};
