import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

export async function getSecret(secretName: string): Promise<any> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const result = await client.send(command);

  if (!result.SecretString) {
    throw new Error(`Secret ${secretName} not found or not a string`);
  }

  return JSON.parse(result.SecretString);
}
