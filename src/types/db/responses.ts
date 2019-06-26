import { IOut } from '../messages';

export interface IResponsesRow {
  id_doc: string,
  cmd_id: string,
  cmd_name: string,
  message: IOut,
  ts?: number | null
}