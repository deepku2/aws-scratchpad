import { APIClient, APIConfig } from './api-client';

describe('APIClient', () => {
  const apiConfig: APIConfig = {
    apiEndpoint: 'https://example.com/api',
    clientId: 'my-client-id',
    clientSecret: 'my-client-secret',
    scope: 'my-scope',
    tenantId: 'my-tenant-id'
  };

  const apiClient = new APIClient(apiConfig);

  beforeEach(() => {
    // Clear the access token and token expiration before each test
    apiClient['accessToken'] = '';
    apiClient['tokenExpiration'] = 0;
  });

  describe('fetchApi', () => {
    it('should fetch data successfully', async () => {
      const response = { data: 'example' };
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(response),
      } as any);

      const result = await apiClient.fetchApi({
        method: 'GET',
        path: '/path',
        headers: {},
        body: {},
      });

      expect(result).toEqual(response);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/api/path',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: expect.stringMatching(/^Bearer .+$/),
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
      );
    });

    it('should retry failed requests with retries > 0', async () => {
      const response = { data: 'example' };
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('jwt expired'))
        .mockResolvedValueOnce({
          status: 200,
          json: jest.fn().mockResolvedValueOnce(response),
        } as any);

      const result = await apiClient.fetchApi(
        {
          method: 'GET',
          path: '/path',
          headers: {},
          body: {},
        },
        1
      );

      expect(result).toEqual(response);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw APIClientTimeOut error when the request times out', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('timeout'));

      await expect(
        apiClient.fetchApi({
          method: 'GET',
          path: '/path',
          headers: {},
          body: {},
        })
      ).rejects.toThrow('APIClientTimeOut');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should throw APIAccessDenied error when the response status is 403', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({ status: 403 } as any);

      await expect(
        apiClient.fetchApi({
          method: 'GET',
          path: '/path',
          headers: {},
          body: {},
        })
      ).rejects.toThrow('APIAccessDenied');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    
