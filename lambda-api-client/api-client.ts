import fetch from 'node-fetch';

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
  private retries: number;


  // constructor(apiConfig: APIConfig) {
  //   this.apiEndpoint = apiConfig.apiEndpoint;
  //   this.clientId = apiConfig.clientId;
  //   this.clientSecret = apiConfig.clientSecret;
  //   this.scope = apiConfig.scope;
  // }
  constructor(private readonly config: APIConfig) {this.retries = config.retries ?? 0}

  public async fetchApi(options: FetchOptions): Promise<any> {
    
    const url = `${this.config.apiEndpoint}${options.path}`;

    await this.ensureAccessToken();

    const defaultHeaders = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  
    const requestOptions: FetchOptions = options ?? { method: 'GET' };
    requestOptions.headers = { ...defaultHeaders, ...requestOptions.headers };
    
    let response;
    
    try {
      response = await fetch(url, {
        method: requestOptions.method,
        headers: requestOptions.headers,
        body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
      });
  
      if (response.status === 200) {

        return response.json();
        
      }
  
      
    } catch (error) {
      if (this.retries > 0 && this.isRetriableError(error)) {
        const retryDelay = 1000*this.retries;
        console.log(`API call failed with error "${error}", retrying after ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        this.retries--; 
        return this.fetchApi(options);
      }
      

      if (response.status === 403 ) {
        throw new APIAccessDenied(`API call to ${url} was denied: ${error.message}`);
      } else if (response.status === 401 && error.message.includes('jwt expired') ) {
        throw new APIClientTokenExpired(`Token expired while making API call to ${url}`);
      } else {
        throw new APIClientError(`API call to ${url} failed with status ${response.status}: ${error.message}`);
      }
      
      
    }

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

    const data:any = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiration = Date.now() + data.expires_in * 1000 - 300000; // Refresh token 5 minutes before expiration
  }

  private isRetriableError(error:Error) {
    if (error instanceof Error && (error.message.includes('jwt expired') || error.message.includes('timed out'))) {
      return true
    }
    return false;
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
