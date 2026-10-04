import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { STORAGE_PROVIDER } from './storage.interface';
import { R2Provider } from './providers/r2.provider';
import { LocalProvider } from './providers/local.provider';
import { getStorageDriver } from '../config/r2.config';

@Global()
@Module({
  providers: [
    R2Provider,
    LocalProvider,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (r2: R2Provider, local: LocalProvider) => {
        const driver = getStorageDriver();
        if (driver === 'local') {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('STORAGE_DRIVER=local interdit en production');
          }
          return local;
        }
        return r2;
      },
      inject: [R2Provider, LocalProvider],
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}
