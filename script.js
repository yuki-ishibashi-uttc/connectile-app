// script.js (Lesson 17 - バックエンド接続版)

console.log("JavaScriptファイルが読み込まれました！");

// --- ゲームの基本設定 ---
const BOARD_SIZE = 8;
const playerClasses = ['player1', 'player2', 'player3', 'player4'];
let activePlayer = 0;

// --- バックエンド（厨房）の「窓口」の住所 ---
const API_URL = 'https://connectile-backend.onrender.com/api/gamestate/';

// --- データ管理（グローバル変数） ---
// これらの変数は、ロードが成功したときに上書きされます
let playerPoints = { 1: 0, 2: 0, 3: 0, 4: 0 };
let boardState = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

// --- DOM要素の取得 ---
const gameBoard = document.getElementById('game-board');
const playerButtons = document.querySelectorAll('.player-btn');
const currentPlayerDisplay = document.getElementById('current-player-display');
const distanceInput = document.getElementById('distance-input');
const addPointsBtn = document.getElementById('add-points-btn');
// saveBtnはもう使いません
// const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const pointDisplays = {
    1: document.getElementById('points-p1'),
    2: document.getElementById('points-p2'),
    3: document.getElementById('points-p3'),
    4: document.getElementById('points-p4'), // 4. だったのを 4: に修正
};

// --- ★★★★★ バックエンド通信機能 ★★★★★ ---

// 【新しいロード機能】バックエンドから最新データを「もらう」(GET)
async function loadGame() {
    console.log("バックエンドからデータをロードします...");
    try {
        const response = await fetch(API_URL); // APIに「データちょうだい」とリクエスト
        if (!response.ok) { // もし失敗したら
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // 届いたJSONデータをJavaScriptのオブジェクトに翻訳
        
        // グローバル変数をサーバーのデータで上書き
        playerPoints = data.player1_points === undefined ? playerPoints : {
            1: data.player1_points,
            2: data.player2_points,
            3: data.player3_points,
            4: data.player4_points,
        };
        boardState = data.board_state;
        
        console.log("ロード完了:", data);
        
        // データをロードした後、画面を再描画
        updatePointDisplay();
        updateBoard();
        
    } catch (error) {
        console.error("データのロードに失敗しました:", error);
        alert("サーバーからデータを読み込めませんでした。バックエンドサーバーが起動しているか確認してください。");
    }
}

// 【新しいセーブ機能】バックエンドに最新データを「送る」(PUT)
// この関数は、何か変更があるたびに呼び出されます
async function saveGame() {
    console.log("バックエンドにデータをセーブします...");
    
    // バックエンドに送るための最新データ（JSON）を準備
    const gameState = {
        player1_points: playerPoints[1],
        player2_points: playerPoints[2],
        player3_points: playerPoints[3],
        player4_points: playerPoints[4],
        board_state: boardState,
    };

    try {
        const response = await fetch(API_URL, {
            method: 'PUT', // 「上書き保存（PUT）」でリクエスト
            headers: {
                'Content-Type': 'application/json', // 「JSONデータを送りますよ」という合図
            },
            body: JSON.stringify(gameState), // JavaScriptオブジェクトをJSON文字列に変換
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json(); // 保存後のデータを一応受け取る
        console.log("セーブ完了:", data);
        
    } catch (error) {
        console.error("データのセーブに失敗しました:", error);
    }
}

// --- ★★★★★ リセット機能 ★★★★★ ---

// リセットは「データを初期化して、即セーブ」という動作に変わります
function resetGame() {
    if (confirm("本当にゲームをリセットしますか？")) {
        // ポイントをリセット
        playerPoints = { 1: 0, 2: 0, 3: 0, 4: 0 };
        // 盤面データをリセット（8x8の空の盤面）
        boardState = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

        // 表示を更新
        updatePointDisplay();
        updateBoard();
        
        // リセットした状態を「セーブ」する
        saveGame();
        
        console.log("ゲームがリセットされ、その状態がセーブされました。");
    }
}

// --- イベントリスナーの設定 ---
// saveBtnのリスナーは削除します

resetBtn.addEventListener('click', resetGame); // リセットボタン

// ポイント追加ボタンの処理
addPointsBtn.addEventListener('click', () => {
    if (activePlayer === 0) {
        alert("先にアクティブなプレイヤーを選択してください。");
        return;
    }
    const distance = parseInt(distanceInput.value);
    if (isNaN(distance) || distance <= 0) {
        alert("正しい距離をkm単位で入力してください。");
        return;
    }
    
    playerPoints[activePlayer] += distance;
    updatePointDisplay();
    distanceInput.value = '';
    
    // ポイントが変更されたので、バックエンドに「セーブ」する
    saveGame();
});

// プレイヤー選択ボタン（変更なし）
playerButtons.forEach(button => {
    button.addEventListener('click', () => {
        activePlayer = parseInt(button.dataset.player);
        currentPlayerDisplay.textContent = `プレイヤー${activePlayer}`;
        playerButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});


// --- メインロジック（変更あり） ---

function handleSquareClick(event) {
    if (activePlayer === 0) { alert("先にプレイヤーを選択してください。"); return; }
    if (playerPoints[activePlayer] <= 0) { alert("ポイントが足りません！"); return; }

    const clickedSquare = event.target;
    const row = parseInt(clickedSquare.dataset.row);
    const col = parseInt(clickedSquare.dataset.col);

    if (boardState[row][col] === activePlayer) {
        console.log("自分のマスを上書きすることはできません。");
        return;
    }

    // ポイントを1消費
    playerPoints[activePlayer]--;
    updatePointDisplay();

    // データを更新
    boardState[row][col] = activePlayer;
    flipTiles(row, col, activePlayer);
    
    // 盤面を再描画
    updateBoard();
    
    // ★★★最重要★★★
    // マスを置いた（＝データが変更された）ので、バックエンドに「セーブ」する
    saveGame();
    
    console.log(`プレイヤー${activePlayer}が [${row}][${col}] にマスを置きました。`);
}

// --- ユーティリティ関数（変更なし） ---

function updatePointDisplay() {
    for (let i = 1; i <= 4; i++) {
        if (pointDisplays[i]) { // エラー防止
            pointDisplays[i].textContent = playerPoints[i] || 0;
        }
    }
}

function updateBoard() {
    gameBoard.innerHTML = '';
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.dataset.row = row;
            square.dataset.col = col;

            // boardStateがまだロードされていない可能性も考慮
            const playerNumber = boardState[row] ? boardState[row][col] : 0;
            
            if (playerNumber > 0) {
                square.classList.add(playerClasses[playerNumber - 1]);
            }
            square.addEventListener('click', handleSquareClick);
            gameBoard.appendChild(square);
        }
    }
}

function flipTiles(row, col, player) {
    const tilesToFlip = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of directions) {
        let line = [];
        let r = row + dr; let c = col + dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && boardState[r][c] !== 0 && boardState[r][c] !== player) {
            line.push({r, c}); r += dr; c += dc;
        }
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && boardState[r][c] === player) {
            tilesToFlip.push(...line);
        }
    }
    tilesToFlip.forEach(tile => {
        boardState[tile.r][tile.c] = player;
    });
}


// --- ゲームの初期化処理 ---
// ページが開かれたら、まずバックエンドからデータをロードする
loadGame();