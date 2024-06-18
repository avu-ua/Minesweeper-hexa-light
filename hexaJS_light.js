const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const scoreEl = document.querySelector('#scoreEl')
const timerEl = document.querySelector('#timerEl')
const gameOverEl = document.querySelector('#gameOverEl')
const timeSpentEl = document.querySelector('#timeSpentEl')
const buttonLoserEl = document.querySelector('#buttonLoserEl')
const gameWonEl = document.querySelector('#gameWonEl')
const buttonWinnerEl = document.querySelector('#buttonWinnerEl')
const gameStartEl = document.querySelector('#gameStartEl')
const startButtonEl = document.querySelector('#startButtonEl')
const questionMark = document.querySelector('#questionMark')
const hintEl = document.querySelector('#hintEl')
var secsPassed
var cellsToReveal
var numberOfMinesToDisplay
var density // game "complexity" depends on percentage of Mines in the field
var fieldSize // size of the playfield as a ratio of the lesser of viewport's wigth or hight (see const "totalCircles")

canvas.width = innerWidth
canvas.height = innerHeight

c.fillStyle = 'rgba(0, 0, 0, 1)'
c.fillRect(0, 0, canvas.width, canvas.height)

gameStartEl.classList.add('open-popup') // pops-up div with "start Game" button

const angle = Math.PI / 180 * 60 // 60 degrees (external corner of hexagon) in radians
const edge = 13 // note edge of hexagon also equals to distance from its center to every corner


let sizeX = 20
let sizeY = 20

let intervalId
let minesLeft

function runTheTimer() {
    intervalId = setInterval(() => {
        secsPassed += 1
        timerEl.innerHTML = secsPassed
    }, 1000)
}



let hexArray // empty array of future hexagon centers

let mineImg = new Image()
mineImg.src = 'bomb.png'

let warningImg = new Image()
warningImg.src = 'warning.png'


class Hexagon {
    constructor(hexID, hexCenterX, hexCenterY, edge, fillColor, fontColor) {
        this.hexID = hexID
        this.hexCenter = {
            x: hexCenterX,
            y: hexCenterY
        }
        this.edge = edge
        this.fillColor = fillColor
        this.fontColor = fontColor
        this.status = 0 // '7' if has a mine,
                        // digit '1'-'6' if neighboring cell(s) has/have mine(s), 
        this.revealedOrMuted = 0 // '1' - the cell is already 'opened' by the Player,
                                 // '2' - the cell is "right-clicked" by the Player
    }

    draw() {
        c.beginPath()
        c.moveTo(this.hexCenter.x + this.edge, this.hexCenter.y) // moving to right corner on same horizontal level
        let drawFrom = {
            x: this.hexCenter.x + this.edge,
            y: this.hexCenter.y
        }
        for (let i = 2; i < 7; i++){
            c.lineTo(drawFrom.x + this.edge * Math.cos(angle * i), drawFrom.y + this.edge * Math.sin(angle * i))
            drawFrom.x += this.edge * Math.cos(angle * i)
            drawFrom.y += this.edge * Math.sin(angle * i)
        }
        c.strokeStyle = this.lineColor
        c.lineWidth = 1
        c.fillStyle = this.fillColor
        c.closePath()
        c.fill()

        c.beginPath()
        c.font = '800 16px sans-serif'
        c.fillStyle = this.fontColor
        c.fillText(this.status, this.hexCenter.x - 4, this.hexCenter.y + 5)
        c.closePath()
    }
}
var minesPlaced // required to finish with "Game Won" if number of all Hexs in hexArray
    // have 'status' value of '7' or 'revealedOrMuted' value of '1'
    // i.e. no more "empty" and "unopened" Hexs in hexArray

