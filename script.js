// ==========================
// CONFIGURACIÓN PROFESIONAL
// ==========================
const bgMusic = new Audio("assets/terror-music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.4;

let musicStarted = false;

// 🎯 Ajuste de RTP (modifica los pesos para balancear)
const SYMBOLS = [
  { name: "wild",   weight: 2 },
  { name: "clown",  weight: 10 },
  { name: "blood",  weight: 21 },
  { name: "eye",    weight: 22 },
  { name: "heart",  weight: 10 },
  { name: "ticket", weight: 23 }
];

// Tabla de pagos base (para apuesta 10)
const basePAYTABLE = {
  wild: {3:100, 4:400, 5:2000},
  clown:  {3:200, 4:2000, 5:10000},
  blood:  {3:40,  4:100, 5:400},
  eye:    {3:40,  4:100, 5:400},
  heart:  {3:100,  4:400, 5:2000},
  ticket: {3:40,  4:100, 5:400}
};

// Líneas ganadoras
const PAYLINES = [
  [0,0,0,0,0], // horizontal arriba
  [1,1,1,1,1], // horizontal medio
  [2,2,2,2,2], // horizontal abajo
  [0,1,2,1,0], // V
  [2,1,0,1,2]  // V invertida
];

let credits = 5000;
let bet = 100;
let win = 0;
let totalWin = 0;      // acumulativo
let currentMatrix = [];

// ==========================
// MOTOR MATEMÁTICO
// ==========================

function weightedRandom(symbolsList = SYMBOLS) {
  const totalWeight = symbolsList.reduce((sum,s)=>sum+s.weight,0);
  let rand = Math.random() * totalWeight;
  for (let s of symbolsList) {
    if (rand < s.weight) return s.name;
    rand -= s.weight;
  }
}

// Genera matriz 5x3
function generateMatrix() {
  const matrix = [];
  let clownCount = 0;

  for (let col = 0; col < 5; col++) {
    const reel = [];
    for (let row = 0; row < 3; row++) {

      // Filtrar SYMBOLS si ya hay 5 clowns  
      let availableSymbols = SYMBOLS;  
      if(clownCount >= 5){  
        availableSymbols = SYMBOLS.filter(s=>s.name !== "clown");  
      }  

      // Elegir símbolo evitando coincidencias horizontales que generen premio demasiado fácil  
      let symbol;  
      let attempts = 0;  
      do {  
        symbol = weightedRandom(availableSymbols);  
        attempts++;  

      } while(  
        col > 0 &&   
        matrix[col-1][row] === symbol &&   
        attempts < 10  
      );  

      if(symbol === "clown") clownCount++;  
      reel.push(symbol);  
    }  
    matrix.push(reel);
  }

  return matrix;
}

// ==========================
// PAYTABLE ESCALABLE
// ==========================

function getCurrentPaytable() {
  const table = {};
  for(let sym in basePAYTABLE){
    table[sym] = {};
    for(let count in basePAYTABLE[sym]){
      table[sym][count] = basePAYTABLE[sym][count] * bet / 10;
    }
  }
  return table;
}

// ==========================
// EVALUADOR DE LÍNEAS
// ==========================

function evaluateLines(matrix, paytable) {
  let totalWin = 0;
  let winningLines = [];

  PAYLINES.forEach((line) => {
    let firstSymbol = null;
    let count = 0;

    for (let col = 0; col < 5; col++) {  
      let current = matrix[col][line[col]];  
      if (col === 0) {  
        firstSymbol = current;  
        count = 1;  
      } else {  
        if (current === firstSymbol || current === "wild" || firstSymbol === "wild") {  
          if (firstSymbol === "wild" && current !== "wild") firstSymbol = current;  
          count++;  
        } else break;  
      }  
    }  

    if (count >= 3 && paytable[firstSymbol] && paytable[firstSymbol][count]) {  
      totalWin += paytable[firstSymbol][count];  
      winningLines.push({
        line: line,
        count: count
      });
    }
  });

  return { totalWin, winningLines };
}

// ==========================
// ANIMACIÓN + GIRO REALISTA
// ==========================

function spin() {
  
  document.querySelectorAll(".win-symbol").forEach(el=>{
  el.classList.remove("win-symbol");
  el.classList.remove("win-box");
});

  document.querySelectorAll(".payline-highlight").forEach(el => el.remove());

  if (credits < bet) return;

  document.getElementById("spin").disabled = true;

  // Iniciar música de fondo una sola vez
  if (!musicStarted) {
    bgMusic.play().catch(() => {});
    musicStarted = true;
  }

  // Sonido de giro
  const spinSound = document.getElementById("spinSound");
  spinSound.currentTime = 0;
  spinSound.play().catch(() => {});

  credits -= bet;
  win = 0;
  updateUI();

  currentMatrix = generateMatrix();
  const reels = document.querySelectorAll(".reel");

  reels.forEach((reel, index) => {
    let spins = 0;
    const maxSpins = 25 + index * 10;

    const spinInterval = setInterval(() => {  
      reel.innerHTML = "";  

      for (let row = 0; row < 3; row++) {  
        const div = document.createElement("div");  
        div.classList.add("symbol");  
        const img = document.createElement("img");  

        if (spins < maxSpins - 3) {  
          img.src = "assets/" + weightedRandom() + ".png";  
        } else {  
          img.src = "assets/" + currentMatrix[index][row] + ".png";  
        }  

        div.appendChild(img);  
        reel.appendChild(div);  
      }  

      spins++;  

      if (spins >= maxSpins) {  
        clearInterval(spinInterval);  
        if (index === reels.length - 1) finalizeSpin();  
      }  

    }, 70);

  });
}

// ==========================
// FINALIZAR GIRO
// ==========================

function finalizeSpin() {
  const paytable = getCurrentPaytable();
  const result = evaluateLines(currentMatrix, paytable);
  win = result.totalWin;

  if(win > 0){
    credits += win;
    totalWin += win; // acumulativo
    animateWinCounter(win);
    result.winningLines.forEach(winData => {
      highlightWinningLine(winData);
    
    });
    document.getElementById("winSound").play();
       const cabinet = document.getElementById("cabinet");
    cabinet.classList.add("win-effect");

    setTimeout(() => {
      cabinet.classList.remove("win-effect");
    }, 1800);
    if(win >= bet * 10){
    triggerBigWin(win);
}
  }

  updateUI();
  document.getElementById("spin").disabled = false;
}
function triggerBigWin(amount){

  const bigWinOverlay = document.createElement("div");
  bigWinOverlay.id = "bigWinOverlay";

  bigWinOverlay.innerHTML = `
    <div class="big-win-text">BIG WIN</div>
    <div class="big-win-amount" id="bigWinAmount">0</div>
  `;

  document.body.appendChild(bigWinOverlay);

  setTimeout(() => {
    bigWinOverlay.classList.add("show");
  }, 50);

  // 🔥 reproducir risa
  const laugh = document.getElementById("evilLaugh");
  if(laugh){
    laugh.currentTime = 0;
    laugh.play();
  }

  // 🔥 conteo lento y dramático
  const amountElement = document.getElementById("bigWinAmount");
  let current = 0;
  const duration = 2500;
  const startTime = performance.now();

  function update(timestamp){
    const progress = Math.min((timestamp - startTime) / duration, 1);
    current = Math.floor(progress * amount);
    amountElement.textContent = current;

    if(progress < 1){
      requestAnimationFrame(update);
    } else {
      amountElement.textContent = amount;
    }
  }

  requestAnimationFrame(update);

  // cerrar overlay después
  setTimeout(() => {
    bigWinOverlay.classList.remove("show");
    setTimeout(() => {
      bigWinOverlay.remove();
    }, 500);
  }, 4000);
}

// ==========================
// UI
// ==========================

function updateUI(){
  document.getElementById("credits").textContent = credits;
  document.getElementById("bet").textContent = bet;
  document.getElementById("win").textContent = win;
}

document.getElementById("spin").addEventListener("click", spin);
document.getElementById("betPlus").addEventListener("click", ()=>{
  bet += 100;
  renderPaytable(); // actualizar tabla de pagos
  updateUI();
});
document.getElementById("betMinus").addEventListener("click", ()=>{
  if(bet > 100) bet -= 100;
  renderPaytable(); // actualizar tabla de pagos
  updateUI();
});

// ==========================
// INICIALIZACIÓN
// ==========================

currentMatrix = generateMatrix();


// ==========================
// ANIMACIONES
// ==========================
function animateWinCounter(amount){
  const winElement = document.getElementById("win");
  let current = 0;
  const duration = 1400; // más lento
  const startTime = performance.now();

  // pausa dramática antes de empezar
  setTimeout(() => {

    winElement.classList.add("win-active");

    function update(timestamp){
      const progress = Math.min((timestamp - startTime) / duration, 1);
      current = Math.floor(progress * amount);
      winElement.textContent = current;

      if(progress < 1){
        requestAnimationFrame(update);
      } else {
        winElement.textContent = amount;
        winElement.classList.remove("win-active");
        winElement.classList.add("win-final");

        setTimeout(()=>{
          winElement.classList.remove("win-final");
        }, 800);
      }
    }

    requestAnimationFrame(update);

  }, 250); // pequeña tensión antes de contar
}


function highlightWinningLine(winData){
  if(!winData) return;

  const reels = document.querySelectorAll(".reel");
  const { line, count } = winData;

  for(let col = 0; col < count; col++){
    const row = line[col];
    const symbol = reels[col].children[row];
    if(symbol){
      symbol.classList.add("win-symbol");
      symbol.classList.add("win-box");
    }
  }
}


// ==========================
// RENDER PAYTABLE
// ==========================

function renderPaytable() {
  const paytableDiv = document.getElementById("paytable");
  paytableDiv.innerHTML = "";

  const paytable = getCurrentPaytable();
  Object.keys(basePAYTABLE).forEach(symbol => {
    const item = document.createElement("div");
    item.classList.add("pay-item");
    item.innerHTML = `<img src="assets/${symbol}.png"><div><p>3x = ${paytable[symbol][3]}</p><p>4x = ${paytable[symbol][4]}</p><p>5x = ${paytable[symbol][5]}</p></div>`;
    paytableDiv.appendChild(item);
  });
}

renderPaytable();

function drawWinningLine(line){
  const reelsContainer = document.getElementById("reels");

  let topPosition;

  if(JSON.stringify(line) === JSON.stringify([0,0,0,0,0])){
    topPosition = "16%";
  }
  else if(JSON.stringify(line) === JSON.stringify([1,1,1,1,1])){
    topPosition = "50%";
  }
  else if(JSON.stringify(line) === JSON.stringify([2,2,2,2,2])){
    topPosition = "83%";
  }
  else{
    return; // de momento solo horizontales
  }

  const lineDiv = document.createElement("div");
  lineDiv.classList.add("payline-highlight");
  lineDiv.style.top = topPosition;

  reelsContainer.appendChild(lineDiv);
}

function animatePaytableLight() {
  const items = document.querySelectorAll(".pay-item");
  let index = 0;

  function lightNext() {
    // Quitar luz de todos
    items.forEach(item => item.classList.remove("light-up"));

    // Encender luz en el item actual
    items[index].classList.add("light-up");

    // Pasar al siguiente
    index = (index + 1) % items.length;

    // Repetir cada 300ms
    setTimeout(lightNext, 300);
  }

  lightNext();
}

// Llamar a la animación al cargar la página
animatePaytableLight();

// Animación de luz tipo carrusel (va y vuelve) y siempre activa
function animatePaytableLight() {
  const items = document.querySelectorAll(".pay-item");
  if (items.length === 0) return;

  let index = 0;
  let forward = true; // para ir y volver

  function lightNext() {
    // Quitar luz de todos
    items.forEach(item => item.classList.remove("light-up"));

    // Encender luz en el item actual
    items[index].classList.add("light-up");

    // Calcular siguiente índice
    if (forward) {
      index++;
      if (index >= items.length - 1) forward = false;
    } else {
      index--;
      if (index <= 0) forward = true;
    }

    // Repetir cada 300ms
    setTimeout(lightNext, 300);
  }

  lightNext();
}

// Llamar a la animación después de renderizar la paytable
renderPaytable();
animatePaytableLight();