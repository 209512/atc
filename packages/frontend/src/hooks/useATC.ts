import { useContext } from 'react';
import { ATCContext } from '../contexts/ATCProvider';

export const useATC = () => {
  const context = useContext(ATCContext);
  if (!context) {
    throw new Error("useATC must be used within an ATCProvider");
  }
  return context;
};