function init() {
    secsPassed = 0
    minesPlaced = 0
    timerEl.innerHTML = 0

    // placing Mines
    let mines = Math.floor(hexArray.length * density)
    
    do {
        let index = Math.max(0, Math.floor(Math.random() * hexArray.length) - 1)
        if(hexArray[index].status != 7 && Math.random() < density) {
            hexArray[index].status = 7
            minesPlaced += 1
            mines -= 1
        }
    }
    while (mines > 0)
    numberOfMinesToDisplay = minesPlaced
    scoreEl.innerHTML = numberOfMinesToDisplay

    // placing mine-quantity indicators on free cells
    for (let i = 0; i < hexArray.length; i++) { // looping through each cell
        if(hexArray[i].status != 7) { // if the cell has a mine already - do nothing
            let neighbours = []
            // each time looping through the rest of the cells and selecting those that are neighbours
            for (let y = 0; y < hexArray.length; y++) {
                if(
                    i != y &&
                    Math.abs(hexArray[y].hexCenter.x - hexArray[i].hexCenter.x) <= edge * 2.5 &&
                    Math.abs(hexArray[y].hexCenter.y - hexArray[i].hexCenter.y) <= edge * 2.5
                ) {
                    neighbours.push(hexArray[y])
                }
            }
            let minesNearby = 0
            // looping through neighbours and counting those with mines
            for (let x = 0; x < neighbours.length; x++) {
                neighbours[x].status == 7 ? minesNearby += 1 : minesNearby += 0
            }
            hexArray[i].status = minesNearby
        }
    }

    // drawing hexagons
    for (let i = 0; i < hexArray.length; i++) {
        setTimeout( () => {
            hexArray[i].draw()
        }, 250)
    }

    setTimeout( () => {
        let emptyCellSelectionIndicator = 0
        do {
            let randomID = 1 + Math.floor(Math.random() * (hexArray.length - 1))
            if (hexArray[randomID - 1].status == 0) {
                collectCellsToReveal(hexArray[randomID - 1])
                emptyCellSelectionIndicator = 1
            }
        }
        while (emptyCellSelectionIndicator == 0)
        addEventListener('click', gameplay)
        addEventListener('touchstart', startTouchScreen)
        addEventListener('touchend', endTouchScreen)
        addEventListener('contextmenu', rightclick)
    }, 500)
}



// what happens on mouse left-click (on opening a cell in the field)
var selectedCell = -1

function gameplay(event) {
    let mouseX = event.clientX
    let mouseY = event.clientY

    // selecting a cell / hexagon by left-click
    let selectedCell = hexArray.find((hexagon) => {
        return Math.abs(hexagon.hexCenter.x - mouseX) < edge &&
        Math.abs(hexagon.hexCenter.y - mouseY) < edge
    })

    if(selectedCell != undefined) { // when selectedCell == undefined means that the Player clicked on an empty space of the screen

        // A. Check if the cell has a mine. If so - Game Over.
        if (selectedCell.status == 7 && selectedCell.revealedOrMuted != 2) {
            // showing where mines were placed
            revealMines(selectedCell)
            
            clearInterval(intervalId)
            removeEventListener('click', gameplay)
            removeEventListener('contextmenu', rightclick)

            // displaying pop-up message
            setTimeout(() => {
                gameOverEl.classList.add('open-popup') // pops-up div with "Game Lost" message and "Restart" button
            }, 500);

        } else {
            // B. If the selectedCell is not with a mine:
            if (selectedCell.revealedOrMuted == 0) {
                collectCellsToReveal(selectedCell)
            }
        }

        // C. Declare "Game Won" if all "empty" cells are revealed
        let totalCellsRevealed = 0
        hexArray.forEach((cell) => {
            totalCellsRevealed = cell.revealedOrMuted == 1 ? totalCellsRevealed + 1 : totalCellsRevealed
        })
        if (hexArray.length == totalCellsRevealed + minesPlaced) {
            clearInterval(intervalId)
            removeEventListener('click', gameplay)
            removeEventListener('contextmenu', rightclick)

            // displaying pop-up message
            setTimeout(() => {
                timeSpentEl.innerHTML = secsPassed
                gameWonEl.classList.add('open-popup') // pops-up div with "Game Lost" message and "Restart" button
            }, 500)
        }
    }
}

// what happens on mouse right-click (player marks a field with a flag to denote the field (in player's opinion) has a mine)
function rightclick(event) {
    event.preventDefault()
    let mouseX = event.clientX
    let mouseY = event.clientY

    // selecting a cell / hexagon by right-click
    let selectedCell = hexArray.find((hexagon) => {
        return Math.abs(hexagon.hexCenter.x - mouseX) < edge &&
        Math.abs(hexagon.hexCenter.y - mouseY) < edge
    })

    if(selectedCell != undefined) { // when selectedCell == undefined means that the Player right-clicked on an empty space of the screen
        if (selectedCell.revealedOrMuted == 0) {
            selectedCell.revealedOrMuted = 2
            numberOfMinesToDisplay -= 1
            scoreEl.innerHTML = numberOfMinesToDisplay
            c.drawImage(warningImg, selectedCell.hexCenter.x - 8, selectedCell.hexCenter.y - 8, 17, 17)
        } else if (selectedCell.revealedOrMuted == 2) {
            selectedCell.revealedOrMuted = 0
            numberOfMinesToDisplay += 1
            scoreEl.innerHTML = numberOfMinesToDisplay
            selectedCell.draw()
        }
    }
}


