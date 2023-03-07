
import fetch from 'node-fetch';

interface EnvironmentVariables {
  API_URL: string;
  TOKEN_URL: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  TOKEN_ID: string;
  TENANT_ID: string;
  SCOPE: string;
}

interface TokenConfig {
    
    token_url: string;
    client_id: string;
    client_secret: string;
    tenant_id: string;
    scope: string;
  }
  
const cache: { [key: string]: (string )} = {};

const getToken = async (
  env: EnvironmentVariables
): Promise<string | undefined> => {
  if (cache.token && cache.tokenExpiration && cache.tokenExpiration > Date.now()) {
    return cache.token;
  }

  const tokenUrl = env.TOKEN_URL;
  const clientId = env.CLIENT_ID;
  const clientSecret = env.CLIENT_SECRET;
  const tokenId = env.TOKEN_ID;
  const tenantId = env.TENANT_ID;
  const scope = env.SCOPE;

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');
  params.append('client_info', '1');
  params.append('scope', scope);

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!tokenResponse.ok) {
    console.error(`Failed to fetch token from ${tokenUrl}: ${tokenResponse.status} - ${tokenResponse.statusText}`);
    throw new Error(`Failed to fetch token from ${tokenUrl}: ${tokenResponse.status} - ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  const token = tokenData.access_token;
  if (!token) {
    console.error(`Failed to get access token from ${tokenUrl}`);
    throw new Error(`Failed to get access token from ${tokenUrl}`);
  }

  const tokenExpiration = Date.now() + 3600 * 1000;
  cache.token = token;
  cache.tokenExpiration = tokenExpiration;

  return token;
};

const fetchApi = async (env: EnvironmentVariables, token: string): Promise<any> => {
  const apiUrl = env.API_URL;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const apiResponse = await fetch(apiUrl, {
    method: 'GET',
    headers: headers,
  });

  if (apiResponse.status === 401 || apiResponse.status === 403) {
    console.error('API call failed due to token expiration or unauthorized access. Retrying with new token...');
    const newToken = await getToken(env);
    return fetchApi(env, newToken);
  }

  if (!apiResponse.ok) {
    console.error(`API call to ${apiUrl} failed: ${apiResponse.status} - ${apiResponse.statusText}`);
    throw new Error(`API call to ${apiUrl} failed: ${apiResponse.status} - ${apiResponse.statusText}`);
  }

  const apiData = await apiResponse.json();
  return apiData;
};


