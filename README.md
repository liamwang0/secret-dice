# Secret Dice

A decentralized, two-player dice game leveraging **Fully Homomorphic Encryption (FHE)** technology to enable truly private and verifiable on-chain gaming. Built with **Zama's FHEVM** and deployed on Ethereum.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Why Secret Dice?](#why-secret-dice)
- [Technology Stack](#technology-stack)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running Locally](#running-locally)
  - [Deployment](#deployment)
- [Usage](#usage)
  - [Playing the Game](#playing-the-game)
  - [Smart Contract Interactions](#smart-contract-interactions)
  - [Hardhat Tasks](#hardhat-tasks)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Frontend Application](#frontend-application)
- [Testing](#testing)
- [Deployment Information](#deployment-information)
- [Problems Solved](#problems-solved)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Secret Dice** is a blockchain-based dice game where two players compete by rolling dice with encrypted values. Unlike traditional on-chain games where randomness and fairness are challenging to guarantee, Secret Dice uses **Fully Homomorphic Encryption (FHE)** to keep dice rolls completely private until both players have committed their rolls. This ensures:

- **Privacy**: Your dice roll remains secret until the reveal phase
- **Fairness**: Neither player can manipulate or see the opponent's roll beforehand
- **Transparency**: All game logic executes on-chain with verifiable smart contracts
- **Real Stakes**: Players wager real ETH (0.0001 ETH entry fee per player)

The winner takes the entire pot (0.0002 ETH), and in case of a draw, both players receive their entry fees back.

---

## Key Features

### 1. Fully Homomorphic Encryption (FHE)
- **Encrypted Dice Rolls**: Uses Zama's FHEVM to generate and store encrypted random values (1-6) on-chain
- **Private Until Reveal**: Dice values remain encrypted until both players have rolled
- **Cryptographic Fairness**: Impossible for players to cheat or preview opponent's roll
- **Oracle-Based Decryption**: Zama's decryption oracle securely reveals values when conditions are met

### 2. Complete On-Chain Gaming
- **Smart Contract Logic**: All game states, validations, and rewards managed by Solidity contracts
- **No Centralized Server**: Fully decentralized with no trusted intermediary
- **Real Financial Stakes**: Players wager 0.0001 ETH to join each game
- **Automated Payouts**: Winners claim rewards directly from the contract

### 3. Secure Game Flow
- **Four Game States**: `WaitingForPlayers` → `WaitingForRolls` → `AwaitingReveal` → `Completed`
- **Reentrancy Protection**: Custom locking mechanism prevents double-claiming attacks
- **Entry Fee Validation**: Ensures both players contribute equally
- **Pot Management**: Tracks accumulated ETH and prevents premature withdrawals

### 4. Modern User Experience
- **React Frontend**: Intuitive UI built with React 19 and TypeScript
- **Multi-Wallet Support**: RainbowKit integration for seamless wallet connections
- **Real-Time Updates**: Live game state synchronization
- **Responsive Design**: Works across desktop and mobile devices

---

## Why Secret Dice?

### Advantages Over Traditional On-Chain Games

| Challenge | Traditional Approach | Secret Dice Solution |
|-----------|---------------------|---------------------|
| **Randomness** | Blockhash or VRF (predictable or expensive) | FHE-encrypted random generation |
| **Privacy** | All values visible on-chain | Encrypted values until reveal |
| **Fairness** | Relies on commit-reveal schemes | Cryptographically enforced via FHE |
| **Gas Costs** | High for complex logic | Optimized with FHEVM operations |
| **Trust** | Often requires oracle trust | Minimized trust through encryption |

### What Makes Secret Dice Unique?

1. **Cutting-Edge Cryptography**: One of the first production games using Zama's FHEVM technology
2. **True Privacy**: Unlike commit-reveal schemes, FHE provides mathematical guarantees of privacy
3. **Simple Yet Powerful**: Demonstrates FHE's practical application in an easy-to-understand format
4. **Educational Value**: Serves as a reference implementation for developers exploring FHE gaming
5. **Verifiable Fairness**: Every step is auditable on-chain while maintaining player privacy

---

## Technology Stack

### Smart Contracts
- **[Solidity](https://soliditylang.org/)** `^0.8.24` - Smart contract programming language
- **[FHEVM](https://docs.zama.ai/fhevm)** - Zama's Fully Homomorphic Encryption VM for encrypted computation
- **[Hardhat](https://hardhat.org/)** `^2.26.0` - Ethereum development framework
- **[Hardhat Deploy](https://github.com/wighawag/hardhat-deploy)** - Deployment plugin for versioned deployments
- **[TypeChain](https://github.com/dethcrypto/TypeChain)** - TypeScript bindings generator for contracts
- **[OpenZeppelin Contracts](https://openzeppelin.com/contracts/)** - Secure, audited contract libraries

### Frontend
- **[React](https://react.dev/)** `19.1.1` - Modern UI library
- **[TypeScript](https://www.typescriptlang.org/)** `5.8` - Type-safe JavaScript superset
- **[Vite](https://vite.dev/)** `7.1.6` - Fast build tool and dev server
- **[Wagmi](https://wagmi.sh/)** `2.17.0` - React hooks for Ethereum interactions
- **[RainbowKit](https://www.rainbowkit.com/)** `2.2.8` - Beautiful wallet connection UI
- **[Ethers.js](https://docs.ethers.org/)** `6.15.0` - Ethereum library for contract interactions
- **[TanStack Query](https://tanstack.com/query/)** `5.89.0` - Powerful async state management

### Development & Testing
- **[Mocha](https://mochajs.org/)** - JavaScript test framework
- **[Chai](https://www.chaijs.com/)** - Assertion library
- **[Hardhat Network](https://hardhat.org/hardhat-network/)** - Local Ethereum network for testing
- **[ESLint](https://eslint.org/)** - Code linting and formatting
- **[Solidity Coverage](https://github.com/sc-forks/solidity-coverage)** - Test coverage measurement

### Deployment Networks
- **Local**: Hardhat Network (chainId: 31337)
- **Testnet**: Sepolia (chainId: 11155111) - Primary deployment
- **Oracle**: Zama FHE Decryption Oracle

---

## How It Works

### Game Flow Overview

```
┌─────────────────┐
│  Create Game    │ ─┐
└─────────────────┘  │
                     │ State: WaitingForPlayers
┌─────────────────┐  │
│  Player 2 Joins │ ◄┘ (pays 0.0001 ETH)
└─────────────────┘
         │
         │ State: WaitingForRolls
         ▼
┌─────────────────┐
│ Player 1 Rolls  │ ─┐ (encrypted value stored)
└─────────────────┘  │
                     │
┌─────────────────┐  │
│ Player 2 Rolls  │ ◄┘ (triggers oracle decryption)
└─────────────────┘
         │
         │ State: AwaitingReveal
         ▼
┌─────────────────┐
│ Oracle Callback │ (decrypts both dice rolls)
└─────────────────┘
         │
         │ State: Completed
         ▼
┌─────────────────┐
│  Claim Rewards  │ Winner: 0.0002 ETH | Draw: 0.0001 ETH each
└─────────────────┘
```

### Technical Flow

1. **Game Creation**
   - Player 1 calls `createGame()`
   - Contract initializes game struct with `gameId`
   - State: `WaitingForPlayers`

2. **Player Joins**
   - Player 2 calls `joinGame(gameId)` with 0.0001 ETH
   - Contract validates entry fee and game state
   - State: `WaitingForRolls`

3. **Encrypted Rolling**
   - Each player calls `rollDice(gameId)`
   - Contract uses `TFHE.randEuint32()` to generate encrypted random number
   - Modulo operation bounds value to 1-6: `(rand % 6) + 1`
   - Encrypted roll stored in `game.encryptedRolls[playerIndex]`
   - When both players roll, oracle decryption request initiated

4. **Oracle Decryption**
   - Contract requests decryption of both encrypted rolls
   - Zama oracle receives encrypted values
   - Oracle decrypts securely and calls `onDiceDecrypted(requestId, cleartexts, proof)`
   - State: `AwaitingReveal`

5. **Reveal & Completion**
   - `onDiceDecrypted` callback receives decrypted values
   - Contract stores decrypted dice values (1-6)
   - Determines winner or draw
   - State: `Completed`

6. **Reward Claims**
   - **Winner**: Calls `claimReward(gameId)` to receive 0.0002 ETH
   - **Draw**: Both players call `claimDrawRefund(gameId)` to receive 0.0001 ETH each
   - Reentrancy protection ensures single claim per player

---

## Project Structure

```
secret-dice/
├── contracts/
│   └── SecretDice.sol              # Main game contract with FHE logic
│
├── deploy/
│   └── deploy.ts                   # Hardhat deployment script
│
├── scripts/
│   └── sync-contract.js            # Syncs contract ABI/address to frontend
│
├── tasks/
│   ├── secretDice.ts               # Hardhat CLI tasks for game operations
│   └── accounts.ts                 # Account management tasks
│
├── test/
│   └── SecretDice.ts               # Comprehensive contract test suite
│
├── home/                           # Frontend React application
│   ├── public/                     # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── DiceApp.tsx         # Main application component
│   │   │   ├── GameCard.tsx        # Individual game card UI
│   │   │   └── Header.tsx          # Header with wallet connection
│   │   ├── config/
│   │   │   ├── contracts.ts        # Contract addresses and ABIs
│   │   │   ├── wagmi.ts            # Wagmi/RainbowKit configuration
│   │   │   └── generated/          # Auto-generated contract configs
│   │   ├── hooks/
│   │   │   └── useEthersSigner.ts  # Wagmi to Ethers.js signer conversion
│   │   ├── types/
│   │   │   └── game.ts             # TypeScript type definitions
│   │   ├── styles/                 # CSS modules
│   │   └── main.tsx                # Application entry point
│   └── vite.config.ts              # Vite build configuration
│
├── hardhat.config.ts               # Hardhat project configuration
├── package.json                    # Root dependencies and scripts
└── .env.example                    # Environment variable template
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **MetaMask** or another Web3 wallet
- **Sepolia ETH** for testnet deployment/testing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/secret-dice.git
   cd secret-dice
   ```

2. **Install smart contract dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd home
   npm install
   cd ..
   ```

### Configuration

1. **Set up environment variables**
   ```bash
   # Set your BIP-39 mnemonic
   npx hardhat vars set MNEMONIC

   # Set your Infura API key for network access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

2. **Get Sepolia ETH**
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Request test ETH for your deployment wallet

### Running Locally

#### Start Local Hardhat Node
```bash
# Terminal 1: Start local blockchain
npx hardhat node
```

#### Deploy Contracts Locally
```bash
# Terminal 2: Deploy to local network
npx hardhat deploy --network localhost

# Sync contract to frontend
node scripts/sync-contract.js
```

#### Start Frontend
```bash
# Terminal 2 or 3: Start React app
cd home
npm run dev
```

Visit `http://localhost:5173` to interact with the application.

### Deployment

#### Deploy to Sepolia Testnet
```bash
# Deploy contract
npx hardhat deploy --network sepolia

# Sync contract ABI and address to frontend
node scripts/sync-contract.js

# Verify contract on Etherscan (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

#### Build Frontend for Production
```bash
cd home
npm run build
```

The production build will be in `home/dist/`.

---

## Usage

### Playing the Game

#### Via Frontend UI

1. **Connect Wallet**
   - Click "Connect Wallet" button in header
   - Select your wallet provider (MetaMask, WalletConnect, etc.)
   - Approve connection request

2. **Create New Game**
   - Click "Create Game" button
   - Confirm transaction in wallet (gas fees apply)
   - Wait for transaction confirmation
   - Your game appears in the game grid

3. **Join Existing Game**
   - Find a game in "Waiting for Players" state
   - Click "Join Game" button
   - Send 0.0001 ETH entry fee
   - Confirm transaction

4. **Roll Dice**
   - Once both players joined, click "Roll Dice"
   - Confirm transaction (your roll is encrypted on-chain)
   - Wait for opponent to roll

5. **Reveal & Claim**
   - After both players roll, oracle automatically decrypts
   - Click "Refresh Games" to see revealed dice values
   - If you won: Click "Claim Reward" to receive 0.0002 ETH
   - If draw: Click "Claim Refund" to receive 0.0001 ETH back

### Smart Contract Interactions

#### Using Ethers.js

```javascript
import { ethers } from 'ethers';
import SecretDiceABI from './abi/SecretDice.json';

const contractAddress = '0xB507ABf3632570278Bdf014b96c04E796Cfd8B55';
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const contract = new ethers.Contract(contractAddress, SecretDiceABI, signer);

// Create game
await contract.createGame();

// Join game
await contract.joinGame(gameId, { value: ethers.utils.parseEther('0.0001') });

// Roll dice
await contract.rollDice(gameId);

// Claim reward
await contract.claimReward(gameId);

// Get game info
const game = await contract.getGame(gameId);
console.log(game);
```

### Hardhat Tasks

The project includes convenient Hardhat tasks for CLI interaction:

```bash
# Display deployed contract address
npx hardhat dice:address --network sepolia

# Create a new game
npx hardhat dice:create --network sepolia

# Join a game (replace 0 with actual gameId)
npx hardhat dice:join --id 0 --network sepolia

# Roll dice in a game
npx hardhat dice:roll --id 0 --network sepolia

# Claim reward after winning
npx hardhat dice:claim --id 0 --network sepolia

# Claim refund after draw
npx hardhat dice:refund --id 0 --network sepolia

# View game information
npx hardhat dice:info --id 0 --network sepolia
```

---

## Smart Contract Architecture

### Core Contract: `SecretDice.sol`

#### State Variables

```solidity
struct Game {
    address[2] players;           // Player addresses
    euint32[2] encryptedRolls;    // FHE-encrypted dice rolls
    uint8[2] diceValues;          // Decrypted dice values (1-6)
    GameState state;              // Current game state
    uint256 pot;                  // Accumulated ETH in game
    bool[2] hasClaimed;           // Tracks reward claims
    uint256 decryptionRequestId;  // Oracle request ID
}

enum GameState {
    WaitingForPlayers,  // Waiting for player 2
    WaitingForRolls,    // Waiting for both dice rolls
    AwaitingReveal,     // Waiting for oracle decryption
    Completed           // Game finished, ready for claims
}
```

#### Key Functions

**Game Management**
- `createGame()` - Initialize new game, returns `gameId`
- `joinGame(uint256 gameId)` - Join existing game with entry fee
- `getGame(uint256 gameId)` - Retrieve full game state
- `getGamePot(uint256 gameId)` - Get current pot value

**Gameplay**
- `rollDice(uint256 gameId)` - Generate and store encrypted dice roll
- `onDiceDecrypted(uint256 requestId, uint256[] memory cleartexts, uint256 proof)` - Oracle callback for decryption

**Rewards**
- `claimReward(uint256 gameId)` - Winner claims full pot
- `claimDrawRefund(uint256 gameId)` - Players claim refund on draw

**FHE Operations**
- `getEncryptedRoll(uint256 gameId, uint8 playerIndex)` - Access encrypted roll value
- Uses `TFHE.randEuint32()` for cryptographically secure random generation
- `TFHE.asEuint32((rand % 6) + 1)` bounds values to dice range (1-6)

#### Security Features

1. **Reentrancy Protection**
   - Custom `nonReentrant` modifier using boolean lock
   - Prevents recursive calls to claim functions

2. **State Validation**
   - Strict state machine enforcement
   - Entry fee validation (exactly 0.0001 ETH)
   - Player identity verification

3. **Pot Management**
   - Tracks all deposits and payouts
   - Prevents over-withdrawal attacks
   - Accurate refund calculations

4. **Access Control**
   - Only players in game can interact
   - Oracle-only callback for decryption

---

## Frontend Application

### Component Architecture

#### `DiceApp.tsx` - Main Application
- Wallet connection state management
- Contract instance initialization
- Game creation logic
- Game list rendering
- Status message handling

#### `GameCard.tsx` - Game Display
- Individual game state rendering
- Conditional button rendering based on:
  - Player role (player 1, player 2, or spectator)
  - Game state
  - Claim status
- Action handlers (join, roll, claim, refund)
- Loading states during transactions

#### `Header.tsx` - Navigation & Connection
- RainbowKit wallet connection button
- Application title and branding

### State Management

- **Local State**: React `useState` for UI state
- **Wallet State**: Wagmi hooks (`useAccount`, `useConnect`)
- **Contract Interactions**: Ethers.js with custom `useEthersSigner` hook
- **Async State**: Manual loading flags (future: React Query integration)

### Styling

- CSS Modules for component-scoped styles
- Responsive grid layout for game cards
- Modern card-based UI design
- Status-based color coding (green for success, red for errors)

---

## Testing

### Run Test Suite

```bash
# Run all tests
npm run test

# Run with coverage report
npm run coverage

# Run specific test file
npx hardhat test test/SecretDice.ts
```

### Test Coverage

The test suite covers:

1. **Game Creation**
   - Successful game initialization
   - GameId incrementation
   - Proper state assignment

2. **Player Joining**
   - Entry fee validation (reverts if incorrect amount)
   - Player 2 assignment
   - State transition to `WaitingForRolls`

3. **Dice Rolling**
   - Encrypted value generation
   - Both players can roll
   - Decryption request triggered after second roll

4. **Oracle Decryption**
   - Callback receives decrypted values
   - Dice values stored correctly (1-6 range)
   - State transition to `Completed`

5. **Reward Claims**
   - Winner receives full pot (0.0002 ETH)
   - Draw refunds work correctly (0.0001 ETH each)
   - Reentrancy protection prevents double claims
   - Reverts for unauthorized claimants

6. **Edge Cases**
   - Invalid game IDs
   - Incorrect entry fees
   - Premature claim attempts
   - Multiple claim attempts

### Sample Test Output

```
  SecretDice
    ✓ Should create a new game (125ms)
    ✓ Should allow player 2 to join with correct entry fee (98ms)
    ✓ Should revert if incorrect entry fee provided (45ms)
    ✓ Both players can roll dice (234ms)
    ✓ Oracle decrypts dice rolls correctly (189ms)
    ✓ Winner can claim reward (156ms)
    ✓ Players can claim draw refund (201ms)
    ✓ Prevents reentrancy attacks (78ms)

  8 passing (1.2s)
```

---

## Deployment Information

### Current Deployment

**Network**: Sepolia Testnet
**Chain ID**: 11155111
**Contract Address**: `0xB507ABf3632570278Bdf014b96c04E796Cfd8B55`

**Etherscan**: [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xB507ABf3632570278Bdf014b96c04E796Cfd8B55)

### Deployment Parameters

- **Entry Fee**: 0.0001 ETH per player
- **Winner Payout**: 0.0002 ETH (full pot)
- **Draw Refund**: 0.0001 ETH per player
- **Gas Optimization**: Minimal storage, efficient state transitions

### Network Configuration

The project supports multiple networks via Hardhat:

```typescript
networks: {
  hardhat: {
    chainId: 31337,
  },
  sepolia: {
    url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    accounts: { mnemonic: MNEMONIC },
    chainId: 11155111,
  },
}
```

---

## Problems Solved

### 1. Fair Randomness in Decentralized Gaming

**Problem**: Traditional blockchain games struggle with generating truly random, unpredictable values. Common solutions like `blockhash` are predictable, and VRF oracles add complexity and cost.

**Solution**: FHEVM's `TFHE.randEuint32()` generates cryptographically secure random numbers that remain encrypted until the appropriate reveal phase, making them impossible to predict or manipulate.

### 2. Privacy in On-Chain Gaming

**Problem**: All data on public blockchains is visible. In competitive games, this means players can see opponent actions before committing their own moves, enabling front-running and unfair advantages.

**Solution**: Fully Homomorphic Encryption keeps dice rolls completely private and encrypted on-chain. Values are only revealed when both players have committed, ensuring neither can gain an unfair advantage.

### 3. Commit-Reveal Scheme Complexity

**Problem**: Traditional commit-reveal schemes require multiple transactions, complex hashing, and are vulnerable to griefing attacks (player 1 commits but never reveals).

**Solution**: FHE eliminates the need for multi-phase commit-reveal. Players roll once, and the oracle handles decryption automatically when conditions are met, reducing complexity and attack surface.

### 4. Trust in Game Fairness

**Problem**: Off-chain games require trusting the server. On-chain games often require trusting oracle providers or other intermediaries.

**Solution**: Zama's FHE oracle provides mathematical guarantees of correctness. The decryption process is cryptographically verifiable, minimizing trust assumptions.

### 5. Poor User Experience in dApps

**Problem**: Many Web3 games have clunky UIs, poor wallet integration, and confusing transaction flows.

**Solution**: Modern React frontend with RainbowKit provides intuitive wallet connections, clear game state visualization, and guided user flows.

---

## Future Roadmap

### Phase 1: Core Enhancements (Q2 2025)

- [ ] **Multi-Dice Support**: Allow games with multiple dice (2d6, 3d6, etc.)
- [ ] **Custom Stake Amounts**: Let players choose entry fee amounts
- [ ] **Game Lobbies**: Public/private game rooms with custom settings
- [ ] **Game History**: Track player statistics and past games
- [ ] **Leaderboard**: Ranking system based on wins and total earnings

### Phase 2: Advanced Features (Q3 2025)

- [ ] **Tournament Mode**: Multi-round elimination tournaments
- [ ] **Spectator Mode**: Watch ongoing games in real-time
- [ ] **Chat System**: In-game encrypted messaging using FHE
- [ ] **NFT Rewards**: Achievement NFTs for milestones
- [ ] **Mobile App**: Native iOS/Android applications

### Phase 3: Platform Expansion (Q4 2025)

- [ ] **Mainnet Deployment**: Launch on Ethereum mainnet
- [ ] **L2 Integration**: Deploy to Arbitrum, Optimism, Base
- [ ] **Cross-Chain Gaming**: Bridge games across multiple chains
- [ ] **SDK Release**: Developer toolkit for building FHE games
- [ ] **Game Templates**: Pre-built templates for dice, cards, RPS

### Phase 4: Ecosystem Growth (2026)

- [ ] **DAO Governance**: Community-driven platform decisions
- [ ] **Revenue Sharing**: Platform fee distribution to token holders
- [ ] **Developer Grants**: Funding for community-built games
- [ ] **Educational Content**: Tutorials and documentation for FHE gaming
- [ ] **Partnerships**: Collaborate with other FHE and gaming protocols

### Research & Development

- [ ] **Gas Optimization**: Reduce transaction costs through contract optimization
- [ ] **Faster Decryption**: Work with Zama to reduce oracle callback latency
- [ ] **Advanced FHE**: Explore FHE applications for poker, chess, etc.
- [ ] **ZK Integration**: Combine ZK proofs with FHE for additional privacy
- [ ] **AI Opponents**: FHE-powered AI players for single-player mode

---

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, improving documentation, or proposing new features, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed
4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow ESLint and Prettier configurations
- **Testing**: Maintain >80% test coverage for smart contracts
- **Documentation**: Update README and inline comments
- **Security**: Never commit private keys or sensitive data
- **Gas Efficiency**: Optimize contract functions for lower gas costs

### Reporting Bugs

Open an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, wallet)

### Suggesting Features

Open an issue with:
- Feature description and use case
- Why it would benefit users
- Potential implementation approach
- Any relevant examples or references

---

## License

This project is licensed under the **BSD-3-Clause-Clear License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **[Zama](https://www.zama.ai/)** - For pioneering FHEVM technology and providing the FHE infrastructure
- **[Hardhat](https://hardhat.org/)** - For the excellent Ethereum development framework
- **[RainbowKit](https://www.rainbowkit.com/)** - For beautiful wallet connection UI components
- **[OpenZeppelin](https://openzeppelin.com/)** - For secure, audited smart contract libraries
- The Ethereum community for continued innovation in decentralized gaming

---

## Support & Resources

- **Documentation**: [FHEVM Docs](https://docs.zama.ai/fhevm)
- **Zama Community**: [Discord](https://discord.gg/zama)
- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/secret-dice/issues)

---

## Disclaimer

This project is experimental and for educational purposes. Smart contracts have not been formally audited. Users should only interact with test networks and use test funds. The developers are not responsible for any loss of funds or other damages.

**Play responsibly and always verify contract addresses before interacting.**

---

**Powered by Zama FHEVM - The Future of Private Smart Contracts**