// equivalent functions for gameplay(event) and rightclick(event) for touchscreen devices)
var touchTime
var untouchTime
function startTouchScreen() {
    touchTime = Date.now()
}

function endTouchScreen(event) {
    untouchTime = Date.now()
    if (untouchTime - touchTime <= 500) {
        rightclick(event)
    } else {
        gameplay(event)
    }
}



function revealCell(cell) {
    cell.fillColor = 'white'
    switch(cell.status) {
        case 0 : cell.fontColor = 'white'
        break
        case 1 : cell.fontColor = 'blue'
        break
        case 2 : cell.fontColor = 'green'
        break
        case 3 : cell.fontColor = 'red'
        break
        case 4 : cell.fontColor = 'darkblue'
        break
        case 5 : cell.fontColor = 'brown'
        break
        case 6 : cell.fontColor = 'purple'
    }
    cell.draw()
}

function revealMines(selectedCell) {
    selectedCell.fillColor = 'red'
    selectedCell.draw()
    c.drawImage(mineImg, selectedCell.hexCenter.x - 8, selectedCell.hexCenter.y - 8, 17, 17)
    for(let i = 0; i < hexArray.length; i++) {
        if (hexArray[i].status == 7 && hexArray[i].hexID != selectedCell.hexID) {
            hexArray[i].fillColor = 'lightpink'
            hexArray[i].draw()
            c.drawImage(mineImg, hexArray[i].hexCenter.x - 8, hexArray[i].hexCenter.y - 8, 17, 17)
        }
    }
}

function closepopup(closingBtnEl) {
    let elemToHide = closingBtnEl.parentNode
    elemToHide.classList.remove('open-popup')
}

function collectCellsToReveal(cell) {
    cellsToReveal = []
    cellsToReveal.push(cell) // add selectedCell to 'reveal' its content

    var cellsToLoopThrough = []
    cellsToLoopThrough.push(cell)

    var stopLooping = 0
    var cellsToAdd = []

    // if selectedCell is not surrounded with any Mines - add all its
    // neighbours to an array cells in which will be 'revealed', and
    // repeat the process for each such added cell
    do {
        for (let i = cellsToLoopThrough.length - 1; i >= 0; i--) {
            let removeTheseNeibs = 0
            // if a cell has a Mine nearby - no need to reveal ANY its neigbour
            if (cellsToLoopThrough[i].status == 0 && cellsToLoopThrough[i].revealedOrMuted == 0) {
                neibs = []
                for (let a = 0; a < hexArray.length; a++) { // collecting neighbours
                    if(
                        hexArray[a].hexID != cellsToLoopThrough[i].hexID &&
                        hexArray[a].revealedOrMuted != 1 &&
                        Math.abs(hexArray[a].hexCenter.x - cellsToLoopThrough[i].hexCenter.x) <= edge * 2.5 &&
                        Math.abs(hexArray[a].hexCenter.y - cellsToLoopThrough[i].hexCenter.y) <= edge * 2.5
                    ) {
                        neibs.push(hexArray[a])
                        if (hexArray[a].revealedOrMuted == 2) {
                            removeTheseNeibs = 1
                        }
                    }
                }
                // all neighbours of not surrounded with Mines cell to be revealed.
                // only not surrounded with Mines neighbours to be further looped through
                if (removeTheseNeibs == 1) {
                    neibs = []
                } else {
                    for (let b = neibs.length - 1; b >= 0; b--) {
                        cellsToReveal.push(neibs[b])
                        if (neibs[b].status == 0 && neibs[b].revealedOrMuted != 2) {
                            cellsToAdd.push(neibs[b])
                        }
                    }
                }
            }
            cellsToLoopThrough[i].revealedOrMuted = 1
        }
        // resetting the array of cells to loop through
        // and - if any of selected neighbours isn't surrounded with Mines - adding
        // such neighbour(s) to an array of cells to be looped through again.
        // Otherwise - stop looping through.
        cellsToLoopThrough = []
        if (cellsToAdd.length == 0) {
            stopLooping = 1
        } else {
            for (let c = 0; c < cellsToAdd.length; c++) {
                cellsToLoopThrough.push(cellsToAdd[c])
            }
            cellsToAdd = []
        }
    }
    while (stopLooping == 0)

    // revealing all cell(s) to be opened on a mouse left-click
    for(let i = 0; i < cellsToReveal.length; i++) {
        revealCell(cellsToReveal[i])
        if (cellsToReveal[i].revealedOrMuted == 0) {
            cellsToReveal[i].revealedOrMuted = 1
        }
    }
}

