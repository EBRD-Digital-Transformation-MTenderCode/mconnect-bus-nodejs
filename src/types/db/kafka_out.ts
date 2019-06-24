import { IOut } from '../messages';
import { TStatusCode } from '../treasury';

export interface IKafkaOutRow {
  id_doc: string,
  status_code: TStatusCode,
  cmd_id: string,
  cmd_name: string,
  message: IOut,
  timestamp?: number | null
}