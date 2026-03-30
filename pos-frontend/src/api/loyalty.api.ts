import api from './axios';
import type {
  LoyaltyAccount,
  LoyaltyTransaction,
  WalletTransaction,
  EarnPointsData,
  RedeemPointsData,
  WalletTopupData,
  WalletPaymentData,
} from '../types';

export const loyaltyApi = {
  getAccount: async (customerId: string) => {
    const res = await api.get<{ account: LoyaltyAccount }>(`/loyalty/${customerId}`);
    return res.data.account;
  },

  earnPoints: async (data: EarnPointsData) => {
    const res = await api.post('/loyalty/earn', data);
    return res.data;
  },

  redeemPoints: async (data: RedeemPointsData) => {
    const res = await api.post('/loyalty/redeem', data);
    return res.data;
  },

  getPointsHistory: async (customerId: string) => {
    const res = await api.get<{ transactions: LoyaltyTransaction[] }>(
      `/loyalty/${customerId}/points-history`
    );
    return res.data.transactions;
  },

  walletTopup: async (data: WalletTopupData) => {
    const res = await api.post('/loyalty/wallet/topup', data);
    return res.data;
  },

  walletPayment: async (data: WalletPaymentData) => {
    const res = await api.post('/loyalty/wallet/payment', data);
    return res.data;
  },

  getWalletHistory: async (customerId: string) => {
    const res = await api.get<{ transactions: WalletTransaction[] }>(
      `/loyalty/${customerId}/wallet-history`
    );
    return res.data.transactions;
  },
};
