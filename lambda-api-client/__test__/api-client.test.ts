import { APIClient, APIConfig, APIClientError, APIClientTimeOut, APIAccessDenied, APIClientTokenExpired, FetchOptions } from '../src/api-client';

jest.mock('node-fetch');
import fetch from 'node-fetch';
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

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
    

    // Test 1
    it('should fetch data from API', async () => {
      // Mock successful response from API
      // const response = {
      //   status: 200,
      //   json: jest.fn().mockResolvedValue({ data: 'test' }),
      // };

      const responseBody = { data: 'test' };
      const responseHeaders = { 'Content-Type': 'application/json' };
      const response = new Response(JSON.stringify(responseBody), {
        status: 200,
        statusText: 'OK',
        headers: responseHeaders,
        size: JSON.stringify(responseBody).length,
        timeout: 0,
        url: `${apiConfig.apiEndpoint}/test`,
        redirect: 'manual',
        type: 'default',
        body: null,
      });


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
  });
});
  