import { IOut } from '../messages';
import { TStatusCode } from '../treasury';

export interface IResponsesRow {
  id_doc: string,
  status_code: TStatusCode,
  cmd_id: string,
  cmd_name: string,
  message: IOut,
  ts?: number | null
}