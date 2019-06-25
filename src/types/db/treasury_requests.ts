import { IOut } from '../messages';

export interface ITreasuryRequestsRow {
  id_doc: string,
  message: IOut,
  ts?: number | null
}