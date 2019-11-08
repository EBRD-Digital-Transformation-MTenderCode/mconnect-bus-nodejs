import { IOut, TCommandName } from '../messages';

export interface IResponsesRow {
  id_doc: string;
  cmd_id: string;
  cmd_name: TCommandName;
  message: IOut;
  ts?: number | null;
}
