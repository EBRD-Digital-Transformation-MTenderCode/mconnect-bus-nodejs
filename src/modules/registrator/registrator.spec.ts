import logger from 'lib/logger';
import db from 'lib/dataBase';
import { OutProducer } from 'lib/kafka';

import { fetchContractRegister } from 'api';

import { dbConfig } from 'configs';

import { ITreasuryRequestsRow } from 'types/db';

import Registrator from './index';

jest.mock('lib/logger');
jest.mock('lib/dataBase');
jest.mock('lib/kafka');
jest.mock('api', () => ({
  fetchContractRegister: jest.fn()
}));

describe('Registrator', () => {
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
          id_doc:
            'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
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

          expect(fetchContractRegister).toHaveBeenCalledTimes(
            notRegistereds.length
          );
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
                  `🗙 Error in REGISTRATOR. Contract exists: Failed to update timestamp in treasuryRequests table for id_doc ${contract.id_doc}. Column timestamp seems to be already filled.`
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
                  `🗙 Error in REGISTRATOR. Contract does not exist: Failed to update timestamp in treasuryRequests table for id_doc ${contract.id_doc}. Column timestamp seems to be already filled.`
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
    describe('When kafka message command is sendAcForVerification', () => {});

    describe('When kafka message command is not sendAcForVerification', () => {});
  });
});
