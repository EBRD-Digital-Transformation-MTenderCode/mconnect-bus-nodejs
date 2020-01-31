import { TCommandName } from './index';
import { TStatusCode } from '../treasury';

export interface IOut {
  id: string; // "db55011a-5383-4338-a42c-44b5b8bf9cf6"
  command: TCommandName;
  data: IDataOut;
  version: string; // "0.0.1"
}

export interface IDataOut {
  cpid: string; // "ocds-t1s2t3-MD-1562598730106"
  ocid: string; // "ocds-t1s2t3-MD-1562598730106-AC-1564034927465"
  verification?: IVerificationOut;
  dateMet?: string; // "2019-06-28T00:00:00Z"
  regData?: IRegDataOut;
}

export interface IVerificationOut {
  value: TStatusCode;
  rationale: string; // "Rejected virtually for test purposes"
}

export interface IRegDataOut {
  externalRegId: string; // ""
  regDate: string; // ""
}
