import { APIClient, APIConfig, APIClientTokenExpired, APIAccessDenied, APIClientError } from './api-client';

describe('APIClient', () => {
  const apiConfig: APIConfig = {
    apiEndpoint: 'https://example.com',
    clientId: 'client_id',
    clientSecret: 'client_secret',
    scope: 'scope',
    tenantId: 'tenant_id',
  };
  let apiClient: APIClient;

  beforeEach(() => {
    apiClient = new APIClient(apiConfig);
  });

  describe('fetchApi', () => {
    it('should fetch data from API', async () => {
      // Mock successful response from API
      const response = {
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response);

      const result = await apiClient.fetchApi({
        method: 'GET',
        path: '/test',
      });

      expect(result).toEqual({ data: 'test' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`${apiConfig.apiEndpoint}/test`, {
        method: 'GET',
        headers: {
          Authorization: expect.any(String),
          'Content-Type': 'application/json',
        },
      });

      fetchMock.mockRestore();
    });

    it('should throw APIClientTokenExpired if token is expired', async () => {
      // Mock expired token response from API
      const response = {
        status: 401,
        json: jest.fn().mockResolvedValue({ error: 'jwt expired' }),
      };
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response);

      await expect(
        apiClient.fetchApi({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow(new APIClientTokenExpired(`Token expired while making API call to ${apiConfig.apiEndpoint}/test`));

      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockRestore();
    });

    it('should throw APIAccessDenied if API returns 403', async () => {
      // Mock API access denied response
      const response = {
        status: 403,
        json: jest.fn().mockResolvedValue({ error: 'access denied' }),
      };
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response);

      await expect(
        apiClient.fetchApi({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow(new APIAccessDenied(`API call to ${apiConfig.apiEndpoint}/test was denied: access denied`));

      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockRestore();
    });

    it('should throw APIClientError if API returns error', async () => {
      // Mock API error response
      const response = {
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'server error' }),
      };
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response);

      await expect(
        apiClient.fetchApi({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow(new APIClientError(`API call to ${apiConfig.apiEndpoint}/test failed with status 500: server error`));

      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockRestore();
    });

    it('should retry on retriable error', async () => {
      // Mock retriable error response
      const error =
