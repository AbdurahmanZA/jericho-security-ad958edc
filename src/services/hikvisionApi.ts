
export interface HikvisionCredentials {
  appKey: string;
  appSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

export interface HikvisionDevice {
  deviceSerial: string;
  deviceName: string;
  deviceType: string;
  status: 'online' | 'offline';
  channelNo: number;
  subChannelNo?: number;
  deviceModel: string;
  capability?: string;
  encrypt?: boolean;
  picUrl?: string;
  isShared?: boolean;
  shareStatus?: number;
}

export interface HikvisionEvent {
  eventId: string;
  eventType: string;
  eventTime: string;
  deviceSerial: string;
  channelNo: number;
  picUrl?: string;
  videoUrl?: string;
  alarmType?: number;
  description?: string;
}

export interface HikvisionStream {
  url: string;
  streamType: 'hls' | 'rtmp' | 'rtsp';
  quality: 'HD' | 'SD';
  deviceSerial: string;
  channelNo: number;
}

export interface HikvisionApiResponse<T = any> {
  code: string;
  msg: string;
  data?: T;
}

export class HikvisionApiService {
  private baseUrl = 'https://open.ys7.com/api/lapp';
  private credentials: HikvisionCredentials | null = null;

  constructor(credentials?: HikvisionCredentials) {
    if (credentials) {
      this.credentials = credentials;
    }
  }

  setCredentials(credentials: HikvisionCredentials) {
    this.credentials = credentials;
  }

  private async makeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    data?: any
  ): Promise<HikvisionApiResponse<T>> {
    if (!this.credentials?.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = new URLSearchParams({
      accessToken: this.credentials.accessToken,
      ...data
    });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? body : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Hikvision API request failed:', error);
      throw error;
    }
  }

