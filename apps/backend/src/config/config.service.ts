import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export interface AppConfig {
    cosmosEndpoint: string;
    cosmosPrimaryKey: string;
    cosmosDatabase: string;
    cosmosContainer: string;
    storageConnectionString: string;
}

@Injectable()
export class ConfigService implements OnModuleInit {
    private readonly logger = new Logger(ConfigService.name);
    private config: AppConfig | null = null;

    async onModuleInit() {
        this.config = await this.loadConfig();
        this.logger.log('Configuration loaded');
    }

    private async loadConfig(): Promise<AppConfig> {
        const keyVaultUri = process.env.KEY_VAULT_URI;
        
        // If KEY_VAULT_URI is set, fetch secrets from Key Vault (production)
        // Otherwise fall back to environment variables (local dev)
        if (keyVaultUri) {
            this.logger.log(`Loading config from Key Vault: ${keyVaultUri}`);
            return this.loadFromKeyVault(keyVaultUri);
        }

        this.logger.log('Loading config from environment variables (local dev)');
        return this.loadFromEnv();
    }

    private async loadFromKeyVault(vaultUri: string): Promise<AppConfig> {
        const credential = new DefaultAzureCredential();
        const client = new SecretClient(vaultUri, credential);

        const [cosmosEndpoint, cosmosPrimaryKey, storageConnectionString] = 
            await Promise.all([
                client.getSecret('cosmos-endpoint').then((s) => s.value!),
                client.getSecret('cosmos-primary-key').then((s) => s.value!),
                client.getSecret('storage-connection-string').then((s) => s.value!),
            ])
        ;

        return {
            cosmosEndpoint,
            cosmosPrimaryKey,
            storageConnectionString,
            cosmosDatabase: process.env.COSMOS_DATABASE ?? 'mediaops',
            cosmosContainer: process.env.COSMOS_CONTAINER ?? 'MediaItems',
        };
    }

    private loadFromEnv(): AppConfig {
        const required = [
            'COSMOS_ENDPOINT',
            'COSMOS_PRIMARY_KEY',
            'STORAGE_CONNECTION_STRING',
        ]; 

        for (const key of required) {
            if (!process.env[key]) {
                throw new Error(`Missing required environment variable: ${key}`);
            }
        }

        return {
            cosmosEndpoint: process.env.COSMOS_ENDPOINT!,
            cosmosPrimaryKey: process.env.COSMOS_PRIMARY_KEY!,
            storageConnectionString: process.env.STORAGE_CONNECTION_STRING!,
            cosmosDatabase: process.env.COSMOS_DATABASE ?? 'mediaops',
            cosmosContainer: process.env.COSMOS_CONTAINER ?? 'MediaItems',
        };
    }

    get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        if (!this.config) throw new Error('Config not loaded yet');
        return this.config[key];
    }
}