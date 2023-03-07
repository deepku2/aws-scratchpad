import fetch from 'node-fetch';

interface FetchOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export async function fetchApi(url: string, accessToken: string, options?: FetchOptions, retries = 3): Promise<any> {
  const defaultHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const requestOptions: FetchOptions = options ?? { method: 'GET' };
  requestOptions.headers = { ...defaultHeaders, ...requestOptions.headers };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const message = `API call failed: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    return response.json();
  } catch (error) {
    if (retries <= 0) {
      throw new Error(`API call failed after multiple retries: ${error}`);
    }

    // Retry the request only if the access token has expired or the request timed out
    if (error instanceof Error && (error.message.includes('jwt expired') || error.message.includes('timed out'))) {
      const retryDelay = 1000;
      console.log(`API call failed with error "${error}", retrying after ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return fetchApi(url, await getAccessToken(), requestOptions, retries - 1);
    }

    throw error;
  }
}
