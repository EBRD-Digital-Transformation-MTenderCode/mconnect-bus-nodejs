export interface IAcRecord {
  [key: string]: any,

  releases: IRelease[]
}

export interface IRelease {
  [key: string]: any,

  planning: {
    implementation: {
      transactions: ITransaction[]
    },
    budget: {
      description: string,
      budgetAllocation: IBudgetAllocation[],
      budgetSource: IBudgetSource[]
    }
  },
  contracts: IContract[],
  parties: IParty[],
  relatedProcesses: IRelatedProcess[]
}

export interface ITransaction {
  id: string,
  type: string,
  value: {
    amount: number,
    currency: string
  },
  executionPeriod: {
    durationInDays: number
  },
  relatedContractMilestone: string
}

export interface IBudgetAllocation {
  budgetBreakdownID: string,
  amount: number,
  period: {
    startDate: string,
    endDate: string,
  },
  relatedItem: string
}

export interface IBudgetSource {
  budgetBreakdownID: string,
  amount: number,
  currency: string
}

export interface IContract {
  [key: string]: any,

  id: string,
  date: string,
  awardId: string,
  title: string,
  description: string,
  status: string,
  statusDetails: string,
  documents: IDocument[],
  period: {
    startDate: string,
    endDate: string
  },
  value: {
    amount: number,
    currency: string,
    amountNet: number,
    valueAddedTaxIncluded: boolean
  }
}

export interface IDocument {
  id: string,
  title?: string,
  documentType: string,
  url: string,
  datePublished: string,
  relatedConfirmations?: string[]
}

export interface IParty {
  [key: string]: any,

  id: string,
  name: string,
  identifier: {
    scheme: string,
    id: string,
    legalName: string
  },
  additionalIdentifiers: IAdditionalIdentifier[],
  details: {
    [key: string]: any,

    bankAccounts: IBankAccount[]
  },
  roles: ('payee' | 'supplier' | 'buyer' | 'payer')[]
}

export interface IAdditionalIdentifier {
  scheme: string,
  id: string,
  legalName: string
}

export interface IBankAccount {
  [key: string]: any,

  description: string,
  bankName: string,
  identifier: {
    scheme: string,
    id: string,
  },
  accountIdentification: {
    scheme: string,
    id: string,
  }
}

export interface IRelatedProcess {
  id: string,
  relationship: ('x_evaluation' | 'parent')[]
  scheme: string,
  identifier: string,
  uri: string
}