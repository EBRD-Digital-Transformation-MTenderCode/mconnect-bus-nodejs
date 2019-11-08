export interface IAcRecord {
  datePublished: string;
  releases: IRelease[];

  [key: string]: any;
}

export interface IRelease {
  planning: {
    implementation: {
      transactions: ITransaction[];
    };
    budget: {
      description: string;
      budgetAllocation: IBudgetAllocation[];
      budgetSource: IBudgetSource[];
    };
  };
  contracts: IContract[];
  parties: IParty[];
  relatedProcesses: IRelatedProcess[];

  [key: string]: any;
}

export interface ITransaction {
  id: string;
  type: string;
  value: {
    amount: number;
    currency: string;
  };
  executionPeriod: {
    durationInDays: number;
  };
  relatedContractMilestone: string;
}

export interface IBudgetAllocation {
  budgetBreakdownID: string;
  amount: number;
  period: {
    startDate: string;
    endDate: string;
  };
  relatedItem: string;
}

export interface IBudgetSource {
  budgetBreakdownID: string;
  amount: number;
  currency: string;
}

export interface IContract {
  id: string;
  date: string;
  awardId: string;
  title: string;
  description: string;
  status: string;
  statusDetails: string;
  documents: IDocument[];
  period: {
    startDate: string;
    endDate: string;
  };
  value: {
    amount: number;
    currency: string;
    amountNet: number;
    valueAddedTaxIncluded: boolean;
  };

  [key: string]: any;
}

export interface IDocument {
  id: string;
  title?: string;
  documentType: string;
  url: string;
  datePublished: string;
  relatedConfirmations?: string[];
}

export interface IParty {
  id: string;
  name: string;
  identifier: {
    scheme: string;
    id: string;
    legalName: string;
  };
  additionalIdentifiers: IAdditionalIdentifier[];
  details: {
    [key: string]: any;

    bankAccounts: IBankAccount[];
  };
  roles: TRole[];

  [key: string]: any;
}

export interface IAdditionalIdentifier {
  scheme: string;
  id: string;
  legalName: string;
}

export interface IBankAccount {
  description: string;
  bankName: string;
  identifier: {
    scheme: string;
    id: string;
  };
  accountIdentification: {
    scheme: string;
    id: string;
  };

  [key: string]: any;
}

export type TRole = 'payee' | 'supplier' | 'buyer' | 'payer';

export interface IRelatedProcess {
  id: string;
  relationship: TRelationship[];
  scheme: string;
  identifier: string;
  uri: string;
}

export type TRelationship = 'x_evaluation' | 'parent' | 'x_negotiation';
