import { v4 as uuid } from 'uuid';

import { fetchContractRegister, fetchEntityRecord } from '../../api';

import db from '../dataBase';
import { InConsumer, OutProducer } from '../kafka';
import { Message as IMessage } from 'kafka-node';
import logger from '../logger';

import { dbConfig, kafkaOutProducerConfig } from '../../configs';

import {
  IIn,
  IOut,
  IAcRecord,
  IRelatedProcess,
  IParty,
  IAdditionalIdentifier,
  ITransaction,
  ITreasuryBudgetSources,
  IBudgetAllocation,
  IContractRegisterPayload, IDocument,
} from '../../types';

export default class Registrator {

  private generateKafkaMessageOut(contractId: string): IOut {
    const ocid = contractId.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/, '');
    const cpid = ocid.replace(/-AC-[0-9]{13}$/, '');

    const kafkaMessageOut: IOut = {
      id: uuid(),
      command: 'launchACVerification',
      data: {
        cpid,
        ocid,
      },
      version: '0.0.1',
    };

    return kafkaMessageOut;
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

      const avansValue = (((planning.implementation.transactions || []).find((transaction: ITransaction) => {
        return transaction.type === 'advance';
      }) || {} as ITransaction).value || {});

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
      if (avansValue.amount) contractRegisterPayload.header.avans = avansValue.amount;

      return contractRegisterPayload;
    } catch (e) {
      logger.error('Error form generation payload for register contract'), e;
    }
  }

  private async registerContract(data: IMessage) {
    try {
      const messageData: IIn = JSON.parse(data.value as string);

      const sentContract = await db.contractIsExist(dbConfig.tables.requests, {
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

      await db.insertContractToRequests({
        cmd_id: messageData.id,
        cmd_name: messageData.command,
        message: messageData,
        ts: Date.now(),
      });

      const contractId = `${messageData.data.ocid}-${messageData.context.startDate}`;

      await db.insertContractToTreasuryRequests({ id_doc: contractId, message: payload });

      const contractIsRegistered = await fetchContractRegister(payload);

      if (!contractIsRegistered || contractIsRegistered.id_dok !== contractId) {
        logger.error(`Failed register contract - ${messageData.data.ocid}`);
        return;
      }

      const kafkaMessageOut = this.generateKafkaMessageOut(contractId);

      await db.insertContractToResponses({
        id_doc: contractId,
        cmd_id: kafkaMessageOut.id,
        cmd_name: kafkaMessageOut.command,
        message: kafkaMessageOut,
      });

      await db.updateContract({
        table: dbConfig.tables.treasuryRequests,
        contractId,
        columns: {
          ts: Date.now(),
        },
      });

      OutProducer.send([
        {
          topic: kafkaOutProducerConfig.outTopic,
          messages: JSON.stringify(kafkaMessageOut),
        },
      ], async (err) => {
        if (err) return logger.error('Error send message to kafka of contract validation launched ', err);

        await db.updateContract({
          table: dbConfig.tables.responses,
          contractId,
          columns: {
            ts: Date.now(),
          },
        });
      });

    } catch (e) {
      logger.error('Error of register contract ', e);
    }
  }

  private async registerNotRegisteredContracts() {
    try {
      const notRegisteredContracts = await db.getNotRegisteredContracts();

      for (const row of notRegisteredContracts) {
        const contractId = row.id_doc;

        await fetchContractRegister(row.message);

        const sentContract = await db.contractIsExist(dbConfig.tables.responses, {
          field: 'id_doc',
          value: contractId,
        });

        const kafkaMessageOut = this.generateKafkaMessageOut(contractId);

        if (sentContract.exists) {
          await db.updateContract({
            table: dbConfig.tables.treasuryRequests,
            contractId,
            columns: {
              ts: Date.now(),
            },
          });
        }
        else {
          await db.insertContractToResponses({
            id_doc: contractId,
            cmd_id: kafkaMessageOut.id,
            cmd_name: kafkaMessageOut.command,
            message: kafkaMessageOut,
          });

          await db.updateContract({
            table: dbConfig.tables.treasuryRequests,
            contractId,
            columns: {
              ts: Date.now(),
            },
          });
        }

        OutProducer.send([
          {
            topic: kafkaOutProducerConfig.outTopic,
            messages: JSON.stringify(kafkaMessageOut),
          },
        ], async (err) => {
          if (err) return logger.error('Error send message to kafka of contract validation launched ', err);

          await db.updateContract({
            table: dbConfig.tables.responses,
            contractId,
            columns: {
              ts: Date.now(),
            },
          });
        });
      }
    } catch (e) {
      logger.error('Error of register not registered contracts ', e);
    }
  }

  async start() {
    logger.info('✔ Registrator started');

    try {
      await this.registerNotRegisteredContracts();

      InConsumer.on('message', (message: IMessage) => {
        this.registerContract(message)
      });
    } catch (e) {
      logger.error('Error on start registrator', e);
    }
  }
}