import { User } from '../models/user';

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        stripeAccountId?: string;
        [key: string]: any;
      };
    }
  }
}

export {};
