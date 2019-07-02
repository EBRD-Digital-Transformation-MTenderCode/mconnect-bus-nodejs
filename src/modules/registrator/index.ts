import { v4 as uuid } from 'uuid';
import { Message as IMessage } from 'kafka-node';

import { fetchContractRegister, fetchEntityRecord } from '../../api';

import db from '../../lib/dataBase';
import { InConsumer, OutProducer } from '../../lib/kafka';
import logger from '../../lib/logger';

import { dbConfig, kafkaOutProducerConfig } from '../../configs';

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

  async start() {
    logger.info('✔ Registrator started');

    try {
      await this.registerNotRegisteredContracts();

      InConsumer.on('message', (message: IMessage) => this.registerContract(message));
    } catch (error) {
      logger.error('🗙 Error in registrator start: ', error);
    }
  }

  private generateKafkaMessageOut(contractId: string): IOut {
    const ocid = contractId.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/, '');
    const cpid = ocid.replace(/-AC-[0-9]{13}$/, '');

    return {
      id: uuid(),
      command: 'launchACVerification',
      data: {
        cpid,
        ocid,
      },
      version: '0.0.1',
    };
  }

  private async generateRegistrationPayload(messageData: IIn): Promise<IContractRegisterPayload | undefined> {
    try {
      const { cpid, ocid } = messageData.data;

      const acRecord: IAcRecord | undefined = await fetchEntityRecord(cpid, ocid);

      if (!acRecord) return;

      const [acRelease] = acRecord.releases;

      const { planning, contracts, parties, relatedProcesses } = acRelease;

      const evOcid = (relatedProcesses.find((process: IRelatedProcess) => {
        return process.relationship.some((rel: string) => rel === 'x_evaluation');
      }) || {} as IRelatedProcess).identifier;

      const evRecord = await fetchEntityRecord(cpid, ocid);

      if (!evRecord) return;

      const [contract] = contracts;

      const id_dok = `${contract.id}-${messageData.context.startDate}`;

      const buyer = parties.find((part: any) => {
        return part.roles.some((role: string) => role === 'buyer');
      }) || {} as IParty;

      const buyerBranchesIdentifier = (buyer.additionalIdentifiers || []).find((addIdentifier: IAdditionalIdentifier) => {
        return addIdentifier.scheme === 'MD-BRANCHES';
      }) || {} as IAdditionalIdentifier;

      const supplier = parties.find((part: any) => {
        return part.roles.some((role: string) => role === 'supplier');
      }) || {} as IParty;

      const supplierBranchesIdentifier = (supplier.additionalIdentifiers || []).find((addIdentifier: IAdditionalIdentifier) => {
        return addIdentifier.scheme === 'MD-BRANCHES';
      }) || {} as IAdditionalIdentifier;

      const advanceValue = (((planning.implementation.transactions || []).find((transaction: ITransaction) => {
        return transaction.type === 'advance';
      }) || {} as ITransaction).value || {}).amount;

      const docsOfContractSigned = contract.documents.filter((document: IDocument) => {
        return document.documentType === 'contractSigned';
      });

      const sortedDocsOfContractSigned = [...docsOfContractSigned].sort((doc1: IDocument, doc2: IDocument) => {
        return +(new Date(doc1.datePublished)) - +(new Date(doc2.datePublished));
      });

      const benef = parties.filter((part: IParty) => {
        return part.roles.some((role: string) => role === 'supplier');
      }).map((part: IParty) => ({
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

          achiz_nom: evOcid,
          achiz_date: evRecord.publishedDate,

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

      return contractRegisterPayload;
    } catch (error) {
      logger.error('🗙 Error in registrator generateRegistrationPayload: ', error);
    }
  }

  private async registerContract(data: IMessage) {
    try {
      const messageData: IIn = JSON.parse(data.value as string);

      const sentContract = await db.isExist(dbConfig.tables.requests, {
        field: 'cmd_id',
        value: messageData.id,
      });

      if (sentContract.exists) {
        logger.warn(`Contract with id - ${messageData.data.ocid} is already exists in request table`);
        return;
      }

      const payload = await this.generateRegistrationPayload(messageData);

      if (!payload) {
        logger.error(`Failed generate payload for contract register for - ${messageData.data.ocid}`);
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

      const contractIsRegistered = await fetchContractRegister(payload);

      if (!contractIsRegistered || contractIsRegistered.id_dok !== contractId) {
        logger.error(`Failed register contract - ${messageData.data.ocid}`);
        return;
      }

      const kafkaMessageOut = this.generateKafkaMessageOut(contractId);

      await db.insertToResponses({
        id_doc: contractId,
        cmd_id: kafkaMessageOut.id,
        cmd_name: kafkaMessageOut.command,
        message: kafkaMessageOut,
      });

      const result = await db.updateRow({
        table: dbConfig.tables.treasuryRequests,
        contractId,
        columns: {
          ts: Date.now(),
        },
      });

      if (result.rowCount !== 1) {
        logger.error(`🗙 Error in registrator registerContract: Can't update timestamp in treasuryRequests table for id_doc ${contractId}. Seem to be column timestamp already filled`);
        return;
      }

      logger.info(`Contract - ${contractId} was registered`);

      OutProducer.send([
        {
          topic: kafkaOutProducerConfig.outTopic,
          messages: JSON.stringify(kafkaMessageOut),
        },
      ], async (error) => {
        if (error) return logger.error('🗙 Error in registrator registerContract - producer: ', error);

        const result = await db.updateRow({
          table: dbConfig.tables.responses,
          contractId,
          columns: {
            ts: Date.now(),
          },
        });

        if (result.rowCount !== 1) {
          logger.error(`🗙 Error in registrator registerContract - producer: Can't update timestamp in responses table for id_doc ${contractId}. Seem to be column timestamp already filled`);
          return;
        }
      });

    } catch (error) {
      logger.error('🗙 Error in registrator registerContract: ', error);
    }
  }

  private async registerNotRegisteredContracts() {
    try {
      const notRegisteredContracts = await db.getNotRegistereds();

      for (const row of notRegisteredContracts) {
        logger.warn(`Not registered contract - ${row.id_doc}`);

        const contractId = row.id_doc;

        await fetchContractRegister(row.message);

        const sentContract = await db.isExist(dbConfig.tables.responses, {
          field: 'id_doc',
          value: contractId,
        });

        const kafkaMessageOut = this.generateKafkaMessageOut(contractId);

        if (sentContract.exists) {
          const result = await db.updateRow({
            table: dbConfig.tables.treasuryRequests,
            contractId,
            columns: {
              ts: Date.now(),
            },
          });

          if (result.rowCount !== 1) {
            logger.error(`🗙 Error in registrator registerNotRegisteredContracts - sentContract.exists: Can't update timestamp in treasuryRequests table for id_doc ${contractId}. Seem to be column timestamp already filled`);
            return;
          }
        }
        else {
          await db.insertToResponses({
            id_doc: contractId,
            cmd_id: kafkaMessageOut.id,
            cmd_name: kafkaMessageOut.command,
            message: kafkaMessageOut,
          });

          const result = await db.updateRow({
            table: dbConfig.tables.treasuryRequests,
            contractId,
            columns: {
              ts: Date.now(),
            },
          });

          if (result.rowCount !== 1) {
            logger.error(`🗙 Error in registrator registerNotRegisteredContracts - sentContract.notExists: Can't update timestamp in treasuryRequests table for id_doc ${contractId}. Seem to be column timestamp already filled`);
            return;
          }
        }

        logger.info(`Contract - ${contractId} was registered`);

        OutProducer.send([
          {
            topic: kafkaOutProducerConfig.outTopic,
            messages: JSON.stringify(kafkaMessageOut),
          },
        ], async (error) => {
          if (error) return logger.error('🗙 Error in registrator registerNotRegisteredContracts - producer: ', error);

          const result = await db.updateRow({
            table: dbConfig.tables.responses,
            contractId,
            columns: {
              ts: Date.now(),
            },
          });

          if (result.rowCount !== 1) {
            logger.error(`🗙 Error in registrator registerNotRegisteredContracts - producer: Can't update timestamp in responses table for id_doc ${contractId}. Seem to be column timestamp already filled`);
            return;
          }
        });
      }
    } catch (error) {
      logger.error('🗙 Error in registrator registerNotRegisteredContracts: ', error);
    }
  }
}