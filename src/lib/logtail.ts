import { Logtail } from '@logtail/node';
import Env from './env';

export const logtail = new Logtail(Env.logtailSourceToken);
