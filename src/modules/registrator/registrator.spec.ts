import logger from '../../lib/logger';
import db from '../../lib/dataBase';
import { InConsumer, OutProducer } from '../../lib/kafka';

import { fetchContractRegister, fetchEntityRecord } from '../../api';

import { dbConfig } from '../../configs';

import { ITreasuryRequestsRow } from '../../types/db';
import { IRelease } from '../../types/entity';
import { findOrganizationFromRole } from '../../utils';

import Registrator from './index';

jest.mock('lib/logger');
jest.mock('lib/dataBase');
jest.mock('lib/kafka');
jest.mock('api', () => ({
  fetchContractRegister: jest.fn(),
  fetchEntityRecord: jest.fn()
}));
jest.mock('utils', () => ({
  findOrganizationFromRole: jest.fn()
}));

describe('[Unit] Registrator', () => {
  let sut: Registrator;

  beforeEach(async () => {
    sut = new Registrator(3);
  });

  describe('Contracts registration in treasury', () => {
    describe('No unregistered contracts present', () => {
      beforeEach(async () => {
        (db.getNotRegistereds as jest.Mock).mockResolvedValue([]);
        await sut.start();
      });

      it('Should not iterate if there are no unregistered contracts is database', async () => {
        expect(fetchContractRegister).not.toHaveBeenCalled();
      });
    });

    describe('Unregistered contracts present', () => {
      let notRegistereds: ITreasuryRequestsRow[];
      let contract: ITreasuryRequestsRow;

      beforeEach(async () => {
        contract = {
          id_doc: 'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
          message: {
            header: {
              id_dok: 'string',
              nr_dok: 'string',
              da_dok: 'string',

              suma: 1488,
              kd_val: 'string',

              pkd_fisk: 'string',
              pname: 'string',

              bkd_fisk: 'string',
              bname: 'string',

              desc: 'string',

              achiz_nom: 'string',
              achiz_date: 'string',

              da_expire: 'string',
              c_link: 'string'
            },
            benef: [
              {
                id_dok: 'string',
                bbic: 'string',
                biban: 'string'
              }
            ],
            details: [
              {
                id_dok: 'string',
                suma: 1488,
                piban: 'string',
                byear: 228
              }
            ]
          }
        };
        notRegistereds = [contract];

        (db.getNotRegistereds as jest.Mock).mockResolvedValue(notRegistereds);
      });

      describe('Response from the treasury present', () => {
        beforeEach(() => {
          (fetchContractRegister as jest.Mock).mockResolvedValue({
            id_dok: contract.id_doc,
            num_row: '1'
          });
        });

        it('Should register each contract', async () => {
          await sut.start();

          expect(fetchContractRegister).toHaveBeenCalledTimes(notRegistereds.length);
          expect(fetchContractRegister).toHaveBeenCalledWith(contract.message);
        });

        describe('Fetch contract validation', () => {
          it('Should stop contract registration if registration failed', async () => {
            (fetchContractRegister as jest.Mock).mockImplementation(
              async () =>
                new Promise((resolve, reject) => {
                  reject(new Error());
                })
            );

            await sut.start();

            expect(db.isExist).not.toHaveBeenCalled();
          });

          it('Should stop contract registration if the treasury sent wrong contractId', async () => {
            (fetchContractRegister as jest.Mock).mockResolvedValue({
              id_dok: 'wrong_id',
              num_row: '1'
            });

            await sut.start();

            expect(db.isExist).not.toHaveBeenCalled();
          });

          it('Should stop contract registration if registration did not happen', async () => {
            (fetchContractRegister as jest.Mock).mockResolvedValue(undefined);

            await sut.start();

            expect(db.isExist).not.toHaveBeenCalled();
          });
        });

        describe('Check contract existance in database', () => {
          it('Should check if contracts exists in database', async () => {
            await sut.start();

            expect(db.isExist).toHaveBeenCalledWith(dbConfig.tables.responses, {
              field: 'id_doc',
              value: contract.id_doc
            });
          });

          describe('Contract timestamp update', () => {
            describe('When contract exists in database', () => {
              beforeEach(() => {
                (db.isExist as jest.Mock).mockReturnValue({ exists: true });
              });

              it("Should update contract's timestamp", async () => {
                await sut.start();

                expect(db.updateRow).toHaveBeenCalledWith({
                  table: dbConfig.tables.treasuryRequests,
                  contractId: contract.id_doc,
                  columns: {
                    ts: expect.any(Number)
                  }
                });
              });

              it('Should terminate registration when timestamp already exists', async () => {
                (db.updateRow as jest.Mock).mockResolvedValue({ rowCount: 2 });

                await sut.start();

                expect(logger.error).toHaveBeenCalledWith(
                  `🗙 Error in REGISTRATOR. Contract exists: Failed to update timestamp in treasuryRequests table for id_doc ${contract.id_doc}.`
                );
              });
            });

            describe('When contract does not exist in database', () => {
              beforeEach(() => {
                (db.isExist as jest.Mock).mockReturnValue({ exists: false });
              });

              it('Should insert contract to database first', async () => {
                await sut.start();

                expect(db.insertToResponses).toHaveBeenCalled();
              });

              it("Should still update contract's timestamp", async () => {
                await sut.start();

                expect(db.updateRow).toHaveBeenCalledWith({
                  table: dbConfig.tables.treasuryRequests,
                  contractId: contract.id_doc,
                  columns: {
                    ts: expect.any(Number)
                  }
                });
              });

              it('Should terminate registration when timestamp already exists', async () => {
                (db.updateRow as jest.Mock).mockResolvedValue({ rowCount: 2 });

                await sut.start();

                // TODO: throw errors on each failed validation step
                expect(logger.error).toHaveBeenCalledWith(
                  `🗙 Error in REGISTRATOR. Contract does not exist: Failed to update timestamp in treasuryRequests table for id_doc ${contract.id_doc}.`
                );
              });
            });
          });
        });

        it('Should send message to kafka when registration done', async () => {
          (db.isExist as jest.Mock).mockReturnValue({ exists: true });
          (db.updateRow as jest.Mock).mockResolvedValue({ rowCount: 1 });

          await sut.start();

          expect(OutProducer.send).toHaveBeenCalledTimes(notRegistereds.length);
          expect(OutProducer.send).toHaveBeenCalledWith(
            [
              {
                topic: expect.any(String),
                messages: expect.any(String)
              }
            ],
            expect.any(Function)
          );
        });
      });

      describe('No response from the treasury', () => {
        beforeEach(() => {
          (fetchContractRegister as jest.Mock).mockReturnValue(undefined);
          db.isExist = jest.fn();
        });

        it('Should break iteration', () => {
          expect(db.isExist).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('Saving contract for registration', () => {
    interface Message {
      topic: string;
      value: {
        command: string;
        id: string;
        data: {
          ocid: string;
          cpid: string;
          treasuryBudgetSources: {
            budgetBreakdownID: string;
            budgetIBAN: string;
            amount: number;
          }[];
        };
        context: {
          country: string;
          startDate: string;
        };
      };
    }

    let message: Message;
    let callback: Function;
    let value: string;

    describe('When kafka message command is sendAcForVerification', () => {
      const acRelease: IRelease = {
        planning: {
          implementation: {
            transactions: [
              {
                id: 'transactionId',
                type: 'advance',
                value: {
                  amount: 228,
                  currency: 'EUR'
                },
                executionPeriod: {
                  durationInDays: 1
                },
                relatedContractMilestone: 'contractMilestone'
              }
            ]
          },
          budget: {
            description: 'budget',
            budgetAllocation: [
              {
                budgetBreakdownID: 'bbid',
                amount: 2,
                period: {
                  startDate: '11241241',
                  endDate: '2'
                },
                relatedItem: 'item'
              }
            ],
            budgetSource: [
              {
                budgetBreakdownID: 'id',
                amount: 2,
                currency: 'EUR'
              }
            ]
          }
        },
        contracts: [
          {
            id: 'contractId',
            date: '14-08-88',
            awardId: 'awardId',
            title: 'contract title',
            description: 'contract description',
            status: 'contract status',
            statusDetails: 'status details',
            documents: [
              {
                id: 'documentId',
                documentType: 'contractSigned',
                url: '1',
                datePublished: '14-08-88'
              }
            ],
            period: {
              startDate: '1',
              endDate: '2'
            },
            value: {
              amount: 2,
              currency: 'EUR',
              amountNet: 2,
              valueAddedTaxIncluded: true
            }
          }
        ],
        parties: [
          {
            id: 'partyId',
            name: 'party',
            identifier: {
              scheme: 'scheme',
              id: 'id',
              legalName: 'name'
            },
            additionalIdentifiers: [
              {
                scheme: 'MD-BRANCHES',
                id: 'id',
                legalName: 'name'
              }
            ],
            details: {
              bankAccounts: [
                {
                  description: 'string',
                  bankName: 'string',
                  identifier: {
                    scheme: 'string',
                    id: 'string'
                  },
                  accountIdentification: {
                    scheme: 'string',
                    id: 'string'
                  }
                }
              ]
            },
            roles: ['buyer']
          },
          {
            id: 'partyId',
            name: 'party',
            identifier: {
              scheme: 'scheme',
              id: 'id',
              legalName: 'name'
            },
            additionalIdentifiers: [
              {
                scheme: 'MD-BRANCHES',
                id: 'id',
                legalName: 'name'
              }
            ],
            details: {
              bankAccounts: [
                {
                  description: 'string',
                  bankName: 'string',
                  identifier: {
                    scheme: 'string',
                    id: 'string'
                  },
                  accountIdentification: {
                    scheme: 'string',
                    id: 'string'
                  }
                }
              ]
            },
            roles: ['supplier']
          }
        ],
        relatedProcesses: [
          {
            id: 'id',
            scheme: 'scheme',
            identifier: 'tender-ocid',
            uri: 'uri',
            relationship: ['x_evaluation']
          }
        ]
      };
      const { parties } = acRelease;

      beforeEach(() => {
        message = {
          topic: '',
          value: {
            command: 'sendAcForVerification',
            id: 'message-id',
            data: {
              ocid: 'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
              cpid: 'ocds-b3wdp1-MD-1540363926212',
              treasuryBudgetSources: [
                {
                  budgetBreakdownID: 'bbid',
                  budgetIBAN: 'string',
                  amount: 1
                }
              ]
            },
            context: {
              country: 'string',
              startDate: 'string'
            }
          }
        };
      });

      describe('Check contract existance in database', () => {
        beforeEach(async () => {
          (db.isExist as jest.Mock).mockImplementation(async () => ({
            exists: true
          }));

          await sut.start();
          callback = (InConsumer.on as jest.Mock).mock.calls[0][1];
          value = JSON.stringify(message.value);

          await callback({ topic: message.topic, value });
        });

        it('Should check if contract exists in database', () => {
          expect(db.isExist).toHaveBeenCalled();
          expect(db.isExist).toHaveBeenCalledWith(dbConfig.tables.requests, {
            field: 'cmd_id',
            value: message.value.id
          });
        });

        it('Should log warning if contract exists', () => {
          expect(logger.warn).toHaveBeenCalled();
          expect(logger.warn).toHaveBeenCalledWith(
            `! Warning in REGISTRATOR. Contract ${message.value.data.ocid} being saved for registration already exists in request table.`
          );
        });
      });

      describe('Registration payload generation', () => {
        beforeEach(async () => {
          await sut.start();
          callback = (InConsumer.on as jest.Mock).mock.calls[0][1];
          value = JSON.stringify(message.value);

          (db.isExist as jest.Mock).mockResolvedValue({ exists: false });

          await callback({ topic: message.topic, value });
        });

        describe('AC record fetching', () => {
          it('Should fetch AC record', () => {
            expect(fetchEntityRecord).toHaveBeenCalled();
            expect(fetchEntityRecord).toHaveBeenCalledWith(message.value.data.cpid, message.value.data.ocid);
          });

          describe('When fetch returns undefined', () => {
            beforeEach(() => {
              (fetchEntityRecord as jest.Mock).mockResolvedValue(undefined);
            });

            it('Should log error', () => {
              expect(logger.error).toHaveBeenCalled();
              expect(logger.error).toHaveBeenCalledWith(
                `🗙 Error in REGISTRATOR. Failed to generate contract register payload for - ${message.value.data.ocid}`
              );
            });

            it('Should terminate generation', async () => {
              expect(await callback({ ...message, value })).toBeUndefined();
            });
          });

          describe('When fetch returns AC record', () => {
            beforeEach(() => {
              (fetchEntityRecord as jest.Mock).mockResolvedValue({
                releases: [acRelease],
                publishedDate: '12412412'
              });
            });

            it('Should fetch tender record', async () => {
              expect(fetchEntityRecord).toBeCalled();
              expect(fetchEntityRecord).toBeCalledWith(message.value.data.cpid, message.value.data.ocid);
            });

            describe('Organizations search', () => {
              it('Should look for buyer', () => {
                expect(findOrganizationFromRole).toHaveBeenCalled();
                expect(findOrganizationFromRole).toHaveBeenNthCalledWith(1, parties, 'buyer');
              });

              it('Should look for supplier', () => {
                expect(findOrganizationFromRole).toHaveBeenCalled();
                expect(findOrganizationFromRole).toHaveBeenNthCalledWith(2, parties, 'supplier');
              });
            });
          });
        });
      });

      describe('Insertion to requests', () => {
        beforeEach(async () => {
          (fetchEntityRecord as jest.Mock).mockResolvedValue({
            releases: [acRelease],
            publishedDate: '12412412'
          });

          (findOrganizationFromRole as jest.Mock).mockReturnValue({
            identifier: {
              id: 'id',
              legalName: 'legalName'
            }
          });

          await sut.start();
          callback = (InConsumer.on as jest.Mock).mock.calls[0][1];
          value = JSON.stringify(message.value);

          await callback({ topic: message.topic, value });
        });

        it('Should insert message to requests', () => {
          expect(db.insertToRequests).toHaveBeenCalled();
          expect(db.insertToRequests).toHaveBeenCalledWith({
            cmd_id: message.value.id,
            cmd_name: message.value.command,
            message: message.value,
            ts: expect.any(Number)
          });
        });

        it('Should insert message to treasury requests', () => {
          (db.insertToRequests as jest.Mock).mockResolvedValue(true);

          expect(db.insertToTreasuryRequests).toHaveBeenCalled();
          expect(db.insertToTreasuryRequests).toHaveBeenCalledWith({
            id_doc: expect.any(String),
            message: expect.any(Object)
          });
        });
      });
    });

    describe('When kafka message command is not sendAcForVerification', () => {
      beforeEach(async () => {
        message = {
          topic: '',
          value: {
            command: 'dontSendAcForVerification',
            id: 'message-id',
            data: {
              ocid: 'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
              cpid: 'ocds-b3wdp1-MD-1540363926212',
              treasuryBudgetSources: [
                {
                  budgetBreakdownID: 'bbid',
                  budgetIBAN: 'string',
                  amount: 1
                }
              ]
            },
            context: {
              country: 'string',
              startDate: 'string'
            }
          }
        };

        await sut.start();
      });

      it('Should terminate saving', async () => {
        callback = (InConsumer.on as jest.Mock).mock.calls[0][1];

        expect(await callback(JSON.stringify(message))).toBeUndefined();
      });
    });
  });
});
