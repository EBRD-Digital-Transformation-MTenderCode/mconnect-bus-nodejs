import { ITreasuryContract } from '../treasury';

export interface IOut {
  id: string,
  command: string,
  data: IDataOut,
  version: string
}

export interface IDataOut extends ITreasuryContract{
  cpid: string,
  ocid: string
}