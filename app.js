const terminal = document.getElementById('terminal');
let input = '';
let ipAddress = 'Unknown';

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

function printHistory() {
  const history = getHistory()
  output = '';
  for (const [cmd, result] of Object.entries(history)) {
      output += `${cmd}\n`;
  }
  return output
}

// Command functions
function lsCommand() {
    return `dir  file1.txt  file2.txt  file3.txt`;
}

function clearCommand() {
    document.cookie = 'history=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'; // Clear the cookie
    return false;
}


function unknownCommand(cmd) {
    return `command not found: ${cmd}`;
}

// Command handler
function handleCommand(cmd) {
    switch (cmd.trim()) {
        case 'ls':
            return lsCommand();
        case 'clear':
            return clearCommand();
        case 'reset':
            return clearCommand();
        case 'history':
            return printHistory();
        default:
            return unknownCommand(cmd);
    }
}

// Render terminal
function renderTerminal() {
    const history = getHistory();
    let output = '';
    for (const [cmd, result] of Object.entries(history)) {
        output += `user@${ipAddress}:~$ ${cmd}\n${result}\n`;
    }
    terminal.innerHTML = `${output}user@${ipAddress}:~$ <span id="input-line">${input}</span><span class="cursor"></span>`;
}

// Input handling
function handleInput(e) {
    const inputLine = document.getElementById('input-line');
    
    if (e.key === 'Enter') {
        if (input.trim()) {  // Only process non-empty input
            const history = getHistory();
            history[input] = handleCommand(input);
            if(history[input]){
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