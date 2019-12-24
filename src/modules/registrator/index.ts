import { v4 as uuid } from 'uuid';

import { Message as IMessage } from 'kafka-node';

import { fetchContractRegister, fetchEntityRecord } from 'api';

import db from 'lib/dataBase';
import { InConsumer, OutProducer } from 'lib/kafka';
import logger from 'lib/logger';

import { dbConfig, kafkaOutProducerConfig } from 'configs';

import { findOrganizationFromRole } from 'utils';

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
  ITreasuryRequestsRow
} from 'types';

export default class Registrator {
  constructor(private readonly interval: number) {}

  private static async registerContracts(): Promise<void> {
    try {
      const notRegisteredContracts = await db.getNotRegistereds();

      for (const contract of notRegisteredContracts) {
        const contractId = contract.id_doc;

        try {
          await Registrator.registerContractInTreasury(contract);
        } catch (error) {
          logger.error(error.message);
          return;
        }

        const kafkaMessageOut = Registrator.generateKafkaMessageOut(contractId);

        const sentContract = await Registrator.validateContractExistance(contract, kafkaMessageOut);

        if (sentContract) {
          try {
            await Registrator.addContractTimestamp(
              contract,
              'treasuryRequests',
              sentContract.exists ? 'Contract exists' : 'Contract does not exist'
            );
          } catch (error) {
            logger.error(error.message);
            return;
          }
        }

        logger.info(`Contract ${contractId} was successfully registered`);

        await Registrator.sendKafkaMessageOut(contract, kafkaMessageOut);
      }
    } catch (error) {
      logger.error('🗙 Error in REGISTRATOR. Failed to register contracts: ', error);
    }
  }

  private static generateKafkaMessageOut(contractId: string): IOut {
    const ocid = contractId.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/, '');
    const cpid = ocid.replace(/-AC-[0-9]{13}$/, '');

