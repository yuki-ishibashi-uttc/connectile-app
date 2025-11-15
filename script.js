// script.js (Lesson 19 - バグ修正版)

console.log("JavaScriptファイルが読み込まれました！");

// --- ゲームの基本設定 ---
const BOARD_SIZE = 8;
const playerClasses = ['player1', 'player2', 'player3', 'player4'];
let activePlayer = 0;

// --- バックエンド（厨房）の「窓口」の住所 ---
// ★★★ここはあなたのRenderのURLに書き換えてください★★★
const API_URL = 'https://connectile-backend.onrender.com/api/gamestate/'; 
// (例：https://glittering-kheer-8ba521.netlify.app ではなく、RenderのURLです)

// --- データ管理（グローバル変数） ---
let playerPoints = { 1: 0, 2: 0, 3: 0, 4: 0 };
let boardState = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

// --- DOM要素の取得 ---
const gameBoard = document.getElementById('game-board');
const playerButtons = document.querySelectorAll('.player-btn');
const currentPlayerDisplay = document.getElementById('current-player-display');
const distanceInput = document.getElementById('distance-input');
const addPointsBtn = document.getElementById('add-points-btn');
const resetBtn = document.getElementById('reset-btn');
const pointDisplays = {
    1: document.getElementById('points-p1'),
    2: document.getElementById('points-p2'),
    3: document.getElementById('points-p3'),
    4: document.getElementById('points-p4'),
};

// --- バックエンド通信機能 ---

async function loadGame() {
    console.log("バックエンドからデータをロードします...");
    try {
        const response = await fetch(API_URL); 
        if (!response.ok) { 
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); 
        
        playerPoints = {
            1: data.player1_points,
            2: data.player2_points,
            3: data.player3_points,
            4: data.player4_points,
        };
        boardState = data.board_state;
        
        console.log("ロード完了:", data);
        
        updatePointDisplay();
        updateBoard();
        
    } catch (error) {
        console.error("データのロードに失敗しました:", error);
        alert("サーバーからデータを読み込めませんでした。バックエンドサーバーが起動しているか確認してください。");
    }
}

async function saveGame() {
    console.log("バックエンドにデータをセーブします...");
    
    const gameState = {
        player1_points: playerPoints[1],
        player2_points: playerPoints[2],
        player3_points: playerPoints[3],
        player4_points: playerPoints[4],
        board_state: boardState,
    };

    try {
        const response = await fetch(API_URL, {
            method: 'PUT', 
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(gameState), 
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json(); 
        console.log("セーブ完了:", data);
        
    } catch (error) {
        console.error("データのセーブに失敗しました:", error);
    }
}

// --- リセット機能 ---
function resetGame() {
    if (confirm("本当にゲームをリセットしますか？")) {
        // ポイントをリセット
        playerPoints = { 1: 0, 2: 0, 3: 0, 4: 0 };
        // 盤面データをリセット（8x8の空の盤面）
        boardState = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
        
        // ★ユーザーの要望により、初期配置はナシ（空の盤面）にする

        // 表示を更新
        updatePointDisplay();
        updateBoard();
        
        // リセットした状態を「セーブ」する
        saveGame();
        
        console.log("ゲームがリセットされ、その状態がセーブされました。");
    }
}

// --- イベントリスナーの設定 ---
resetBtn.addEventListener('click', resetGame);

// ポイント追加ボタンの処理
addPointsBtn.addEventListener('click', () => {
    if (activePlayer === 0) {
        alert("先にアクティブなプレイヤーを選択してください。");
        return;
    }
    
    // ★★★「distance」を正しく定義し、「parseFloat」で小数を扱えるように修正★★★
    const distance = parseFloat(distanceInput.value); 
    
    if (isNaN(distance) || distance <= 0) {
        alert("正しい距離をkm単位で入力してください。");
        return;
    }
    
    playerPoints[activePlayer] += distance;
    updatePointDisplay();
    distanceInput.value = '';
    
    saveGame();
});

// プレイヤー選択ボタン
playerButtons.forEach(button => {
    button.addEventListener('click', () => {
        activePlayer = parseInt(button.dataset.player);
        currentPlayerDisplay.textContent = `プレイヤー${activePlayer}`;
        playerButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});


// --- メインロジック（コスト計算を修正） ---
function handleSquareClick(event) {
    if (activePlayer === 0) { alert("先にプレイヤーを選択してください。"); return; }

    const clickedSquare = event.target;
    const row = parseInt(clickedSquare.dataset.row);
    const col = parseInt(clickedSquare.dataset.col);

    if (boardState[row][col] === activePlayer) {
        console.log("自分のマスを上書きすることはできません。");
        return;
    }

    // 1. まず、データを「仮に」置いてみる
    //    (元に戻す場合に備え、一時的なコピーで作業するのがベストだが、
    //     ここでは簡潔さのため、一旦boardStateを直接変更し、失敗したらロードし直す)
    
    // 元の状態をバックアップ（失敗時に戻すため）
    const originalBoardState = JSON.parse(JSON.stringify(boardState));

    boardState[row][col] = activePlayer;
    
    // 2. 「ひっくり返した枚数」を受け取る
    const flippedCount = flipTiles(row, col, activePlayer);
    
    // 3. コストを計算する（置いた1マス + ひっくり返した枚数）
    const cost = 1 + flippedCount;

    // 4. ポイントが足りるかチェックする
    if (playerPoints[activePlayer] < cost) {
        // ポイントが足りない！
        alert(`ポイントが足りません！\nコスト: ${cost} (残り: ${playerPoints[activePlayer]})`);
        
        // ★重要★ 仮に置いたマスと、ひっくり返したデータを元に戻す
        boardState = originalBoardState;
        return; // 何もせず終了
    }

    // 5. ポイントが足りたので、コストを消費する
    playerPoints[activePlayer] -= cost;
    updatePointDisplay();

    // 6. データを元にした最終的な盤面を再描画する
    updateBoard();
    
    // 7. 最終的な状態をバックエンドにセーブする
    saveGame();
    
    console.log(`プレイヤー${activePlayer}が [${row}][${col}] にマスを置き、${flippedCount}枚ひっくり返しました。`);
    console.log(`コスト: ${cost} / 残りポイント: ${playerPoints[activePlayer]}`);
}

// --- ユーティリティ関数 ---

function updatePointDisplay() {
    for (let i = 1; i <= 4; i++) {
        if (pointDisplays[i]) { 
            // toFixed(1) を使って、小数を第1位まで表示するように修正
            pointDisplays[i].textContent = playerPoints[i] ? playerPoints[i].toFixed(1) : '0.0';
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

            const playerNumber = (boardState && boardState[row]) ? boardState[row][col] : 0;
            
            if (playerNumber > 0) {
                square.classList.add(playerClasses[playerNumber - 1]);
            }
            square.addEventListener('click', handleSquareClick);
            gameBoard.appendChild(square);
        }
    }
}

// ★★★「ひっくり返した枚数」を返すように修正★★★
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

    // ひっくり返した枚数を返す
    return tilesToFlip.length;
}


// --- ゲームの初期化処理 ---
// ページが開かれたら、まずバックエンドからデータをロードする
loadGame();