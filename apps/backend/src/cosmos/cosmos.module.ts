import { Module, Global } from '@nestjs/common';
import { CosmosService } from './cosmos.service';

@Global()
@Module({
    providers: [CosmosService],
    exports: [CosmosService],
})
export class CosmosModule {}