    return {
      id: uuid(),
      command: 'launchAcVerification',
      data: {
        cpid,
        ocid
      },
      version: '0.0.1'
    };
  }

  private static async registerContractInTreasury(contract: ITreasuryRequestsRow): Promise<void> {
    const { id_doc: contractId, message } = contract;

    try {
      const contractRegistrationResponse = await fetchContractRegister(message);

      if (!contractRegistrationResponse) {
        throw new Error(`response from treasury was not received.`);
      }

      if (contractRegistrationResponse && contractRegistrationResponse.id_dok !== contractId) {
        throw new Error(`response id does not match contract id.`);
      }
    } catch (error) {
      throw new Error(`🗙 Error in REGISTRATOR. Failed to register contract ${contractId} - ${error.message}`);
    }
  }

  private static async validateContractExistance(
    contract: ITreasuryRequestsRow,
    kafkaMessage: IOut
  ): Promise<{ exists: boolean } | undefined> {
    const { id_doc: contractId } = contract;

    try {
      const sentContract = await db.isExist(dbConfig.tables.responses, {
        field: 'id_doc',
        value: contractId
      });

      try {
        if (!sentContract.exists) {
          await db.insertToResponses({
            id_doc: contractId,
            cmd_id: kafkaMessage.id,
            cmd_name: kafkaMessage.command,
            message: kafkaMessage
          });
        }
      } catch (error) {
        logger.error(`🗙 Error in REGISTRATOR. Failed to insert not existent contract ${contractId} to responses.`);
      }

      return sentContract;
    } catch (error) {
      logger.error(`🗙 Error in REGISTRATOR. Failed to check if contract ${contractId} exists in database.`);
    }
  }

  private static async addContractTimestamp(
    contract: ITreasuryRequestsRow,
    table: 'treasuryRequests' | 'responses',
    processType: 'Contract exists' | 'Contract does not exist' | 'Producer'
  ): Promise<void> {
    const { id_doc: contractId } = contract;

    const result = await db.updateRow({
      table: dbConfig.tables[table],
      contractId,
      columns: {
        ts: Date.now()
      }
    });

    if (result.rowCount !== 1) {
      throw new Error(
        `🗙 Error in REGISTRATOR. ${processType}: Failed to update timestamp in treasuryRequests table for id_doc ${contractId}. Column timestamp seems to be already filled.`
      );
    }
  }

  private static sendKafkaMessageOut(contract: ITreasuryRequestsRow, kafkaMessage: IOut): void {
    OutProducer.send(
      [
        {
          topic: kafkaOutProducerConfig.outTopic,
          messages: JSON.stringify(kafkaMessage)
        }
      ],
      async (producerError: any) => {
        if (producerError)
          return logger.error('🗙 Error in REGISTRATOR. Failed to send message out to Kafka: ', producerError);

        try {
          await Registrator.addContractTimestamp(contract, 'responses', 'Producer');
        } catch (error) {
          logger.error(error.message);
        }
      }
    );
  }

  private static async saveContractForRegistration(data: IMessage): Promise<void> {
    try {
      const messageData: IIn = JSON.parse(data.value as string);

      if (messageData.command !== 'sendAcForVerification') return;

      const { exists: contractIsExist } = await db.isExist(dbConfig.tables.requests, {
        field: 'cmd_id',
        value: messageData.id
      });

      if (contractIsExist) {
        logger.warn(
          `! Warning in REGISTRATOR. Contract ${messageData.data.ocid} being saved for registration already exists in request table.`
        );
      }

      const payload = await Registrator.generateRegistrationPayload(messageData);

      if (!payload) {
        logger.error(
          `🗙 Error in REGISTRATOR. Failed to generate contract register payload for - ${messageData.data.ocid}`
        );
        return;
      }

      await db.insertToRequests({
        cmd_id: messageData.id,
        cmd_name: messageData.command,
        message: messageData,
        ts: Date.now()
      });

      const contractId = `${messageData.data.ocid}-${messageData.context.startDate}`;

      await db.insertToTreasuryRequests({
        id_doc: contractId,
        message: payload
      });
    } catch (error) {
      logger.error('🗙 Error in REGISTRATOR. Failed to save contract for registration: ', error);
    }
  }

  private static async generateRegistrationPayload(messageData: IIn): Promise<IContractRegisterPayload | undefined> {
    try {
      const { cpid, ocid } = messageData.data;

      const acRecord: IAcRecord | undefined = await fetchEntityRecord(cpid, ocid);

      if (!acRecord) return;

      const [acRelease] = acRecord.releases;

      const { planning, contracts, parties, relatedProcesses } = acRelease;

      const tenderOcid = (
        relatedProcesses.find((process: IRelatedProcess) => {
          return process.relationship.some(rel => rel === 'x_evaluation' || rel === 'x_negotiation');
        }) || ({} as IRelatedProcess)
      ).identifier;

      const tenderRecord = await fetchEntityRecord(cpid, ocid);

      if (!tenderRecord) return;

      const [contract] = contracts;

      const id_dok = `${contract.id}-${messageData.context.startDate}`;

      const buyer = findOrganizationFromRole(parties, 'buyer') || ({} as IParty);

      const buyerBranchesIdentifier =
        (buyer.additionalIdentifiers || []).find((addIdentifier: IAdditionalIdentifier) => {
          return addIdentifier.scheme === 'MD-BRANCHES';
        }) || ({} as IAdditionalIdentifier);

      const supplier = findOrganizationFromRole(parties, 'supplier') || ({} as IParty);

      const supplierBranchesIdentifier =
        (supplier.additionalIdentifiers || []).find((addIdentifier: IAdditionalIdentifier) => {
          return addIdentifier.scheme === 'MD-BRANCHES';
        }) || ({} as IAdditionalIdentifier);

      const advanceValue = (
        (
          planning.implementation.transactions.find((transaction: ITransaction) => {
            return transaction.type === 'advance';
          }) || ({} as ITransaction)
        ).value || {}
      ).amount;

      const docsOfContractSigned = contract.documents.filter((document: IDocument) => {
        return document.documentType === 'contractSigned';
      });

      const sortedDocsOfContractSigned = [...docsOfContractSigned].sort((doc1: IDocument, doc2: IDocument) => {
        return +new Date(doc2.datePublished) - +new Date(doc1.datePublished);
      });

      const benef = parties
        .filter(part => {
          return part.roles.some(role => role === 'supplier');
        })
        .map(part => ({
          id_dok,
          bbic: part.details.bankAccounts[0].identifier.id,
          biban: part.details.bankAccounts[0].accountIdentification.id
        }));

      const details = messageData.data.treasuryBudgetSources.map((treasuryBudgetSrc: ITreasuryBudgetSources) => {
        const needBudgetAllocation = planning.budget.budgetAllocation.find((allocation: IBudgetAllocation) => {
          return allocation.budgetBreakdownID === treasuryBudgetSrc.budgetBreakdownID;
        });

        const { startDate } = (needBudgetAllocation || ({} as IBudgetAllocation)).period;

        return {
          id_dok,
          suma: treasuryBudgetSrc.amount,
          piban: treasuryBudgetSrc.budgetIBAN,
          byear: +startDate.substr(0, 4)
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
          c_link: sortedDocsOfContractSigned[sortedDocsOfContractSigned.length - 1].url
        },
        benef,
        details
      };

      if (buyerBranchesIdentifier.id) contractRegisterPayload.header.pkd_sdiv = buyerBranchesIdentifier.id;
      if (supplierBranchesIdentifier.id) contractRegisterPayload.header.bkd_sdiv = supplierBranchesIdentifier.id;
      if (advanceValue && contract.value.amount > advanceValue) {
        contractRegisterPayload.header.avans = (advanceValue * 100) / contract.value.amount;
      }

      // @TODO delete on prod
      logger.info(
        `✔ Payload for register contract with id - ${contract.id} \n ${JSON.stringify(
          contractRegisterPayload,
          null,
          2
        )}`
      );

      return contractRegisterPayload;
    } catch (error) {
      logger.error('🗙 Error in registrator generateRegistrationPayload: ', error);
    }
  }

  public async start(): Promise<void> {
    logger.info('✔ Registrator started');

    try {
      await Registrator.registerContracts();

      setInterval(() => Registrator.registerContracts(), this.interval);

      InConsumer.on('message', (message: IMessage) => Registrator.saveContractForRegistration(message));
    } catch (error) {
      logger.error('🗙 Error in registrator start: ', error);
    }
  }
}