// popup hint element
questionMark.addEventListener('mouseover', () => {
    hintEl.classList.add('open-hintPopup')
})
questionMark.addEventListener('mouseout', () => {
    hintEl.classList.remove('open-hintPopup')
})

// choosing Playfield Size and Difficulty Level
function selectFieldSizeOnStart() {
    fieldSize = document.getElementById('fieldSizeOnStart').value
    drawPlayfield()
    if(density > 0) {
        document.getElementById('startButtonEl').style.backgroundColor = 'blue'
        startButtonEl.innerHTML = 'Start game'
        enableStartBtn()
    }
    document.getElementById('fieldSizeOnLoss').value = fieldSize
    document.getElementById('fieldSizeOnWin').value = fieldSize
}

function selectDifficultyOnStart() {
    density = document.getElementById('difficultyOnStart').value
    if(fieldSize > 0) {
        document.getElementById('startButtonEl').style.backgroundColor = 'blue'
        startButtonEl.innerHTML = 'Start game'
        enableStartBtn()
    }
    document.getElementById('difficultyOnLoss').value = density
    document.getElementById('difficultyOnWin').value = density
}

function selectFieldSizeOnLoss() {
    fieldSize = document.getElementById('fieldSizeOnLoss').value
    drawPlayfield()
    document.getElementById('fieldSizeOnWin').value = fieldSize
}

function selectDifficultyOnLoss() {
    density = document.getElementById('difficultyOnLoss').value
    document.getElementById('difficultyOnWin').value = density
}

function selectFieldSizeOnWin() {
    fieldSize = document.getElementById('fieldSizeOnWin').value
    drawPlayfield()
    document.getElementById('fieldSizeOnLoss').value = fieldSize
}

function selectDifficultyOnWin() {
    density = document.getElementById('difficultyOnWin').value
    document.getElementById('difficultyOnLoss').value = density
}

// start game button
function enableStartBtn() {
    startButtonEl.addEventListener('click', () => {
        init()
        runTheTimer()
        closepopup(startButtonEl)
    })
}

// restart upon lose game button
buttonLoserEl.addEventListener('click', () => {
    drawPlayfield()
    init()
    runTheTimer()
    closepopup(buttonLoserEl)
})

function showFieldOnLoss() {
    document.getElementById('gameOverEl').style.opacity = '0.0'
}

function showLoserMenue() {
    document.getElementById('gameOverEl').style.opacity = '1.0'
}

// restart upon win game button
buttonWinnerEl.addEventListener('click', () => {
    drawPlayfield()
    init()
    runTheTimer()
    closepopup(buttonWinnerEl)
})

function drawPlayfield() {
    c.fillStyle = 'rgba(0, 0, 0, 1)'
    c.fillRect(0, 0, canvas.width, canvas.height)
    hexArray = []

    // creating the first Hex in the center of canvas
    let hexagon = new Hexagon(1, canvas.width / 2, canvas.height / 2, edge, 'rgba(255, 255, 0)', 'yellow')
    hexArray.push(hexagon)
    hexagon.draw()

    // creating hexagons circle by circle starting from center
    const totalCircles = Math.floor(Math.min((canvas.height / 2) / (edge * 2), (canvas.width / 2) / (edge * 2)) * fieldSize)

    let previousID = 1
    for (let circle = 1; circle <= totalCircles; circle++) {
        // first Hex in each Circle - vertically up of the screen center
        let hexCenterX = canvas.width / 2
        let hexCenterY = canvas.height / 2 - (edge * 2) * circle
        let hexagon = new Hexagon(previousID + 1, hexCenterX, hexCenterY, edge, 'yellow', 'yellow')
        hexArray.push(hexagon)
        hexagon.draw()
        previousID += 1

        // adding Hexs one by one in each Circle clockwise
        let vectorAngle = Math.PI / 180 * 30
        let vectors = circle > 1 ? 6 : 5
        for (let vector = 1; vector <= vectors; vector++) {
            let jumps = vector < 6 ? circle : circle - 1
            for (let i = 1; i <= jumps; i++){
                hexCenterX = hexCenterX + edge * 2 * Math.cos(vectorAngle)
                hexCenterY = hexCenterY + edge * 2 * Math.sin(vectorAngle)
                let hexagon = new Hexagon(previousID + 1, hexCenterX, hexCenterY, edge, 'yellow', 'yellow')
                hexArray.push(hexagon)
                hexagon.draw()
                previousID += 1
            }
            vectorAngle += Math.PI / 180 * 60
        }
    }
}