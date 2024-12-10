import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the contract's state
const contractState = {
  iotDevices: new Map(),
  projectImpact: new Map(),
};

// Mock contract functions
const contractFunctions = {
  'register-device': (deviceId: string, projectId: string, deviceType: string) => {
    contractState.iotDevices.set(deviceId.slice(1, -1), {
      project_id: parseInt(projectId.slice(1)),
      device_type: deviceType.slice(1, -1),
      last_reading: { timestamp: 0, value: 0 },
    });
    return { success: true, value: true };
  },
  'update-device-reading': (deviceId: string, timestamp: string, value: string) => {
    const device = contractState.iotDevices.get(deviceId.slice(1, -1));
    if (device) {
      device.last_reading = { timestamp: parseInt(timestamp.slice(1)), value: parseInt(value) };
      const projectImpact = contractState.projectImpact.get(device.project_id) || { total_impact: 0, last_updated: 0 };
      projectImpact.total_impact += parseInt(value);
      projectImpact.last_updated = parseInt(timestamp.slice(1));
      contractState.projectImpact.set(device.project_id, projectImpact);
      return { success: true, value: true };
    }
    return { success: false, error: 'Invalid device' };
  },
  'get-device-info': (deviceId: string) => {
    const device = contractState.iotDevices.get(deviceId.slice(1, -1));
    return device ? { success: true, value: device } : { success: false, error: 'Invalid device' };
  },
  'get-project-impact': (projectId: string) => {
    const impact = contractState.projectImpact.get(parseInt(projectId.slice(1))) || { total_impact: 0, last_updated: 0 };
    return { success: true, value: impact };
  },
};

// Mock contract call function
const mockContractCall = vi.fn((functionName: string, args: any[]) => {
  if (functionName in contractFunctions) {
    return contractFunctions[functionName as keyof typeof contractFunctions](...args);
  }
  throw new Error(`Unknown function: ${functionName}`);
});

describe('Impact Measurement Contract', () => {
  const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const deviceId = '"device-123"';
  const projectId = 'u1';
  
  beforeEach(() => {
    // Reset contract state before each test
    contractState.iotDevices.clear();
    contractState.projectImpact.clear();
    mockContractCall.mockClear();
  });
  
  it('should register a device', () => {
    const result = mockContractCall('register-device', [deviceId, projectId, '"temperature-sensor"']);
    expect(result).toEqual({ success: true, value: true });
  });
  
  it('should update device reading', () => {
    mockContractCall('register-device', [deviceId, projectId, '"temperature-sensor"']);
    const result = mockContractCall('update-device-reading', [deviceId, 'u1234567890', '25']);
    expect(result).toEqual({ success: true, value: true });
  });
  
  it('should get device info', () => {
    mockContractCall('register-device', [deviceId, projectId, '"temperature-sensor"']);
    mockContractCall('update-device-reading', [deviceId, 'u1234567890', '25']);
    const result = mockContractCall('get-device-info', [deviceId]);
    expect(result).toEqual({ success: true, value: { project_id: 1, device_type: 'temperature-sensor', last_reading: { timestamp: 1234567890, value: 25 } } });
  });
  
  it('should get project impact', () => {
    mockContractCall('register-device', [deviceId, projectId, '"temperature-sensor"']);
    mockContractCall('update-device-reading', [deviceId, 'u1234567890', '25']);
    const result = mockContractCall('get-project-impact', [projectId]);
    expect(result).toEqual({ success: true, value: { total_impact: 25, last_updated: 1234567890 } });
  });
});

