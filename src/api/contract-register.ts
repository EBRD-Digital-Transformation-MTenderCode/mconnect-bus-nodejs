import axios from 'axios';
import { request } from '../configs';

import {
  IAcRecord,
  IAdditionalIdentifier, IBudgetAllocation,
  IIn,
  IParty, IRelatedProcess,
  IContractRegisterRequestBody,
  ITransaction,
  ITreasuryBudgetSources,
} from '../types';

export async function contractRegister(messageData: IIn) {
  try {
    const { cpid, ocid } = messageData.data;

    const acResponse = await axios(request.getEntityRelease(cpid, ocid));
    const acRecord: IAcRecord = acResponse.data;
    const [acRelease] = acRecord.releases;

    const { planning, contracts, parties, relatedProcesses } = acRelease;

    const evOcid = (relatedProcesses.find((process: any) => process.relationship.some((rel: string) => rel === 'x_evaluation')) || {} as IRelatedProcess).identifier;

    const { data: evReleaseResponse } = await axios(request.getEntityRelease(cpid, ocid));

    const [contract] = contracts;

    const id_dok = `${contract.id}-${messageData.context.startDate}`;

    const buyer = parties.find((part: any) => part.roles.some((role: string) => role === 'buyer')) || {} as IParty;
    const buyerBranchesIdentifier = (buyer.additionalIdentifiers || []).find((additionalIdentifier: any) => additionalIdentifier.scheme === 'MD-BRANCHES') || {} as IAdditionalIdentifier;

    const supplier = parties.find((part: any) => part.roles.some((role: string) => role === 'supplier')) || {} as IParty;
    const supplierBranchesIdentifier = (supplier.additionalIdentifiers || []).find((additionalIdentifier: any) => additionalIdentifier.scheme === 'MD-BRANCHES') || {} as IAdditionalIdentifier;

    const avansValue = (((planning.implementation.transactions || []).find((transaction: any) => transaction.type === 'advance') || {} as ITransaction).value || {});

    const documentsOfContractSigned = contract.documents.filter((document: any) => document.documentType === 'contractSigned');

    const sortedDocumentsOfContractSigned = [...documentsOfContractSigned].sort((doc1: any, doc2: any) => +(new Date(doc1.datePublished)) - +(new Date(doc2.datePublished)));

    const benef = parties.filter((part: any) => part.roles.some((role: string) => role === 'supplier')).map((part: any) => ({
      id_dok,
      bbic: part.details.bankAccounts[0].identifier.id,
      biban: part.details.bankAccounts[0].accountIdentification.id,
    }));

    const details = messageData.data.treasuryBudgetSources.map((treasuryBudgetSource: ITreasuryBudgetSources) => {
      const needBudgetAllocation = planning.budget.budgetAllocation.find((allocation: any) => allocation.budgetBreakdownID === treasuryBudgetSource.budgetBreakdownID);
      const { startDate } = (needBudgetAllocation || {} as IBudgetAllocation).period;

      return {
        id_dok,
        suma: treasuryBudgetSource.amount,
        piban: treasuryBudgetSource.budgetIBAN,
        byear: +startDate.substr(0, 4),
      };
    });

    const treasuryBody: IContractRegisterRequestBody = {
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

        achiz_nom: evOcid,
        achiz_date: evReleaseResponse.publishedDate,

        avans: avansValue.amount || 0,

        da_expire: contract.period.endDate,
        c_link: sortedDocumentsOfContractSigned[sortedDocumentsOfContractSigned.length - 1].url,
      },
      benef,
      details,
    };

    // write to base что отправленно что нет хранить в базе

    // const { data } = await axios(request.postContractRegister(treasuryBody));

    console.log(JSON.stringify(treasuryBody, null, 2));
  } catch (e) {
    console.log(e);
  }
}