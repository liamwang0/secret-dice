import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { Contract } from 'ethers';
import { formatEther } from 'viem';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { GameCard } from './GameCard';
import type { GameDetails } from '../type/game';
import { GameStatus } from '../type/game';
import '../styles/DiceApp.css';

type ProcessingState = {
  gameId?: bigint;
  action: string;
};

function mapGame(id: bigint, raw: any, pot: bigint): GameDetails {
  return {
    id,
    status: Number(raw.status) as GameStatus,
    creator: raw.creator,
    playerOne: raw.playerOne,
    playerTwo: raw.playerTwo,
    playerOneRolled: raw.playerOneRolled,
    playerTwoRolled: raw.playerTwoRolled,
    playerOneRoll: BigInt(raw.playerOneRevealed),
    playerTwoRoll: BigInt(raw.playerTwoRevealed),
    winner: raw.winner,
    rewardClaimed: raw.rewardAlreadyClaimed,
    playerOneRefunded: raw.playerOneDrawRefunded,
    playerTwoRefunded: raw.playerTwoDrawRefunded,
    pot,
    revealPending: raw.revealPending,
  };
}

function extractErrorReason(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

export function DiceApp() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();

  const { data: entryFee } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'ENTRY_FEE',
  });

  const { data: rewardAmount } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'REWARD_AMOUNT',
  });

  const [games, setGames] = useState<GameDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [processing, setProcessing] = useState<ProcessingState | null>(null);

  const entryFeeLabel = useMemo(() => (entryFee ? `${formatEther(entryFee)} ETH` : '—'), [entryFee]);
  const rewardLabel = useMemo(() => (rewardAmount ? `${formatEther(rewardAmount)} ETH` : '—'), [rewardAmount]);

  const loadGames = useCallback(async () => {
    if (!publicClient) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const totalGames = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'nextGameId',
      })) as bigint;

      if (totalGames === 0n) {
        setGames([]);
        return;
      }

      const ids = Array.from({ length: Number(totalGames) }, (_value, index) => BigInt(index));
      const rawGames = await Promise.all(
        ids.map(async (id) => {
          const [gameData, pot] = await Promise.all([
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getGame',
              args: [id],
            }),
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getGamePot',
              args: [id],
            }),
          ]);

          return mapGame(id, gameData, pot as bigint);
        }),
      );

      setGames(rawGames.reverse());
    } catch (error) {
      console.error('Failed to load games', error);
      setErrorMessage('Unable to load games. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    loadGames();
  }, [loadGames, refreshFlag]);

  const getWritableContract = useCallback(async () => {
    if (!signerPromise) {
      throw new Error('Connect a wallet to continue.');
    }
    const signer = await signerPromise;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, [signerPromise]);

  const handleCreateGame = useCallback(async () => {
    try {
      setProcessing({ action: 'Creating game' });
      setStatusMessage('Creating a new game…');
      setErrorMessage(null);

      const contract = await getWritableContract();
      const tx = await contract.createGame();
      await tx.wait();

      setStatusMessage('Game created successfully.');
      setRefreshFlag((value) => value + 1);
    } catch (error) {
      const reason = extractErrorReason(error);
      setErrorMessage(reason);
      setStatusMessage(null);
    } finally {
      setProcessing(null);
    }
  }, [getWritableContract]);

  const handleJoin = useCallback(
    async (gameId: bigint) => {
      if (!entryFee) {
        throw new Error('Entry fee not available.');
      }
      try {
        setProcessing({ action: 'Joining game', gameId });
        setStatusMessage('Sending join transaction…');
        setErrorMessage(null);

        const contract = await getWritableContract();
        const tx = await contract.joinGame(gameId, { value: entryFee });
        await tx.wait();

        setStatusMessage('Joined the game successfully.');
        setRefreshFlag((value) => value + 1);
      } catch (error) {
        const reason = extractErrorReason(error);
        setErrorMessage(reason);
        setStatusMessage(null);
      } finally {
        setProcessing(null);
      }
    },
    [entryFee, getWritableContract],
  );

  const handleRoll = useCallback(
    async (gameId: bigint) => {
      try {
        setProcessing({ action: 'Rolling dice', gameId });
        setStatusMessage('Rolling your dice…');
        setErrorMessage(null);

        const contract = await getWritableContract();
        const tx = await contract.rollDice(gameId);
        await tx.wait();

        setStatusMessage('Dice roll submitted.');
        setRefreshFlag((value) => value + 1);
      } catch (error) {
        const reason = extractErrorReason(error);
        setErrorMessage(reason);
        setStatusMessage(null);
      } finally {
        setProcessing(null);
      }
    },
    [getWritableContract],
  );

  const handleClaimReward = useCallback(
    async (gameId: bigint) => {
      try {
        setProcessing({ action: 'Claiming reward', gameId });
        setStatusMessage('Claiming reward…');
        setErrorMessage(null);

        const contract = await getWritableContract();
        const tx = await contract.claimReward(gameId);
        await tx.wait();

        setStatusMessage('Reward claimed successfully.');
        setRefreshFlag((value) => value + 1);
      } catch (error) {
        const reason = extractErrorReason(error);
        setErrorMessage(reason);
        setStatusMessage(null);
      } finally {
        setProcessing(null);
      }
    },
    [getWritableContract],
  );

  const handleClaimRefund = useCallback(
    async (gameId: bigint) => {
      try {
        setProcessing({ action: 'Claiming refund', gameId });
        setStatusMessage('Claiming draw refund…');
        setErrorMessage(null);

        const contract = await getWritableContract();
        const tx = await contract.claimDrawRefund(gameId);
        await tx.wait();

        setStatusMessage('Refund claimed successfully.');
        setRefreshFlag((value) => value + 1);
      } catch (error) {
        const reason = extractErrorReason(error);
        setErrorMessage(reason);
        setStatusMessage(null);
      } finally {
        setProcessing(null);
      }
    },
    [getWritableContract],
  );

  const renderContent = () => {
    if (!isConnected) {
      return <p className="placeholder">Connect a wallet to start playing.</p>;
    }

    if (isLoading) {
      return <p className="placeholder">Loading games…</p>;
    }

    if (games.length === 0) {
      return <p className="placeholder">No games yet. Create the first one!</p>;
    }

    return (
      <div className="game-grid">
        {games.map((game) => (
          <GameCard
            key={game.id.toString()}
            game={game}
            currentAccount={address}
            entryFee={entryFee}
            rewardAmount={rewardAmount}
            onJoin={handleJoin}
            onRoll={handleRoll}
            onClaimReward={handleClaimReward}
            onClaimRefund={handleClaimRefund}
            isProcessing={Boolean(processing && (processing.gameId === undefined || processing.gameId === game.id))}
            processingAction={processing?.action}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="dice-app">
      <section className="dice-summary">
        <h2>How it works</h2>
        <p>
          Create a lobby, wait for another player, and roll FHE-powered dice. The highest roll wins the reward. Draws
          can be refunded by both players.
        </p>
        <div className="summary-grid">
          <div>
            <span>Entry fee</span>
            <strong>{entryFeeLabel}</strong>
          </div>
          <div>
            <span>Reward</span>
            <strong>{rewardLabel}</strong>
          </div>
        </div>
        <div className="actions">
          <button
            type="button"
            onClick={handleCreateGame}
            disabled={!isConnected || Boolean(processing)}
          >
            {processing?.action === 'Creating game' ? 'Creating…' : 'Create Game'}
          </button>
          <button type="button" onClick={() => setRefreshFlag((value) => value + 1)} disabled={isLoading}>
            Refresh
          </button>
        </div>
        {statusMessage && <p className="status-message success">{statusMessage}</p>}
        {errorMessage && <p className="status-message error">{errorMessage}</p>}
      </section>

      <section className="dice-games">{renderContent()}</section>
    </div>
  );
}
