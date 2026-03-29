import { TokenUser } from '../models';

declare global {
  namespace Express {
    export interface Request {
      // O seu middleware global anexa `user` no objeto das requisições!
      user?: TokenUser;
      session?: any; 
    }
  }
}
