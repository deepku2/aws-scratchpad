import { SecretsManager } from 'aws-sdk';

const client = new SecretsManager();

export async function getSecret(secretName: string): Promise<any> {
  const result = await client.getSecretValue({ SecretId: secretName }).promise();

  if (!result.SecretString) {
    throw new Error(`Secret ${secretName} not found or not a string`);
  }

  return JSON.parse(result.SecretString);
}
