import { TStatusCode } from '../treasury';

export interface IOut {
  id: string,
  command: string,
  data: IDataOut,
  version: string
}

export interface IDataOut {
  cpid: string,
  ocid: string,
  verification: IVerificationOut,
  dateMet: string,
  regData?: IRegDataOut
}

export interface IVerificationOut {
  value: TStatusCode,
  rationale: string
}

export interface IRegDataOut {
  reg_nom: string,
  reg_date: string
}