export interface IIn {
  id: string,
  /* @TODO  launchACVerification -> sendAcForVerification*/
  command: 'launchACVerification',
  context: IContext,
  data: IData,
  version: string
}

export interface IContext {
  country: string,
  startDate: string
}

export interface IData {
  releaseID: string,
  cpid: string,
  ocid: string,
  treasuryBudgetSources: ITreasuryBudgetSources[]
}

export interface ITreasuryBudgetSources {
  budgetBreakdownID: string,
  budgetIBAN: string,
  amount: number
}