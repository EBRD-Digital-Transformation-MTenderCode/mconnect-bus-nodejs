import { IIn } from '../messages'

export interface IKafkaInRow {
  cmd_id: string,
  cmd_name: string,
  timestamp: number,
  message: IIn,
  ocid: string,
  id_doc: string
}