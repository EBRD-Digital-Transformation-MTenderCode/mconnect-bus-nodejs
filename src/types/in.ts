export interface IIn {
  id: string,
  command: 'verificationAc',
  context: IContext,
  data: IData,
  version: string
}

export interface IContext {
  operationId: string,
  requestId: string,
  cpid: string,
  ocid: string,
  stage: 'AC',
  prevStage: 'AC',
  processType: 'supplierSigningAC',
  operationType: 'supplierSigningAC',
  phase: 'signed',
  owner: string,
  country: string,
  language: string,
  pmd: 'MV' | 'TEST_MV' | 'SV' | 'TEST_SV' | 'OT' | 'TEST_OT',
  token: string,
  startDate: string,
  id: string,
  timeStamp: number,
  isAuction: boolean,
  awardCriteria: 'priceOnly' | 'qualityOnly' | 'costOnly'
}

export interface IData {
  treasuryBudgetSources: ITreasuryBudgetSources[]
}

export interface ITreasuryBudgetSources {
  budgetBreakdownID: string,
  budgetIBAN: string,
  amount: number
}