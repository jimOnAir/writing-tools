import { Logger } from '@writing-tools/shared';

import { AppBootstrap } from './infrastructure/bootstrap';

const logger = new Logger();
const bootstrap = new AppBootstrap(logger);
bootstrap.initialize();
