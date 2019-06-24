import { IIn } from '../messages'

export interface IDbContract {
  contractId: string,
  ocid: string,
  messageIn: IIn,
  messageOut: string | null,
  statusCode: number | null
}