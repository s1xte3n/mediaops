import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CosmosClient, Container } from '@azure/cosmos';
import { ConfigService } from '../config/config.service';

@Injectable()
export class CosmosService implements OnModuleInit {
    private readonly logger = new Logger(CosmosService.name);
    private container!: Container;

    constructor(private readonly config: ConfigService) {}

    async onModuleInit() {
        const client = new CosmosClient({
            endpoint: this.config.get('cosmosEndpoint'),
            key: this.config.get('cosmosPrimaryKey'),
        });

        this.container = client
            .database(this.config.get('cosmosDatabase'))
            .container(this.config.get('cosmosContainer'));

        this.logger.log('Cosmos DB client initialized');
    }

    getContainer(): Container {
        return this.container;
    }
}