import { TStatusCode, ITreasuryContract } from '../treasury';

export interface ITreasuryInRow {
  id_doc: string,
  status_code: TStatusCode,
  message: ITreasuryContract,
  timestamp_in: number,
  timestamp_commit?: number | null,
}