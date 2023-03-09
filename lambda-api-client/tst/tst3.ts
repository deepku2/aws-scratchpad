import { APIClient, APIClientError, APIClientTimeOut, APIAccessDenied, APIClientTokenExpired, FetchOptions } from './client';

jest.mock('node-fetch');
const fetch = require('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('APIClient', () => {
  const config = {
    apiEndpoint: 'https://api.example.com',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    scope: 'api://example.com/scope',
    tenantId: 'tenant-id',
    timeout: 1000,
    retries: 3,
  };

  beforeEach(() => {
    mockedFetch.mockClear();
  });

  describe('fetchApi', () => {
    const client = new APIClient(config);

    it('should fetch data successfully', async () => {
      const data = { id: 123, name: 'Test Data' };
      const response = new Response(JSON.stringify(data), { status: 200 });
      mockedFetch.mockResolvedValueOnce(response);

      const options: FetchOptions = { method: 'GET', path: '/data' };
      const result = await client.fetchApi(options);

      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFetch).toHaveBeenCalledWith(
        `${config.apiEndpoint}${options.path}`,
        expect.objectContaining({
          method: options.method,
          headers: expect.objectContaining({
            Authorization: `Bearer ${client['accessToken']}`,
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(data);
    });

    it('should retry when an error occurs', async () => {
      const data = { id: 123, name: 'Test Data' };
      const response = new Response(JSON.stringify(data), { status: 500 });
      mockedFetch.mockRejectedValueOnce(new Error('Request timed out')).mockResolvedValueOnce(response);

      const options: FetchOptions = { method: 'GET', path: '/data' };
      const result = await client.fetchApi(options);

      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(mockedFetch).toHaveBeenCalledWith(
        `${config.apiEndpoint}${options.path}`,
        expect.objectContaining({
          method: options.method,
          headers: expect.objectContaining({
            Authorization: `Bearer ${client['accessToken']}`,
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(data);
    });

    it('should throw an error when the API call is denied', async () => {
      const response = new Response('Access denied', { status: 403 });
      mockedFetch.mockResolvedValueOnce(response);

      const options: FetchOptions = { method: 'GET', path: '/data' };

      await expect(client.fetchApi(options)).rejects.toThrow(APIAccessDenied);
    });

    it('should throw an error when the token is expired', async () => {
      const response = new Response('Token expired', { status: 401 });
      const error = new Error('jwt expired');
      mockedFetch.mockRejectedValueOnce(error).mockResolvedValueOnce(response);

      const options: FetchOptions = { method: 'GET', path: '/data' };

      await expect(client.fetchApi(options)).rejects.toThrow(APIClientTokenExpired);
    });

    it('should throw an error when the API call fails', async () => {
      const response = new Response('Bad request', { status: 400 });
      mockedFetch.mockResolvedValueOnce(response);

      const options: FetchOptions = { method: 'GET', path: '/data' };

     
