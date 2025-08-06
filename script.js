class BallRacingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.gameState = {
            money: 1000,
            selectedBall: null,
            betAmount: 0,
            isRacing: false,
            raceFinished: false,
            slowMotion: false,
            followCamera: false,
            cameraOffset: { x: 0, y: 0 },
            raceHistory: [],
            totalRaces: 0,
            wins: 0,
            currentRace: null,
            replayMode: false,
            replayData: null
        };
        
        this.balls = [];
        this.obstacles = [];
        this.raceTrack = {
            centerX: 400,
            centerY: 300,
            radius: 250,
            finishLine: 0
        };
        
        this.initializeBalls();
        this.initializeObstacles();
        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }
    
    initializeBalls() {
        this.balls = [];
        for (let i = 0; i < 11; i++) {
            const angle = (i / 11) * Math.PI * 2;
            this.balls.push({
                id: i + 1,
                x: this.raceTrack.centerX + Math.cos(angle) * this.raceTrack.radius,
                y: this.raceTrack.centerY + Math.sin(angle) * this.raceTrack.radius,
                angle: angle,
                speed: Math.random() * 2 + 1,
                baseSpeed: Math.random() * 2 + 1,
                color: this.generateRandomColor(),
                progress: 0,
                laps: 0,
                finished: false,
                finishTime: null,
                obstacleDelay: 0
            });
        }
    }
    
    initializeObstacles() {
        this.obstacles = [];
        const obstacleCount = 8;
        for (let i = 0; i < obstacleCount; i++) {
            const angle = (i / obstacleCount) * Math.PI * 2;
            this.obstacles.push({
                x: this.raceTrack.centerX + Math.cos(angle) * this.raceTrack.radius,
                y: this.raceTrack.centerY + Math.sin(angle) * this.raceTrack.radius,
                angle: angle,
                width: 30,
                height: 20,
                type: Math.random() > 0.5 ? 'spike' : 'barrier'
            });
        }
    }
    
    generateRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    setupEventListeners() {
        document.getElementById('ballNumber').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const errorElement = document.getElementById('errorMessage');
            
            if (value > 11) {
                errorElement.textContent = 'Error: Ball number cannot exceed 11!';
                e.target.value = 100;
            } else if (value < 1) {
                errorElement.textContent = 'Error: Ball number must be at least 1!';
                e.target.value = 1;
            } else {
                errorElement.textContent = '';
            }
            
            this.updateOdds();
        });
        
        document.getElementById('betAmount').addEventListener('input', () => {
            this.updateOdds();
        });
        
        document.getElementById('placeBet').addEventListener('click', () => {
            this.placeBet();
        });
        
        document.getElementById('startRace').addEventListener('click', () => {
            this.startRace();
        });
        
        document.getElementById('resetGame').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.getElementById('slowMotion').addEventListener('click', () => {
            this.toggleSlowMotion();
        });
        
        document.getElementById('followCamera').addEventListener('click', () => {
            this.toggleFollowCamera();
        });
        
        document.getElementById('replay').addEventListener('click', () => {
            this.startReplay();
        });
        
        document.getElementById('closePopup').addEventListener('click', () => {
            this.closeResultPopup();
        });

        document.getElementById('showTerms').addEventListener('click', (e) => {
            e.preventDefault();
            this.showTermsModal();
        });

        document.getElementById('closeTerms').addEventListener('click', () => {
    this.closeTermsModal();
        });

        // Close modal when clicking outside
        document.getElementById('termsModal').addEventListener('click', (e) => {
            if (e.target.id === 'termsModal') {
                this.closeTermsModal();
            }
        });
        
        // History tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchHistoryTab(e.target.dataset.tab);
            });
        });
    }
    
    updateOdds() {
        const ballNumber = parseInt(document.getElementById('ballNumber').value) || 1;
        const betAmount = parseInt(document.getElementById('betAmount').value) || 50;
        
        // Calculate odds based on ball number (higher numbers have better odds)
        const baseOdds = 1.5 + (ballNumber / 11) * 2;
        const odds = Math.round(baseOdds * 10) / 10;
        
        document.getElementById('currentOdds').textContent = odds + 'x';
    }
    
    placeBet() {
        const ballNumber = parseInt(document.getElementById('ballNumber').value);
        const betAmount = parseInt(document.getElementById('betAmount').value);
        
        if (betAmount > this.gameState.money) {
            alert('Not enough money for this bet!');
            return;
        }
        
        if (ballNumber < 1 || ballNumber > 11) {
            alert('Please select a valid ball number (1-11)!');
            return;
        }
        
        this.gameState.selectedBall = ballNumber;
        this.gameState.betAmount = betAmount;
        this.gameState.money -= betAmount;
        
        document.getElementById('placeBet').disabled = true;
        document.getElementById('startRace').disabled = false;
        
        this.updateUI();
        this.updateSelectedBallDisplay();
    }
    
    updateSelectedBallDisplay() {
        const selectedBallElement = document.getElementById('selectedBall');
        if (this.gameState.selectedBall) {
            selectedBallElement.textContent = `Selected: Ball #${this.gameState.selectedBall} | Bet: $${this.gameState.betAmount}`;
        } else {
            selectedBallElement.textContent = 'Select a ball to bet on';
        }
    }
    
    startRace() {
        this.gameState.isRacing = true;
        this.gameState.raceFinished = false;
        this.gameState.currentRace = {
            startTime: Date.now(),
            positions: [],
            winner: null
        };
        
        // Reset ball positions and states
        this.initializeBalls();
        
        document.getElementById('startRace').disabled = true;
        document.getElementById('slowMotion').disabled = false;
        document.getElementById('followCamera').disabled = false;
        document.getElementById('raceStatus').textContent = 'Race in progress...';
        
        this.updateUI();
    }
    
    toggleSlowMotion() {
        this.gameState.slowMotion = !this.gameState.slowMotion;
        const btn = document.getElementById('slowMotion');
        btn.textContent = this.gameState.slowMotion ? 'Normal Speed' : 'Slow Motion';
        btn.style.background = this.gameState.slowMotion ? 
            'linear-gradient(45deg, #e74c3c, #c0392b)' : 
            'linear-gradient(45deg, #f39c12, #e67e22)';
    }
    
    toggleFollowCamera() {
        this.gameState.followCamera = !this.gameState.followCamera;
        const btn = document.getElementById('followCamera');
        btn.textContent = this.gameState.followCamera ? 'Free Camera' : 'Follow Camera';
        btn.style.background = this.gameState.followCamera ? 
            'linear-gradient(45deg, #e74c3c, #c0392b)' : 
            'linear-gradient(45deg, #f39c12, #e67e22)';
    }
    
    startReplay() {
        if (!this.gameState.replayData) {
            alert('No race data available for replay!');
            return;
        }
        
        this.gameState.replayMode = true;
        this.gameState.isRacing = true;
        this.gameState.raceFinished = false;
        
        // Reset balls to replay positions
        this.balls = JSON.parse(JSON.stringify(this.gameState.replayData.balls));
        
        document.getElementById('replay').disabled = true;
        document.getElementById('raceStatus').textContent = 'Replay mode - Race in progress...';
    }
    
    resetGame() {
        this.gameState = {
            money: 1000,
            selectedBall: null,
            betAmount: 0,
            isRacing: false,
            raceFinished: false,
            slowMotion: false,
            followCamera: false,
            cameraOffset: { x: 0, y: 0 },
            raceHistory: [],
            totalRaces: 0,
            wins: 0,
            currentRace: null,
            replayMode: false,
            replayData: null
        };
        
        this.initializeBalls();
        this.initializeObstacles();
        
        // Reset UI
        document.getElementById('placeBet').disabled = false;
        document.getElementById('startRace').disabled = true;
        document.getElementById('slowMotion').disabled = true;
        document.getElementById('followCamera').disabled = true;
        document.getElementById('replay').disabled = true;
        document.getElementById('ballNumber').value = 1;
        document.getElementById('betAmount').value = 50;
        document.getElementById('errorMessage').textContent = '';
        document.getElementById('raceStatus').textContent = 'Ready to race!';
        
        // Reset button states
        document.getElementById('slowMotion').textContent = 'Slow Motion';
        document.getElementById('followCamera').textContent = 'Follow Camera';
        document.getElementById('slowMotion').style.background = 'linear-gradient(45deg, #f39c12, #e67e22)';
        document.getElementById('followCamera').style.background = 'linear-gradient(45deg, #f39c12, #e67e22)';
        
        this.updateUI();
        this.updateSelectedBallDisplay();
        this.updateHistory();
        this.closeResultPopup();
    }
    
    updateRace() {
        if (!this.gameState.isRacing || this.gameState.raceFinished) return;
        
        const speedMultiplier = this.gameState.slowMotion ? 0.3 : 1;
        let finishedBalls = 0;
        
        this.balls.forEach(ball => {
            if (ball.finished) {
                finishedBalls++;
                return;
            }
            
            // Handle obstacle delays
            if (ball.obstacleDelay > 0) {
                ball.obstacleDelay--;
                return;
            }
            
            // Update ball position
            ball.angle += (ball.speed * speedMultiplier) / this.raceTrack.radius;
            ball.x = this.raceTrack.centerX + Math.cos(ball.angle) * this.raceTrack.radius;
            ball.y = this.raceTrack.centerY + Math.sin(ball.angle) * this.raceTrack.radius;
            
            // Update progress
            const normalizedAngle = (ball.angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            ball.progress = normalizedAngle / (Math.PI * 2);
            
            // Check for lap completion
            if (ball.angle >= Math.PI * 2 * (ball.laps + 1)) {
                ball.laps++;
                if (ball.laps >= 3) { // Race is 3 laps
                    ball.finished = true;
                    ball.finishTime = Date.now();
                    finishedBalls++;
                }
            }
            
            // Check obstacle collisions
            this.checkObstacleCollisions(ball);
        });
        
        // Check if race is finished
        if (finishedBalls >= this.balls.length || finishedBalls >= 10) {
            this.finishRace();
        }
        
        this.updateLeaderboard();
        this.updateRaceProgress();
    }
    
    checkObstacleCollisions(ball) {
        this.obstacles.forEach(obstacle => {
            const distance = Math.sqrt(
                Math.pow(ball.x - obstacle.x, 2) + Math.pow(ball.y - obstacle.y, 2)
            );
            
            if (distance < 25) {
                // Collision detected
                ball.obstacleDelay = 30; // Delay for 30 frames
                ball.speed = ball.baseSpeed * 0.5; // Reduce speed temporarily
                setTimeout(() => {
                    ball.speed = ball.baseSpeed;
                }, 1000);
            }
        });
    }
    
    finishRace() {
        this.gameState.isRacing = false;
        this.gameState.raceFinished = true;
        
        // Sort balls by finish time
        const finishedBalls = this.balls.filter(ball => ball.finished)
            .sort((a, b) => a.finishTime - b.finishTime);
        
        const winner = finishedBalls[0];
        this.gameState.currentRace.winner = winner.id;
        
        // Save replay data
        this.gameState.replayData = {
            balls: JSON.parse(JSON.stringify(this.balls)),
            winner: winner.id,
            timestamp: Date.now()
        };
        
        // Check if player won
        const playerWon = this.gameState.selectedBall === winner.id;
        let winnings = 0;
        
        if (playerWon) {
            // Calculate winnings based on odds
            const ballNumber = this.gameState.selectedBall;
            const odds = 1.5 + (ballNumber / 11) * 2;
            winnings = Math.round(this.gameState.betAmount * odds);
            this.gameState.money += winnings;
            this.gameState.wins++;
        }
        
        // Update race history
        this.gameState.raceHistory.push({
            raceNumber: this.gameState.totalRaces + 1,
            selectedBall: this.gameState.selectedBall,
            winner: winner.id,
            betAmount: this.gameState.betAmount,
            winnings: winnings,
            won: playerWon,
            timestamp: Date.now()
        });
        
        this.gameState.totalRaces++;
        
        // Enable buttons
        document.getElementById('placeBet').disabled = false;
        document.getElementById('slowMotion').disabled = true;
        document.getElementById('followCamera').disabled = true;
        document.getElementById('replay').disabled = false;
        
        // Reset selections
        this.gameState.selectedBall = null;
        this.gameState.betAmount = 0;
        
        this.updateUI();
        this.updateSelectedBallDisplay();
        this.updateHistory();
        this.showResultPopup(playerWon, winner.id, winnings);
        
        document.getElementById('raceStatus').textContent = `Race finished! Winner: Ball #${winner.id}`;
    }
    
    updateLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        
        if (!this.gameState.isRacing) {
            leaderboard.innerHTML = '<div class="no-race">Race not started</div>';
            return;
        }
        
        // Sort balls by progress and laps
        const sortedBalls = [...this.balls]
            .sort((a, b) => {
                if (a.laps !== b.laps) return b.laps - a.laps;
                return b.progress - a.progress;
            })
            .slice(0, 10);
        
        leaderboard.innerHTML = sortedBalls.map((ball, index) => {
            const isSelected = ball.id === this.gameState.selectedBall;
            const progressPercent = Math.round((ball.laps * 100 + ball.progress * 100) / 3);
            
            return `
                <div class="leaderboard-item ${isSelected ? 'selected' : ''}">
                    <span class="ball-number">#${ball.id}</span>
                    <span class="ball-progress">${progressPercent}%</span>
                </div>
            `;
        }).join('');
    }
    
    updateRaceProgress() {
        if (!this.gameState.isRacing) return;
        
        const progressElement = document.getElementById('raceProgress');
        const finishedCount = this.balls.filter(ball => ball.finished).length;
        const totalBalls = this.balls.length;
        
        progressElement.textContent = `Finished: ${finishedCount}/${totalBalls}`;
    }
    
    updateUI() {
        document.getElementById('money').textContent = this.gameState.money;
        document.getElementById('totalRaces').textContent = this.gameState.totalRaces;
        
        const winRate = this.gameState.totalRaces > 0 ? 
            Math.round((this.gameState.wins / this.gameState.totalRaces) * 100) : 0;
        document.getElementById('winRate').textContent = winRate + '%';
        
        this.updateOdds();
    }
    
    updateHistory() {
        const historyContent = document.getElementById('historyContent');
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        
        let filteredHistory = this.gameState.raceHistory;
        
        if (activeTab === 'wins') {
            filteredHistory = this.gameState.raceHistory.filter(race => race.won);
        } else if (activeTab === 'losses') {
            filteredHistory = this.gameState.raceHistory.filter(race => !race.won);
        }
        
        if (filteredHistory.length === 0) {
            historyContent.innerHTML = '<p class="no-history">No races yet!</p>';
            return;
        }
        
        historyContent.innerHTML = filteredHistory
            .slice(-10)
            .reverse()
            .map(race => {
                const date = new Date(race.timestamp).toLocaleTimeString();
                return `
                    <div class="history-item ${race.won ? 'win' : 'loss'}">
                        <div>Race #${race.raceNumber} - ${date}</div>
                        <div>Ball #${race.selectedBall} vs Winner #${race.winner}</div>
                        <div>Bet: ${race.betAmount} | ${race.won ? `Won: ${race.winnings}` : 'Lost'}</div>
                    </div>
                `;
            }).join('');
    }
    
    switchHistoryTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        this.updateHistory();
    }
    
    showResultPopup(won, winnerId, winnings) {
        const popup = document.getElementById('resultPopup');
        const title = document.getElementById('resultTitle');
        const gif = document.getElementById('resultGif');
        const details = document.getElementById('resultDetails');
        
        if (won) {
            title.textContent = '🎉 Congratulations!';
            title.className = 'win-text';
            gif.innerHTML = '<img src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdG5jejJqZGtqN3MxMmQ3NTVqeDZ3cWtmNHA0YXEzOWswdWpqdzIxYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oz9ZE2Oo9zRC/giphy.gif" alt="Congratulations">';
            details.innerHTML = `
                <p class="win-text">You won!</p>
                <p>Your ball #${this.gameState.selectedBall} finished 1st!</p>
                <p>Winnings: ${winnings}</p>
                <p>New balance: ${this.gameState.money}</p>
            `;
        } else {
            title.textContent = '😞 Better luck next time!';
            title.className = 'lose-text';
            gif.innerHTML = '<img src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXZtbHg1aWZkYnI1YjV3czByaTNwZzV4bGRvcXp3Ym0xZWxkcThxZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/En8fsYde6cqvhYBnAb/giphy.gif" alt="Better luck next time">';
            details.innerHTML = `
                <p class="lose-text">You lost!</p>
                <p>Your ball #${this.gameState.selectedBall} didn't win</p>
                <p>Winner: Ball #${winnerId}</p>
                <p>Lost: ${this.gameState.betAmount}</p>
                <p>Balance: ${this.gameState.money}</p>
            `;
        }
        
        popup.style.display = 'flex';
    }
    
    closeResultPopup() {
        document.getElementById('resultPopup').style.display = 'none';
    }

    showTermsModal() {
    // Load disclaimer content
    fetch('disclamer.txt')
        .then(response => response.text())
        .then(text => {
            document.getElementById('termsContent').textContent = text;
            document.getElementById('termsModal').style.display = 'flex';
        })
        .catch(error => {
            console.error('Error loading terms:', error);
            document.getElementById('termsContent').textContent = 'Error loading terms. Please try again.';
            document.getElementById('termsModal').style.display = 'flex';
        });
   }

    closeTermsModal() {
        document.getElementById('termsModal').style.display = 'none';
    } 
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera offset for follow mode
        if (this.gameState.followCamera && this.gameState.selectedBall) {
            const selectedBall = this.balls.find(ball => ball.id === this.gameState.selectedBall);
            if (selectedBall) {
                this.gameState.cameraOffset.x = this.canvas.width / 2 - selectedBall.x;
                this.gameState.cameraOffset.y = this.canvas.height / 2 - selectedBall.y;
            }
        } else {
            this.gameState.cameraOffset.x = 0;
            this.gameState.cameraOffset.y = 0;
        }
        
        this.ctx.save();
        this.ctx.translate(this.gameState.cameraOffset.x, this.gameState.cameraOffset.y);
        
        // Draw track
        this.drawTrack();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw balls
        this.drawBalls();
        
        // Draw finish line
        this.drawFinishLine();
        
        this.ctx.restore();
        
        // Draw UI elements (not affected by camera)
        this.drawUI();
    }
    
    drawTrack() {
        // Outer track
        this.ctx.beginPath();
        this.ctx.arc(this.raceTrack.centerX, this.raceTrack.centerY, this.raceTrack.radius + 30, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 60;
        this.ctx.stroke();
        
        // Inner track
        this.ctx.beginPath();
        this.ctx.arc(this.raceTrack.centerX, this.raceTrack.centerY, this.raceTrack.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        // Track lane lines
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = this.raceTrack.centerX + Math.cos(angle) * (this.raceTrack.radius - 30);
            const y1 = this.raceTrack.centerY + Math.sin(angle) * (this.raceTrack.radius - 30);
            const x2 = this.raceTrack.centerX + Math.cos(angle) * (this.raceTrack.radius + 30);
            const y2 = this.raceTrack.centerY + Math.sin(angle) * (this.raceTrack.radius + 30);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = '#999';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            this.ctx.save();
            this.ctx.translate(obstacle.x, obstacle.y);
            this.ctx.rotate(obstacle.angle);
            
            if (obstacle.type === 'spike') {
                // Draw spike obstacle
                this.ctx.beginPath();
                this.ctx.moveTo(-15, -10);
                this.ctx.lineTo(0, -20);
                this.ctx.lineTo(15, -10);
                this.ctx.lineTo(15, 10);
                this.ctx.lineTo(-15, 10);
                this.ctx.closePath();
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fill();
                this.ctx.strokeStyle = '#c0392b';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {
                // Draw barrier obstacle
                this.ctx.fillStyle = '#f39c12';
                this.ctx.fillRect(-15, -10, 30, 20);
                this.ctx.strokeStyle = '#e67e22';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(-15, -10, 30, 20);
            }
            
            this.ctx.restore();
        });
    }
    
    drawBalls() {
        this.balls.forEach(ball => {
            // Draw ball shadow
            this.ctx.beginPath();
            this.ctx.arc(ball.x + 2, ball.y + 2, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fill();
            
            // Draw ball
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = ball.color;
            this.ctx.fill();
            
            // Ball outline
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Highlight selected ball
            if (ball.id === this.gameState.selectedBall) {
                this.ctx.beginPath();
                this.ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#f1c40f';
                this.ctx.lineWidth = 4;
                this.ctx.stroke();
            }
            
            // Draw ball number
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(ball.id, ball.x, ball.y);
            
            // Draw speed indicator for racing balls
            if (this.gameState.isRacing && ball.obstacleDelay === 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(ball.x, ball.y);
                const speedX = ball.x + Math.cos(ball.angle) * ball.speed * 10;
                const speedY = ball.y + Math.sin(ball.angle) * ball.speed * 10;
                this.ctx.lineTo(speedX, speedY);
                this.ctx.strokeStyle = '#27ae60';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
        });
    }
    
    drawFinishLine() {
        const finishX = this.raceTrack.centerX + Math.cos(this.raceTrack.finishLine) * this.raceTrack.radius;
        const finishY = this.raceTrack.centerY + Math.sin(this.raceTrack.finishLine) * this.raceTrack.radius;
        
        this.ctx.save();
        this.ctx.translate(finishX, finishY);
        this.ctx.rotate(this.raceTrack.finishLine + Math.PI / 2);
        
        // Draw checkered finish line
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 2; j++) {
                this.ctx.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#333';
                this.ctx.fillRect(j * 10 - 10, i * 10 - 30, 10, 10);
            }
        }
        
        this.ctx.restore();
    }
    
    drawUI() {
        // Draw slow motion indicator
        if (this.gameState.slowMotion) {
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
            this.ctx.fillRect(10, 10, 100, 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SLOW MOTION', 60, 28);
        }
        
        // Draw follow camera indicator
        if (this.gameState.followCamera) {
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
            this.ctx.fillRect(10, 50, 120, 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('FOLLOW CAMERA', 70, 68);
        }
        
        // Draw replay indicator
        if (this.gameState.replayMode) {
            this.ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
            this.ctx.fillRect(10, 90, 80, 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('REPLAY', 50, 108);
        }
    }
    
    gameLoop() {
        this.updateRace();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BallRacingGame();
});