import { IIn } from '../messages'

export interface IRequestsRow {
  cmd_id: string,
  cmd_name: string,
  ts: number,
  message: IIn
}