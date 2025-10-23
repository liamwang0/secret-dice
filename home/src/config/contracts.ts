import { CONTRACT_ADDRESS as GENERATED_ADDRESS, CONTRACT_ABI as GENERATED_ABI } from './generated/secretDice';

const configuredAddress = import.meta.env.VITE_SECRET_DICE_ADDRESS as `0x${string}` | undefined;

export const CONTRACT_ADDRESS = configuredAddress ?? GENERATED_ADDRESS;
export const CONTRACT_ABI = GENERATED_ABI;
