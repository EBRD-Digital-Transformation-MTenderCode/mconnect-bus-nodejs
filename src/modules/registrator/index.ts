import { v4 as uuid } from 'uuid';
import { Message as IMessage } from 'kafka-node';

import { fetchContractRegister, fetchEntityRecord } from '../../api';

import db from '../../lib/dataBase';
import { InConsumer, OutProducer } from '../../lib/kafka';
import logger from '../../lib/logger';

import { dbConfig, kafkaOutProducerConfig } from '../../configs';

import { findOrganizationFromRole } from '../../utils';

import {
  IAcRecord,
  IAdditionalIdentifier,
  IBudgetAllocation,
  IContractRegisterPayload,
  IDocument,
  IIn,
  IOut,
  IParty,
  IRelatedProcess,
  ITransaction,
  ITreasuryBudgetSources,
} from '../../types';

export default class Registrator {
  constructor(private readonly interval: number) {}

  async start() {
    logger.info('✔ Registrator started');

    try {
      await this.registerContracts();

      setInterval(() => this.registerContracts(), this.interval);

      InConsumer.on('message', (message: IMessage) => this.saveContractForRegistration(message));
    } catch (error) {
      logger.error('🗙 Error in registrator start: ', error);
    }
  }

  private async registerContracts() {
    try {
      const notRegisteredContracts = await db.getNotRegistereds();

      for (const row of notRegisteredContracts) {
        const contractId = row.id_doc;

        const contractRegistrationResponse = await fetchContractRegister(row.message);

        if (!contractRegistrationResponse || contractRegistrationResponse.id_dok !== contractId) {
          logger.error(`🗙 Error in REGISTRATOR. Failed register contract - ${contractId}`);
          break;
        }

        const { exists: contractIsExist } = await db.isExist(dbConfig.tables.responses, {
          field: 'id_doc',
          value: contractId,
        });

        const kafkaMessageOut = this.generateKafkaMessageOut(contractId);

        if (!contractIsExist) {
          await db.insertToResponses({
            id_doc: contractId,
            cmd_id: kafkaMessageOut.id,
            cmd_name: kafkaMessageOut.command,
            message: kafkaMessageOut,
          });
        }

        const result = await db.updateRow({
          table: dbConfig.tables.treasuryRequests,
          contractId,
          columns: {
            ts: Date.now(),
          },
        });

        if (result.rowCount !== 1) {
          logger.error(`🗙 Error in REGISTRATOR. registerNotRegisteredContracts - sentContract.${contractIsExist ? 'exist' : 'notExists'}: Can't update timestamp in treasuryRequests table for id_doc ${contractId}. Seem to be column timestamp already filled`);
          return;
        }

        logger.info(`Contract - ${contractId} was registered`);

        OutProducer.send([
          {
            topic: kafkaOutProducerConfig.outTopic,
            messages: JSON.stringify(kafkaMessageOut),
          },
        ], async (error: any) => {
          if (error) return logger.error('🗙 Error in REGISTRATOR. registerNotRegisteredContracts - producer: ', error);

          const result = await db.updateRow({
            table: dbConfig.tables.responses,
            contractId,
            columns: {
              ts: Date.now(),
            },
          });

          if (result.rowCount !== 1) {
            logger.error(`🗙 Error in REGISTRATOR. registerNotRegisteredContracts - producer: Can't update timestamp in responses table for id_doc ${contractId}. Seem to be column timestamp already filled`);
            return;
          }
        });
      }
    } catch (error) {
      logger.error('🗙 Error in REGISTRATOR. registerNotRegisteredContracts: ', error);
    }
  }

  private generateKafkaMessageOut(contractId: string): IOut {
    const ocid = contractId.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/, ''); // ocds-b3wdp1-MD-1539843614475-AC-1539843614531
    const cpid = ocid.replace(/-AC-[0-9]{13}$/, ''); // ocds-b3wdp1-MD-1539843614475

