import { APIClient, APIConfig } from './api-client';

describe('APIClient', () => {
  const apiConfig: APIConfig = {
    apiEndpoint: 'https://example.com/api',
    clientId: 'my-client-id',
    clientSecret: 'my-client-secret',
    scope: 'my-scope',
    tenantId: 'my-tenant-id',
    timeout: 5000,
    retries: 3,
  };
  const apiClient = new APIClient(apiConfig);

  describe('fetchApi', () => {
    test('calls fetch with the correct parameters', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce({ foo: 'bar' }),
      });
      jest.spyOn(global, 'fetch').mockImplementation(mockFetch);

      const options = { method: 'GET', path: '/example' };
      const response = await apiClient.fetchApi(options);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiConfig.apiEndpoint}${options.path}`,
        expect.objectContaining({
          method: options.method,
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer'),
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(response).toEqual({ foo: 'bar' });

      jest.restoreAllMocks();
    });

    test('throws an APIAccessDenied error when a 403 status is returned', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        status: 403,
        json: jest.fn().mockResolvedValueOnce({ error: 'access_denied' }),
      });
      jest.spyOn(global, 'fetch').mockImplementation(mockFetch);

      const options = { method: 'GET', path: '/example' };

      await expect(apiClient.fetchApi(options)).rejects.toThrow('API call to https://example.com/api/example was denied: access_denied');

      jest.restoreAllMocks();
    });

    test('throws an APIClientTokenExpired error when a 401 status is returned and the error message contains "jwt expired"', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        status: 401,
        json: jest.fn().mockResolvedValueOnce({ error: 'invalid_token', error_description: 'jwt expired' }),
      });
      jest.spyOn(global, 'fetch').mockImplementation(mockFetch);

      const options = { method: 'GET', path: '/example' };

      await expect(apiClient.fetchApi(options)).rejects.toThrow('Token expired while making API call to https://example.com/api/example');

      jest.restoreAllMocks();
    });

    test('throws an APIClientError when a non-200 status is returned', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        status: 500,
        json: jest.fn().mockResolvedValueOnce({ error: 'server_error' }),
      });
      jest.spyOn(global, 'fetch').mockImplementation(mockFetch);

      const options = { method: 'GET', path: '/example' };

      await expect(apiClient.fetchApi(options)).rejects.toThrow('API call to https://example.com/api/example failed with status 500: server_error');

      jest.restoreAllMocks();
    });

    test('retries the API call up to the specified number of times if there is a retriable error', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('jwt expired'))
        .mock
