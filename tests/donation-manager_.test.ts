import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the contract's state
const contractState = {
  lastDonationId: 0,
  donations: new Map(),
  charityFunds: new Map(),
};

// Mock contract functions
const contractFunctions = {
  donate: (charity: string, amount: string) => {
    const donationId = ++contractState.lastDonationId;
    contractState.donations.set(donationId, {
      donor: 'tx-sender',
      charity,
      amount: parseInt(amount.slice(1)),
      status: 'pending',
    });
    const currentFunds = contractState.charityFunds.get(charity) || 0;
    contractState.charityFunds.set(charity, currentFunds + parseInt(amount.slice(1)));
    return { success: true, value: donationId };
  },
  'release-funds': (donationId: string) => {
    const donation = contractState.donations.get(parseInt(donationId.slice(1)));
    if (donation && donation.status === 'pending') {
      donation.status = 'released';
      return { success: true, value: true };
    }
    return { success: false, error: 'Invalid donation or already released' };
  },
  'get-donation': (donationId: string) => {
    const donation = contractState.donations.get(parseInt(donationId.slice(1)));
    return donation ? { success: true, value: donation } : { success: false, error: 'Invalid donation' };
  },
  'get-charity-funds': (charity: string) => {
    const funds = contractState.charityFunds.get(charity) || 0;
    return { success: true, value: { total_funds: funds } };
  },
};

// Mock contract call function
const mockContractCall = vi.fn((functionName: string, args: any[]) => {
  if (functionName in contractFunctions) {
    return contractFunctions[functionName as keyof typeof contractFunctions](...args);
  }
  throw new Error(`Unknown function: ${functionName}`);
});

describe('Donation Manager Contract', () => {
  const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const donor = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const charity = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
  
  beforeEach(() => {
    // Reset contract state before each test
    contractState.lastDonationId = 0;
    contractState.donations.clear();
    contractState.charityFunds.clear();
    mockContractCall.mockClear();
  });
  
  it('should allow donations', () => {
    const result = mockContractCall('donation-manager', 'donate', [charity, 'u1000'], donor);
    expect(result).toEqual({ success: true, value: 1 });
  });
  
  it('should release funds', () => {
    mockContractCall('donation-manager', 'donate', [charity, 'u1000'], donor);
    const result = mockContractCall('donation-manager', 'release-funds', ['u1'], contractOwner);
    expect(result).toEqual({ success: true, value: true });
  });
  
  it('should get donation info', () => {
    mockContractCall('donation-manager', 'donate', [charity, 'u1000'], donor);
    const result = mockContractCall('donation-manager', 'get-donation', ['u1']);
    expect(result).toEqual({ success: true, value: {
        donor: 'tx-sender',
        charity: charity,
        amount: 1000,
        status: 'pending'
      }});
  });
  
  it('should get charity funds', () => {
    mockContractCall('donation-manager', 'donate', [charity, 'u1000'], donor);
    const result = mockContractCall('donation-manager', 'get-charity-funds', [charity]);
    expect(result).toEqual({ success: true, value: { total_funds: 1000 } });
  });
});

