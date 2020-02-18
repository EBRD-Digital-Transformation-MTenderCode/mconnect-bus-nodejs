import { v4 as uuid } from 'uuid';

import { Message as IMessage } from 'kafka-node';

import * as yup from 'yup';
import { registrationPayloadSchema } from '../../validationsSchemas';

import { fetchContractRegister, fetchEntityRecord } from '../../api';

import db from '../../lib/dataBase';
import { InConsumer, OutProducer } from '../../lib/kafka';
import logger from '../../lib/logger';
import errorsHandler from '../../lib/errorsHandler';

import { dbConfig, kafkaOutProducerConfig } from '../../configs';

import { findOrganizationFromRole, patterns } from '../../utils';

import {
  IAcRecord,
  IAdditionalIdentifier,
  IBudgetAllocation,
  IContractRegisterPayload,
  IDocument,
  IIn,
  IOut,
  IRelatedProcess,
  ITransaction,
  ITreasuryBudgetSources,
  ITreasuryRequestsRow,
} from '../../types';

export default class Registrator {
  constructor(private readonly interval: number) {}

  private static async registerContracts(): Promise<void> {
    try {
      const notRegisteredContracts = await db.getNotRegistereds();

      logger.warn(`! Registrator has ${notRegisteredContracts.length} not registered contract(s)`);

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
        } else {
          return;
        }

        logger.info(`✔ Contract ${contractId} was successfully registered`);

        await Registrator.sendKafkaMessageOut(contract, kafkaMessageOut);
      }
    } catch (error) {
      logger.error('🗙 Error in REGISTRATOR. Failed to register contracts: ', error);
    }
  }

  private static generateKafkaMessageOut(contractId: string): IOut {
    // @ts-ignore
    const [cpid] = contractId.match(patterns.cpid); // ocds-b3wdp1-MD-1539843614475
    const [ocid] = contractId.match(patterns.ocidContract); // ocds-b3wdp1-MD-1539843614475-AC-1539843614531

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

  private static async registerContractInTreasury(contract: ITreasuryRequestsRow): Promise<void> {
    const { id_doc: contractId, message } = contract;

    try {
      const contractRegistrationResponse = await fetchContractRegister(message);

      if (!contractRegistrationResponse) {
        throw Error(`response from treasury was not received.`);
      }

      if (contractRegistrationResponse && contractRegistrationResponse.id_dok !== contractId) {
        throw Error(`response id does not match contract id.`);
      }
    } catch (error) {
      throw Error(`🗙 Error in REGISTRATOR. Failed to register contract ${contractId} - ${error.message}`);
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
        value: contractId,
      });

      try {
        if (!sentContract.exists) {
          await db.insertToResponses({
            id_doc: contractId,
            cmd_id: kafkaMessage.id,
            cmd_name: kafkaMessage.command,
            message: kafkaMessage,
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

    try {
      const result = await db.updateRow({
        table: dbConfig.tables[table],
        contractId,
        columns: {
          ts: Date.now(),
        },
      });

      if (result.rowCount !== 1) {
        throw Error(
          `🗙 Error in REGISTRATOR. ${processType}: Failed to update timestamp in treasuryRequests table for id_doc ${contractId}. Column timestamp seems to be already filled.`
        );
      }
    } catch (e) {
      throw Error(
        `🗙 Error in REGISTRATOR. ${processType}: Failed to update timestamp in treasuryRequests table for id_doc ${contractId}.`
      );
    }
  }

  private static sendKafkaMessageOut(contract: ITreasuryRequestsRow, kafkaMessage: IOut): void {
    OutProducer.send(
      [
        {
          topic: kafkaOutProducerConfig.outTopic,
          messages: JSON.stringify(kafkaMessage),
        },
      ],
      async (producerError: string) => {
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

      const contractId = `${messageData.data.ocid}-${messageData.context.startDate}`;

      const { exists: contractIsExistInRequestTable } = await db.isExist(dbConfig.tables.requests, {
        field: 'cmd_id',
        value: messageData.id,
      });

      if (!contractIsExistInRequestTable) {
        await db.insertToRequests({
          cmd_id: messageData.id,
          cmd_name: messageData.command,
          message: messageData,
          ts: Date.now(),
        });
      } else {
        logger.warn(
          `! Warning in REGISTRATOR. Contract ${messageData.data.ocid} being saved for registration already exists in request table.`
        );

        const { exists: contractIsInTreasuryRequestTable } = await db.isExist(dbConfig.tables.treasuryRequests, {
          field: 'id_doc',
          value: contractId,
        });

        if (contractIsInTreasuryRequestTable) {
          logger.warn(
            `! Warning in REGISTRATOR. Contract ${contractId} being saved for registration already exists in treasury_request table.`
          );

          return;
        }
      }

      const payload = await Registrator.generateRegistrationPayload(messageData);

      if (!payload) {
        logger.error(
          `🗙 Error in REGISTRATOR. Failed to generate contract register payload for - ${messageData.data.ocid}`
        );
        return;
      }

      await db.insertToTreasuryRequests({
        id_doc: contractId,
        message: payload,
      });
    } catch (error) {
      logger.error('🗙 Error in REGISTRATOR. Failed to save contract for registration: ', error);
    }
  }

  private static async generateRegistrationPayload(messageData: IIn): Promise<IContractRegisterPayload | undefined> {
    try {
      const { cpid, ocid } = messageData.data;

      let acRecord: IAcRecord | undefined;

      try {
        acRecord = await fetchEntityRecord(cpid, ocid);

        if (!acRecord || !Object.keys(acRecord).length) {
          throw Error();
        }
      } catch (errorFetchAcRecord) {
        await errorsHandler.catchError(JSON.stringify(messageData), [
          {
            code: 'ER-3.11.2.7',
            description: 'Не удалось получить рекорд контракта',
          },
        ]);
        return;
      }

      const [acRelease] = acRecord.releases;

      const { planning, contracts, parties, relatedProcesses } = acRelease;

      const tenderOcid = (
        relatedProcesses.find((process: IRelatedProcess) => {
          return process.relationship.some(rel => rel === 'x_evaluation' || rel === 'x_negotiation');
        }) || ({} as IRelatedProcess)
      )?.identifier;

      let tenderRecord;

      try {
        tenderRecord = await fetchEntityRecord(cpid, tenderOcid);

        if (!tenderRecord || !Object.keys(tenderRecord).length) {
          throw Error();
        }
      } catch (errorFetchTenderRecord) {
        await errorsHandler.catchError(JSON.stringify(messageData), [
          {
            code: 'ER-3.11.2.8',
            description: 'Не удалось получить рекорд тендера',
          },
        ]);
        return;
      }

      const [contract] = contracts;

      const id_dok = `${contract.id}-${messageData.context.startDate}`;

      const buyer = findOrganizationFromRole(parties, 'buyer');

      const buyerBranchesIdentifier = (buyer?.additionalIdentifiers || []).find(
        (addIdentifier: IAdditionalIdentifier) => {
          return addIdentifier.scheme === 'MD-BRANCHES';
        }
      );

      const supplier = findOrganizationFromRole(parties, 'supplier');

      const supplierBranchesIdentifier = (supplier?.additionalIdentifiers || []).find(
        (addIdentifier: IAdditionalIdentifier) => {
          return addIdentifier.scheme === 'MD-BRANCHES';
        }
      );

      const advanceValue = planning.implementation.transactions.find((transaction: ITransaction) => {
        return transaction.type === 'advance';
      })?.value.amount;

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
          biban: part.details.bankAccounts[0].accountIdentification.id,
        }));

      const details = messageData.data.treasuryBudgetSources.map((treasuryBudgetSrc: ITreasuryBudgetSources) => {
        const needBudgetAllocation = planning.budget.budgetAllocation.find((allocation: IBudgetAllocation) => {
          return allocation.budgetBreakdownID === treasuryBudgetSrc.budgetBreakdownID;
        });

        const startDate = needBudgetAllocation?.period.startDate ?? '';

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

          pkd_fisk: buyer?.identifier.id ?? '',
          pname: buyer?.identifier.legalName ?? '',

          bkd_fisk: supplier?.identifier.id ?? '',
          bname: supplier?.identifier.legalName ?? '',

          desc: contract.description,

          achiz_nom: tenderOcid,
          achiz_date: tenderRecord.publishedDate,

          da_expire: contract.period.endDate,
          c_link: sortedDocsOfContractSigned[sortedDocsOfContractSigned.length - 1].url,
        },
        benef,
        details,
      };

      if (buyerBranchesIdentifier?.id) contractRegisterPayload.header.pkd_sdiv = buyerBranchesIdentifier.id;
      if (supplierBranchesIdentifier?.id) contractRegisterPayload.header.bkd_sdiv = supplierBranchesIdentifier.id;
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

      try {
        await registrationPayloadSchema.validate(contractRegisterPayload, {
          abortEarly: false,
        });
      } catch (validationError) {
        const errors = validationError.inner.map((error: yup.ValidationError) => ({
          code: 'ER-3.11.2.9',
          description: `Не удалось получить любой из необходимых атрибутов внутри релиза: ${error.message}${
            error.value !== undefined ? `. Value is - ${error.value}` : ''
          }`,
        }));

        await errorsHandler.catchError(JSON.stringify(messageData), errors);
        return;
      }

      return contractRegisterPayload;
    } catch (error) {
      await errorsHandler.catchError(JSON.stringify(messageData), [
        {
          code: 'ER-3.11.2.9',
          description: `Не удалось получить любой из необходимых атрибутов внутри релиза: ${error.stack}`,
        },
      ]);
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
