import fetch from 'node-fetch';



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
import fetch from 'node-fetch';


import fetch from "node-fetch";

//1111

export class APIClient2 {
  private accessToken: string;
  private tokenExpiration: number;

  constructor(private readonly config: APIConfig) {}

  async fetchApi(method: string, path: string, body?: object): Promise<any> {
    const url = `${this.config.apiEndpoint}${path}`;

    await this.ensureAccessToken();

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await this.refreshAccessToken();
        return this.fetchApi(method, path, body);
      } else {
        const error = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${error}`);
      }
    }

    return response.json();
  }

  private async ensureAccessToken() {
    if (!this.accessToken || Date.now() > this.tokenExpiration) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken() {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;

    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("client_id", this.config.clientId);
    body.append("client_secret", this.config.clientSecret);
    body.append("scope", this.config.scope);

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to retrieve access token: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiration = Date.now() + data.expires_in * 1000 - 300000; // Refresh token 5 minutes before expiration
  }
}


//main

export interface APIConfig {
  apiEndpoint: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  tenantId: string;
  timeout?: number;
  retries?: number
}
export interface FetchOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: object;
  
}
export class APIClient {
  // private apiEndpoint: string;
  // private tenantId: string;
  // private clientId: string;
  // private clientSecret: string;
  // private scope: string;

  private accessToken: string;
  private tokenExpiration: number;


  // constructor(apiConfig: APIConfig) {
  //   this.apiEndpoint = apiConfig.apiEndpoint;
  //   this.clientId = apiConfig.clientId;
  //   this.clientSecret = apiConfig.clientSecret;
  //   this.scope = apiConfig.scope;
  // }
  constructor(private readonly config: APIConfig) {}

  public async fetchApi(options: FetchOptions): Promise<any> {
    
    const url = `${this.config.apiEndpoint}${options.path}`;

    await this.ensureAccessToken();

    const defaultHeaders = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  
    const requestOptions: FetchOptions = options ?? { method: 'GET' };
    requestOptions.headers = { ...defaultHeaders, ...requestOptions.headers };
    
    
    // const token = await getToken(this.clientId, this.clientSecret, this.scope);

    
    // const headers = {
    //   'Content-Type': 'application/json',
    //   Authorization: `Bearer ${token}`,
    // };

    // const options2 = {
    //   method: method.toUpperCase(),
    //   headers,
    //   body: JSON.stringify(body),
    // };

    let response;
    
    try {
      response = await fetch(url, {
        method: requestOptions.method,
        headers: requestOptions.headers,
        body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
      });
  
      if (!response.ok) {
        const message = `API call failed: ${response.status} ${response.statusText}`;
        throw new Error(message);
      }
  
      return response.json();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      const responseBody = await response.json();
      const { status, message } = responseBody.error;

      if (response.status === 403 ) {
        throw new APIAccessDenied(`API call to ${url} was denied: ${message}`);
      } else if (response.status === 401 && error.message.includes('jwt expired') {
        throw new APIClientTokenExpired(`Token expired while making API call to ${url}`);
      } else {
        throw new APIClientError(`API call to ${url} failed with status ${status}: ${message}`);
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


///////

    

    if (!response.ok) {
      const responseBody = await response.json();
      const { status, message } = responseBody.error;

      if (status === 403) {
        throw new APIAccessDenied(`API call to ${url} was denied: ${message}`);
      } else if (status === 401) {
        throw new APIClientTokenExpired(`Token expired while making API call to ${url}`);
      } else {
        throw new APIClientError(`API call to ${url} failed with status ${status}: ${message}`);
      }
    }

    return response.json();
  }

  /**
   * 
   */
  private async ensureAccessToken() {
    if (!this.accessToken || Date.now() > this.tokenExpiration) {
      await this.refreshAccessToken();
    }
  }
  /**
   * 
   */
  private async refreshAccessToken() {
    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("client_id", this.config.clientId);
    body.append("client_secret", this.config.clientSecret);
    body.append("scope", this.config.scope);

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to retrieve access token: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiration = Date.now() + data.expires_in * 1000 - 300000; // Refresh token 5 minutes before expiration
  }
}

export class APIClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIClientError';
  }
}

export class APIClientTimeOut extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIClientTimeOut';
  }
}

export class APIAccessDenied extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIAccessDenied';
  }
}

export class APIClientTokenExpired extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIClientTokenExpired';
  }
}
