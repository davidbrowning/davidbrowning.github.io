const terminal = document.getElementById('terminal');
let input = '';
let ipAddress = 'Unknown';

function showHelp(){
  console.log("todo: non-terminal site for marketing/management types")
}

function showKeyboard(){
  document.getElementById("mobile").focus();
}

// Cookie handling
function getHistory() {
    const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=');
        acc[key] = value;
        return acc;
    }, {});
    return cookies.history ? JSON.parse(decodeURIComponent(cookies.history)) : {};
}

function setHistory(history) {
    document.cookie = `history=${encodeURIComponent(JSON.stringify(history))}; path=/`;
}

function historyCommand() {
  const history = getHistory()
  output = '';
  for (const [cmd, result] of Object.entries(history)) {
      parsedCmd = cmd.split(':')
      seconds = Number(parsedCmd[1])
      date = new Date(seconds)
      output += `${date.toISOString()} : ${parsedCmd[0]}\n`;
  }
  return output
}

const filesystem = {
    name: '/',
    type: 'directory',
    children: [
        {
            name: 'home',
            type: 'directory',
            children: [
                {
                    name: 'dave',
                    type: 'directory',
                    children: [
                        { name: 'readme.txt', type: 'file' },
                        { name: 'script.sh', type: 'file' },
                        { name: 'games',
                          type: 'directory',
                          children: [
                            {name: 'marbles.html', type: 'file'},
                            {name: 'breakout.html', type: 'file'},
                            {name: 'conway.html', type: 'file'},
                            {name: 'simon.java', type:'file'}
                          ]
                        },
                        { name: 'tools',
                          type: 'directory',
                          children: [
                            {name: 'recipes.html', type: 'file'},
                            {name: 'oscilloscope.rs', type: 'file'}
                          ]
                        }
                    ]
                }
            ]
        },
        {
            name: 'etc',
            type: 'directory',
            children: [
                { name: 'config.ini', type: 'file' }
            ]
        },
        { name: 'programmer.html', type: 'file' }
    ]
};

let cwd = filesystem; 

function findInCurrentDir(name) {
    return cwd.children.find(child => child.name === name);
}

function cdCommand(path) {
    if (path === '..') {
        // Go up to parent (not implemented yet, needs parent references)
        return 'parent navigation not implemented';
    } else if (path === '/') {
        cwd = filesystem;
        return '';
    } else {
        const target = findInCurrentDir(path);
        if (!target) return `no such directory: ${path}`;
        if (target.type !== 'directory') return `${path} is not a directory`;
        cwd = target;
        return '';
    }
}

// Function to list directory contents (like `ls` or `dir`)
function lsCommand(dir = filesystem, cwd) {
    if (dir.type !== 'directory') return 'not a directory';
    return dir.children.map(child => child.name).join('  ');
}

function helpCommand() {
    return `\n\n\tWelcome to davidbrowning.github.io. Here are the commands I've implemented so far: ls, cd, clear, open, reset, whoami, w, history, help, ?`;
}

function openCommand(file) {
    switch (file) {
      case 'programmer.html': window.open("https://davidbrowning.github.io/gears/index.html", '_blank').focus();
        return `opening ${file}...`
      case 'marbles.html':window.open("https://davidbrowning.github.io/html/marbles/parts/1.html", '_blank').focus();
        return `opening ${file}...`
      case 'breakout.html':window.open("https://davidbrowning.github.io/html/breakout.html", '_blank').focus();
        return `opening ${file}...`
      case 'conway.html':window.open("https://davidbrowning.github.io/sandbox/index.html", '_blank').focus();
        return `opening ${file}...`
      case 'simon.java':window.open("https://www.youtube.com/watch?v=kYVj_BY9k5M", '_blank').focus();
        return `opening ${file}...`
      case 'recipes.html':window.open("https://davidbrowning.github.io/recipes/index.html", '_blank').focus();
        return `opening ${file}...`
      case 'oscilloscope.rs':window.open("https://github.com/davidbrowning/oscilloscope", '_blank').focus();
        return `opening ${file}...`
      default:
        return `file not found`
    }
}

function whoamiCommand() {
    return `\n\tNormally, this would tell you which user you logged in as; however, this is my website.\n\n\tSo hi! My name is Dave Browning.\n\n\tI am an aspiring linux geek. I have been playing with computers since 2013.\n\n\tI have worked as a sysadmin, software engineer, SRE, and platform engineer\n\n\tI like making computers sing`;
}

function clearCommand() {
    document.cookie = 'history=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'; // Clear the cookie
    return false;
}


function unknownCommand(cmd) {
    return `command not found: ${cmd}\n\n\ttry ? or help for more information`;
}

// Command handler
function handleCommand(cmd) {
  const [command, ...args] = cmd.trim().split(' ');
    switch (command.trim()) {
        case 'ls':
            return lsCommand(cwd);
        case 'open':
            return openCommand(args[0]);
        case 'cd':
            return cdCommand(args[0] || '/');
        case 'clear':
            return clearCommand();
        case 'reset':
            return clearCommand();
        case 'whoami':
            return whoamiCommand();
        case 'w':
            return whoamiCommand();
        case 'history':
            return historyCommand();
        case 'help':
            return helpCommand();
        case '?':
            return helpCommand();
        default:
            return unknownCommand(cmd);
    }
}

// Render terminal
function renderTerminal() {
    const history = getHistory();
    let output = '';
    for (const [key, result] of Object.entries(history)) {
        const [cmd] = key.split(':'); // Extract command from key (ignore timestamp)
        prev_dir = key.split(':').at(2)
        output += `user@${ipAddress}:${prev_dir} $ ${cmd}\n${result}\n`;
    }
    terminal.innerHTML = `${output}user@${ipAddress}:${cwd.name} $ <span id="input-line">${input}</span><span class="cursor"></span>`;
}
// Input handling
function handleInput(e) {
    const inputLine = document.getElementById('input-line');
    
    if (e.key === 'Enter') {
      if (input.trim()) {  // Only process non-empty input
              const history = getHistory();
              const timestamp = Date.now(); // Unique timestamp for each command
              const key = `${input}:${timestamp}:${cwd.name}`; // Key is command:timestamp:workingdirectory
              history[key] = handleCommand(input);
              if(history[key] != false){
                setHistory(history);
              }
              input = '';
          }
          renderTerminal();
    } else if (e.key === 'Backspace') {
        input = input.slice(0, -1);
        inputLine.textContent = input;
    } else if (e.key.length === 1) {
        input += e.key;
        inputLine.textContent = input;
    }
}

// Initialize
fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
        ipAddress = data.ip;
        renderTerminal();
        document.addEventListener('keydown', handleInput);
    })
    .catch(() => {
        ipAddress = '127.0.0.1'; // Fallback IP
        renderTerminal();
        document.addEventListener('keydown', handleInput);
    });