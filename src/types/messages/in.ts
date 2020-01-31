export interface IIn {
  id: string; // "0d20d00c-69c6-13e8-adc0-fa7ae02cce01"
  command: 'sendAcForVerification';
  context: IContext;
  data: IData;
  version: string; // "0.0.1"
}

export interface IContext {
  country: string; // "MD"
  startDate: string; // "2019-06-28T00:00:00Z"
}

export interface IData {
  releaseID: string; // "ocds-t1s2t3-MD-1548411372855-AC-1548671812930"
  cpid: string; // "ocds-t1s2t3-MD-1548411372855"
  ocid: string; // "ocds-t1s2t3-MD-1548411372855-AC-1548671812930"
  treasuryBudgetSources: ITreasuryBudgetSources[];
}

export interface ITreasuryBudgetSources {
  budgetBreakdownID: string; // "ocds-t1s2t3-MD-1548067185269-FS-1548067248102"
  budgetIBAN: string; // "MD88TRPDBB33110A12614AC,MD71TRDBB333110A13963AB"
  amount: number; // 100
}
