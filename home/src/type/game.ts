export const GameStatus = {
  WaitingForPlayers: 0,
  WaitingForRolls: 1,
  AwaitingReveal: 2,
  Completed: 3,
} as const;

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

export type GameDetails = {
  id: bigint;
  status: GameStatus;
  creator: `0x${string}`;
  playerOne: `0x${string}`;
  playerTwo: `0x${string}`;
  playerOneRolled: boolean;
  playerTwoRolled: boolean;
  playerOneRoll: bigint;
  playerTwoRoll: bigint;
  winner: `0x${string}`;
  rewardClaimed: boolean;
  playerOneRefunded: boolean;
  playerTwoRefunded: boolean;
  pot: bigint;
  revealPending: boolean;
};

export const STATUS_LABELS: Record<GameStatus, string> = {
  [GameStatus.WaitingForPlayers]: 'Waiting for players',
  [GameStatus.WaitingForRolls]: 'Waiting for rolls',
  [GameStatus.AwaitingReveal]: 'Decrypting rolls',
  [GameStatus.Completed]: 'Completed',
};
