import { ITreasuryContract, TStatusCode } from '../treasury';

export interface ITreasuryResponsesRow {
  id_doc: string,
  status_code: TStatusCode,
  message: ITreasuryContract,
  ts_in: number,
  ts_commit?: number | null,
}