import axios from 'axios';
import { request } from '../configs';

import { IIn, IRequestBody, ITreasuryBudgetSources } from '../types';

export async function contractRegister(messageData: IIn) {
  const { cpid, ocid } = messageData.context;

  const { data: acReleaseResponse } = await axios(request.getEntityRelease(cpid, ocid));
  const [acRelease] = acReleaseResponse.releases;

  const evOcid = acRelease.relatedProcesses.find((process: any) => process.relationship.some((rel: string) => rel === 'x_evaluation')).identifier;

  const { data: evReleaseResponse } = await axios(request.getEntityRelease(cpid, ocid));

  const [contract] = acRelease.contracts;

  const id_dok = `${contract.id}-${messageData.context.startDate}`;

  const buyer = acRelease.parties.find((part: any) => part.role.some((role: string) => role === 'buyer')) || {};
  const buyerBranchesIdentifier = (buyer.additionalIdentifiers || []).find((additionalIdentifier: any) => additionalIdentifier.scheme === 'MD-BRANCHES') || {};

  const supplier = acRelease.parties.find((part: any) => part.role.some((role: string) => role === 'supplier')) || {};
  const supplierBranchesIdentifier = (supplier.additionalIdentifiers || []).find((additionalIdentifier: any) => additionalIdentifier.scheme === 'MD-BRANCHES') || {};

  const avansValue = ((acRelease.planning.implementation.transactions || []).find((transaction: any) => transaction.type === 'advance') || {}).value;

  const documentsOfContractSigned = contract.documents.filter((document: any) => document.documentType === 'contractSigned');

  const sortedDocumentsOfContractSigned = [...documentsOfContractSigned].sort((doc1: any, doc2: any) => +(new Date(doc1.datePublished)) - +(new Date(doc2.datePublished)));

  const benef = acRelease.parties.filter((part: any) => part.role.some((role: string) => role === 'supplier')).map((part: any) => ({
    id_dok,
    bbic: part.details.bankAccounts[0].identifier.id,
    biban: part.details.bankAccounts[0].accountIdentification.id,
  }));

  const details = messageData.data.treasuryBudgetSources.map((treasuryBudgetSource: ITreasuryBudgetSources) => {
    const startDate = acRelease.planning.budget.budgetAllocation.find((allocation: any) => allocation.budgetBreakdownID === treasuryBudgetSource.budgetBreakdownID).period.startDate;

    return {
      id_dok,
      suma: treasuryBudgetSource.amount,
      piban: treasuryBudgetSource.budgetIBAN,
      byear: startDate.substr(0, 4)
    }
  });

  const treasuryBody: IRequestBody = {
    header: {
      id_dok,
      nr_dok: contract.id,
      da_dok: contract.date,

      suma: contract.value.amount,
      kd_val: contract.value.currency,

      pkd_fisk: buyer.identifier.id,
      pname: buyer.identifier.legalName,
      pkd_sdiv: buyerBranchesIdentifier.id || '',

      bkd_fisk: supplier.identifier.id,
      bname: supplier.identifier.legalName,
      bkd_sdiv: supplierBranchesIdentifier.id || '',

      desc: contract.description,

      reg_nom: '',
      reg_date: '',

      achiz_nom: evOcid,
      achiz_dat: evReleaseResponse.publishedDate,

      avans: `${avansValue.amount || ''}`,

      da_expire: contract.period.endDate,
      c_link: sortedDocumentsOfContractSigned[sortedDocumentsOfContractSigned.length - 1].url,
    },
    benef,
    details,
  };

  const { data } = await axios(request.postContractRegister(treasuryBody));

  console.log(data);
}