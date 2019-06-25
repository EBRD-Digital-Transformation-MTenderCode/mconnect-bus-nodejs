import { TStatusCode } from './index';

export interface IContractQueueResponseBody {
  contract?: ITreasuryContract[]
}

export interface ITreasuryContract {
  id_dok: string,
  id_hist: string,
  status: TStatusCode,
  st_date: string,
  reg_nom: string,
  reg_date: string,
  descr: string
}