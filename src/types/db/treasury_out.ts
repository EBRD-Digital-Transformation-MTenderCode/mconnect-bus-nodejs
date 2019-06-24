import { IOut } from '../messages';

export interface ITreasuryOutRow {
  id_doc: string,
  message: IOut,
  timestamp?: number | null
}