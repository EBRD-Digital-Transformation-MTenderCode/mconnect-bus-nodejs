export interface IContractQueueResponseBody {
  contract?: ITreasuryContract[]
}

export interface ITreasuryContract {
  id_dok: string,
  id_hist: string,
  status: '3000' | '3001' | '3002' | '3003' | '3005',
  st_date: string,
  reg_nom: {},
  reg_date: {},
  descr: string
}