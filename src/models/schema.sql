CREATE DATABASE IF NOT EXISTS party_games;
USE party_games;

CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(36) PRIMARY KEY,
    status ENUM('lobby', 'playing', 'finished') NOT NULL DEFAULT 'lobby',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    max_players INT NOT NULL DEFAULT 8,
    current_game VARCHAR(50),
    host_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(100) PRIMARY KEY,
    game_id VARCHAR(36),
    name VARCHAR(50) NOT NULL,
    is_host BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_rounds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id VARCHAR(36),
    round_number INT NOT NULL,
    prompt VARCHAR(255),
    status ENUM('pending', 'active', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS drawings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    round_id INT,
    player_id VARCHAR(100),
    drawing_data MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES game_rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id VARCHAR(36),
    player_id VARCHAR(100),
    game_type VARCHAR(50),
    score INT DEFAULT 0,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);