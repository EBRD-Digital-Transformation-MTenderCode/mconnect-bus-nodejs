import { IContractRegisterPayload } from '../treasury';

export interface ITreasuryRequestsRow {
  id_doc: string,
  message: IContractRegisterPayload,
  ts?: number | null
}