    return {
      id: uuid(),
      command: 'launchAcVerification',
      data: {
        cpid,
        ocid,
      },
      version: '0.0.1',
    };
  }

  private async saveContractForRegistration(data: IMessage) {
    try {
      const messageData: IIn = JSON.parse(data.value as string);

      if (messageData.command !== 'sendAcForVerification') return;

      const { exists: contractIsExist } = await db.isExist(dbConfig.tables.requests, {
        field: 'cmd_id',
        value: messageData.id,
      });

      if (contractIsExist) {
        logger.warn(`! Warning in REGISTRATOR. Contract with id - ${messageData.data.ocid} already exists in request table`);
      }

      const payload = await this.generateRegistrationPayload(messageData);

      if (!payload) {
        logger.error(`🗙 Error in REGISTRATOR. Failed generate payload for contract register for - ${messageData.data.ocid}`);
        return;
      }

      await db.insertToRequests({
        cmd_id: messageData.id,
        cmd_name: messageData.command,
        message: messageData,
        ts: Date.now(),
      });

      const contractId = `${messageData.data.ocid}-${messageData.context.startDate}`;

      await db.insertToTreasuryRequests({ id_doc: contractId, message: payload });
    } catch (error) {
      logger.error('🗙 Error in REGISTRATOR. prepareContractToRegistration: ', error);
    }
  }

  private async generateRegistrationPayload(messageData: IIn): Promise<IContractRegisterPayload | undefined> {
    try {
      const { cpid, ocid } = messageData.data;

      const acRecord: IAcRecord | undefined = await fetchEntityRecord(cpid, ocid);

      if (!acRecord) return;

      const [acRelease] = acRecord.releases;

      const { planning, contracts, parties, relatedProcesses } = acRelease;

      const tenderOcid = (relatedProcesses.find((process: IRelatedProcess) => {
        return process.relationship.some(rel => rel === 'x_evaluation' || rel === 'x_negotiation');
      }) || {} as IRelatedProcess).identifier;

      const tenderRecord = await fetchEntityRecord(cpid, ocid);

      if (!tenderRecord) return;

      const [contract] = contracts;

      const id_dok = `${contract.id}-${messageData.context.startDate}`;

      const buyer = findOrganizationFromRole(parties, 'buyer') || {} as IParty;

      const buyerBranchesIdentifier = (buyer.additionalIdentifiers || []).find((addIdentifier: IAdditionalIdentifier) => {
        return addIdentifier.scheme === 'MD-BRANCHES';
      }) || {} as IAdditionalIdentifier;

      const supplier = findOrganizationFromRole(parties, 'supplier') || {} as IParty;

      const supplierBranchesIdentifier = (supplier.additionalIdentifiers || []).find((addIdentifier: IAdditionalIdentifier) => {
        return addIdentifier.scheme === 'MD-BRANCHES';
      }) || {} as IAdditionalIdentifier;

      const advanceValue = ((planning.implementation.transactions.find((transaction: ITransaction) => {
        return transaction.type === 'advance';
      }) || {} as ITransaction).value || {}).amount;

      const docsOfContractSigned = contract.documents.filter((document: IDocument) => {
        return document.documentType === 'contractSigned';
      });

      const sortedDocsOfContractSigned = [...docsOfContractSigned].sort((doc1: IDocument, doc2: IDocument) => {
        return +(new Date(doc2.datePublished)) - +(new Date(doc1.datePublished));
      });

      const benef = parties.filter(part => {
        return part.roles.some(role => role === 'supplier');
      }).map(part => ({
        id_dok,
        bbic: part.details.bankAccounts[0].identifier.id,
        biban: part.details.bankAccounts[0].accountIdentification.id,
      }));

      const details = messageData.data.treasuryBudgetSources.map((treasuryBudgetSrc: ITreasuryBudgetSources) => {
        const needBudgetAllocation = planning.budget.budgetAllocation.find((allocation: IBudgetAllocation) => {
          return allocation.budgetBreakdownID === treasuryBudgetSrc.budgetBreakdownID;
        });

        const { startDate } = (needBudgetAllocation || {} as IBudgetAllocation).period;

        return {
          id_dok,
          suma: treasuryBudgetSrc.amount,
          piban: treasuryBudgetSrc.budgetIBAN,
          byear: +startDate.substr(0, 4),
        };
      });

      const contractRegisterPayload: IContractRegisterPayload = {
        header: {
          id_dok,
          nr_dok: contract.id,
          da_dok: contract.date,

          suma: contract.value.amount,
          kd_val: contract.value.currency,

          pkd_fisk: buyer.identifier.id,
          pname: buyer.identifier.legalName,

          bkd_fisk: supplier.identifier.id,
          bname: supplier.identifier.legalName,

          desc: contract.description,

          achiz_nom: tenderOcid,
          achiz_date: tenderRecord.publishedDate,

          da_expire: contract.period.endDate,
          c_link: sortedDocsOfContractSigned[sortedDocsOfContractSigned.length - 1].url,
        },
        benef,
        details,
      };

      if (buyerBranchesIdentifier.id) contractRegisterPayload.header.pkd_sdiv = buyerBranchesIdentifier.id;
      if (supplierBranchesIdentifier.id) contractRegisterPayload.header.bkd_sdiv = supplierBranchesIdentifier.id;
      if (advanceValue && contract.value.amount > advanceValue) {
        contractRegisterPayload.header.avans = (advanceValue * 100) / contract.value.amount;
      }

      // @TODO delete on prod
      logger.info(`✔ Payload for register contract with id - ${contract.id} \n ${JSON.stringify(contractRegisterPayload, null, 2)}`);

      return contractRegisterPayload;
    } catch (error) {
      logger.error('🗙 Error in registrator generateRegistrationPayload: ', error);
    }
  }
}
