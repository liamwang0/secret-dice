import { CONTRACT_ADDRESS as GENERATED_ADDRESS, CONTRACT_ABI as GENERATED_ABI } from './generated/secretDice';

const configuredAddress ="0xD2Fd8c0f30c871c77974a4F6b58Ff104808D0A3c"

export const CONTRACT_ADDRESS = configuredAddress ?? GENERATED_ADDRESS;
export const CONTRACT_ABI = GENERATED_ABI;
