import { CONTRACT_ADDRESS as GENERATED_ADDRESS, CONTRACT_ABI as GENERATED_ABI } from './generated/secretDice';

const configuredAddress ="0xB507ABf3632570278Bdf014b96c04E796Cfd8B55"

export const CONTRACT_ADDRESS = configuredAddress ?? GENERATED_ADDRESS;
export const CONTRACT_ABI = GENERATED_ABI;