  // Authentication APIs
  async getAccessToken(): Promise<string> {
    if (!this.credentials?.appKey || !this.credentials?.appSecret) {
      throw new Error('AppKey and AppSecret are required');
    }

    const url = `${this.baseUrl}/token/get`;
    const body = new URLSearchParams({
      appKey: this.credentials.appKey,
      appSecret: this.credentials.appSecret,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const result = await response.json();
      
      if (result.code === '200') {
        this.credentials.accessToken = result.data.accessToken;
        this.credentials.refreshToken = result.data.refreshToken;
        this.credentials.tokenExpiry = Date.now() + (result.data.expireTime * 1000);
        return result.data.accessToken;
      } else {
        throw new Error(`Authentication failed: ${result.msg}`);
      }
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const url = `${this.baseUrl}/token/refresh`;
    const body = new URLSearchParams({
      refreshToken: this.credentials.refreshToken,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const result = await response.json();
      
      if (result.code === '200') {
        this.credentials.accessToken = result.data.accessToken;
        this.credentials.refreshToken = result.data.refreshToken;
        this.credentials.tokenExpiry = Date.now() + (result.data.expireTime * 1000);
        return result.data.accessToken;
      } else {
        throw new Error(`Token refresh failed: ${result.msg}`);
      }
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  // Device Management APIs
  async getDeviceList(pageStart = 0, pageSize = 50): Promise<HikvisionDevice[]> {
    const response = await this.makeRequest<{ page: any; devices: HikvisionDevice[] }>('/device/list', 'POST', {
      pageStart,
      pageSize,
    });

    if (response.code === '200') {
      return response.data?.devices || [];
    } else {
      throw new Error(`Failed to get device list: ${response.msg}`);
    }
  }

  async getDeviceInfo(deviceSerial: string): Promise<HikvisionDevice> {
    const response = await this.makeRequest<HikvisionDevice>('/device/info', 'POST', {
      deviceSerial,
    });

    if (response.code === '200' && response.data) {
      return response.data;
    } else {
      throw new Error(`Failed to get device info: ${response.msg}`);
    }
  }

  async getDeviceCapacity(deviceSerial: string): Promise<any> {
    const response = await this.makeRequest('/device/capacity', 'POST', {
      deviceSerial,
    });

    if (response.code === '200') {
      return response.data;
    } else {
      throw new Error(`Failed to get device capacity: ${response.msg}`);
    }
  }

  // Live Stream APIs
  async getLiveAddress(deviceSerial: string, channelNo = 1, protocol = 'hls', quality = 1): Promise<HikvisionStream> {
    const response = await this.makeRequest<{ url: string }>('/live/address/get', 'POST', {
      deviceSerial,
      channelNo,
      protocol, // hls, rtmp, rtsp
      quality,  // 0-HD, 1-SD
    });

    if (response.code === '200' && response.data) {
      return {
        url: response.data.url,
        streamType: protocol as 'hls' | 'rtmp' | 'rtsp',
        quality: quality === 0 ? 'HD' : 'SD',
        deviceSerial,
        channelNo,
      };
    } else {
      throw new Error(`Failed to get live address: ${response.msg}`);
    }
  }

  async startLive(deviceSerial: string, channelNo = 1, protocol = 'hls', quality = 1): Promise<HikvisionStream> {
    const response = await this.makeRequest<{ url: string }>('/live/start', 'POST', {
      deviceSerial,
      channelNo,
      protocol,
      quality,
    });

    if (response.code === '200' && response.data) {
      return {
        url: response.data.url,
        streamType: protocol as 'hls' | 'rtmp' | 'rtsp',
        quality: quality === 0 ? 'HD' : 'SD',
        deviceSerial,
        channelNo,
      };
    } else {
      throw new Error(`Failed to start live stream: ${response.msg}`);
    }
  }

  async stopLive(deviceSerial: string, channelNo = 1): Promise<boolean> {
    const response = await this.makeRequest('/live/stop', 'POST', {
      deviceSerial,
      channelNo,
    });

    return response.code === '200';
  }

  // Event Management APIs
  async getAlarmList(
    deviceSerial: string,
    startTime: string,
    endTime: string,
    alarmType?: number,
    status = 1,
    pageStart = 0,
    pageSize = 20
  ): Promise<HikvisionEvent[]> {
    const response = await this.makeRequest<{ alarms: HikvisionEvent[] }>('/alarm/list', 'POST', {
      deviceSerial,
      startTime,
      endTime,
      alarmType,
      status,
      pageStart,
      pageSize,
    });

    if (response.code === '200') {
      return response.data?.alarms || [];
    } else {
      throw new Error(`Failed to get alarm list: ${response.msg}`);
    }
  }

  async deleteAlarm(alarmId: string): Promise<boolean> {
    const response = await this.makeRequest('/alarm/delete', 'POST', {
      alarmId,
    });

    return response.code === '200';
  }

  // PTZ Control APIs
  async ptzControl(
    deviceSerial: string,
    channelNo: number,
    direction: string,
    action: number,
    speed = 5
  ): Promise<boolean> {
    const response = await this.makeRequest('/device/ptz/start', 'POST', {
      deviceSerial,
      channelNo,
      direction, // UP, DOWN, LEFT, RIGHT, ZOOM_IN, ZOOM_OUT, etc.
      action,    // 0-start, 1-stop
      speed,     // 1-7
    });

    return response.code === '200';
  }

  async setPtzPreset(deviceSerial: string, channelNo: number, presetName: string): Promise<boolean> {
    const response = await this.makeRequest('/device/ptz/preset/set', 'POST', {
      deviceSerial,
      channelNo,
      presetName,
    });

    return response.code === '200';
  }

  async moveToPtzPreset(deviceSerial: string, channelNo: number, presetName: string): Promise<boolean> {
    const response = await this.makeRequest('/device/ptz/preset/move', 'POST', {
      deviceSerial,
      channelNo,
      presetName,
    });

    return response.code === '200';
  }

  // Recording and Playback APIs
  async getRecordList(
    deviceSerial: string,
    channelNo: number,
    startTime: string,
    endTime: string,
    recType = 1
  ): Promise<any[]> {
    const response = await this.makeRequest<{ records: any[] }>('/video/file/list', 'POST', {
      deviceSerial,
      channelNo,
      startTime,
      endTime,
      recType, // 1-timing, 2-motion, 3-alarm
    });

    if (response.code === '200') {
      return response.data?.records || [];
    } else {
      throw new Error(`Failed to get record list: ${response.msg}`);
    }
  }

  async getPlaybackUrl(
    deviceSerial: string,
    channelNo: number,
    startTime: string,
    endTime: string,
    quality = 1
  ): Promise<string> {
    const response = await this.makeRequest<{ url: string }>('/video/play/start', 'POST', {
      deviceSerial,
      channelNo,
      startTime,
      endTime,
      quality,
    });

    if (response.code === '200' && response.data) {
      return response.data.url;
    } else {
      throw new Error(`Failed to get playback URL: ${response.msg}`);
    }
  }

  // Device Settings APIs
  async getDeviceVersion(deviceSerial: string): Promise<any> {
    const response = await this.makeRequest('/device/version', 'POST', {
      deviceSerial,
    });

    if (response.code === '200') {
      return response.data;
    } else {
      throw new Error(`Failed to get device version: ${response.msg}`);
    }
  }

  async setDeviceEncrypt(deviceSerial: string, enable: boolean, validateCode: string): Promise<boolean> {
    const response = await this.makeRequest('/device/encrypt/set', 'POST', {
      deviceSerial,
      enable: enable ? 1 : 0,
      validateCode,
    });

    return response.code === '200';
  }

  async captureImage(deviceSerial: string, channelNo = 1, quality = 1): Promise<string> {
    const response = await this.makeRequest<{ picUrl: string }>('/device/capture', 'POST', {
      deviceSerial,
      channelNo,
      quality,
    });

    if (response.code === '200' && response.data) {
      return response.data.picUrl;
    } else {
      throw new Error(`Failed to capture image: ${response.msg}`);
    }
  }

  // Cloud Storage APIs
  async getCloudRecordList(
    deviceSerial: string,
    channelNo: number,
    startTime: string,
    endTime: string
  ): Promise<any[]> {
    const response = await this.makeRequest<{ records: any[] }>('/video/cloud/list', 'POST', {
      deviceSerial,
      channelNo,
      startTime,
      endTime,
    });

    if (response.code === '200') {
      return response.data?.records || [];
    } else {
      throw new Error(`Failed to get cloud record list: ${response.msg}`);
    }
  }

  // Utility Methods
  isTokenExpired(): boolean {
    if (!this.credentials?.tokenExpiry) return true;
    return Date.now() >= this.credentials.tokenExpiry;
  }

  async ensureValidToken(): Promise<void> {
    if (!this.credentials?.accessToken || this.isTokenExpired()) {
      if (this.credentials?.refreshToken) {
        await this.refreshAccessToken();
      } else {
        await this.getAccessToken();
      }
    }
  }
}

export const createHikvisionApiService = (credentials: HikvisionCredentials) => {
  return new HikvisionApiService(credentials);
};
