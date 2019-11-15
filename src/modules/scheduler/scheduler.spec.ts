import { dbConfig, kafkaOutProducerConfig } from 'configs';
import { OutProducer } from 'lib/kafka';
import Scheduler from 'modules/scheduler';
import db from 'lib/dataBase';
import logger from 'lib/logger';
import { fetchContractCommit, fetchContractsQueue } from 'api';
import { IResponsesRow, ITreasuryResponsesRow } from 'types/db';
import { IOut } from 'types/messages';
import { ITreasuryContract, TStatusCode } from 'types/treasury';

jest.mock('lib/dataBase');
jest.mock('lib/logger');
jest.mock('lib/kafka');
jest.mock('api', () => ({
  fetchContractCommit: jest.fn(),
  fetchContractsQueue: jest.fn()
}));

describe('Scheduler', () => {
  let sut: Scheduler;
  const contract: ITreasuryResponsesRow = {
    id_doc: 'doc-id',
    status_code: '3004',
    message: {
      id_dok: 'message-doc-id',
      id_hist: 'message-hist-id',
      status: '3004',
      st_date: '1400-94-94',
      reg_nom: '124124124',
      reg_date: '1240-24-42',
      descr: 'message description'
    },
    ts_in: Date.now()
  };
  const contractsLength = 1;

  beforeEach(() => {
    sut = new Scheduler(3);
  });

  describe('Commiting not commited contracts', () => {
    it('Should commit after run', async () => {
      await sut.start();

      expect(db.getNotCommitteds).toHaveBeenCalled();
    });

    describe('When database responds', () => {
      describe('When response is an empty array', () => {
        it('Should not iterate', async () => {
          (db.getNotCommitteds as jest.Mock).mockResolvedValue([]);

          await sut.start();

          expect(fetchContractCommit).not.toHaveBeenCalled();
        });
      });

      describe('When response is an array of treasury responses', () => {
        beforeEach(() => {
          (db.getNotCommitteds as jest.Mock).mockResolvedValue([contract]);
        });

        describe('Contract commission', () => {
          it('Should fetch contract commission', async () => {
            await sut.start();

            expect(fetchContractCommit).toHaveBeenCalledTimes(contractsLength);
            expect(fetchContractCommit).toHaveBeenCalledWith(contract.id_doc);
          });

          describe('When fetch response is undefined', () => {
            it('Should return', async () => {
              (fetchContractCommit as jest.Mock).mockResolvedValue(undefined);

              await sut.start();

              expect(db.updateRow).not.toHaveBeenCalled();
            });
          });

          describe('When fetch response fails', () => {
            it('Should log error', async () => {
              (fetchContractCommit as jest.Mock).mockImplementation(async () =>
                Promise.reject()
              );

              await sut.start();

              expect(logger.error).toHaveBeenCalled();
            });
          });

          describe('When fetch response is valid', () => {
            beforeEach(() => {
              (fetchContractCommit as jest.Mock).mockResolvedValue(true);
            });

            it('Should update row in database', async () => {
              await sut.start();

              expect(db.updateRow).toHaveBeenCalled();
              expect(db.updateRow).toHaveBeenCalledWith({
                table: dbConfig.tables.treasuryResponses,
                contractId: contract.id_doc,
                columns: {
                  ts_commit: expect.any(Number)
                }
              });
            });

            describe('When timestamp is successfully filled', () => {
              beforeEach(() => {
                (db.updateRow as jest.Mock).mockResolvedValue({
                  rowCount: 1
                });
              });

              it('Should log success', async () => {
                await sut.start();

                expect(logger.info).toHaveBeenCalled();
                expect(logger.info).toHaveBeenCalledWith(
                  `✔ Contract with id - ${
                    contract.id_doc
                  } was removed from queue with statusCode - ${3004}`
                );
              });
            });

            describe('When timestamp is already filled', () => {
              it('Should log error', async () => {
                (db.updateRow as jest.Mock).mockResolvedValue({
                  rowCount: 2
                });

                await sut.start();

                expect(logger.error).toHaveBeenCalled();
                expect(logger.error).toHaveBeenCalledWith(
                  `🗙 Error in SCHEDULER. commitContract: Can't update timestamp in treasuryResponses table for id_doc ${contract.id_doc}. Seem to be column timestamp already filled`
                );
              });
            });

            describe('When call to database fails', () => {
              it('Should log error', async () => {
                (db.updateRow as jest.Mock).mockImplementation(async () =>
                  Promise.reject()
                );

                await sut.start();

                expect(logger.error).toHaveBeenCalled();
              });
            });
          });
        });
      });
    });

    describe('When database does not respond', () => {
      it('Should log error and not iterate', async () => {
        (db.getNotCommitteds as jest.Mock).mockImplementation(async () =>
          Promise.reject()
        );

        await sut.start();

        expect(logger.error).toHaveBeenCalled();
        expect(fetchContractCommit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Sending not sent responses', () => {
    const notSent: IResponsesRow = {
      id_doc: 'not-sent-id',
      cmd_id: 'not-sent-cmd',
      cmd_name: 'launchAcVerification',
      message: {
        id: 'message-id',
        command: 'launchAcVerification',
        data: {
          cpid: 'data-cpid',
          ocid: 'data-ocid'
        },
        version: '0.0.1'
      }
    };
    const notSentLength = 1;

    beforeEach(() => {
      (db.getNotCommitteds as jest.Mock).mockResolvedValue([contract]);
      (fetchContractCommit as jest.Mock).mockResolvedValue(true);
    });

    it('Should get not sent messages', async () => {
      (db.updateRow as jest.Mock).mockResolvedValueOnce({
        rowCount: 1
      });

      await sut.start();

      expect(db.getNotSentMessages).toHaveBeenCalled();
      expect(db.getNotSentMessages).toHaveBeenCalledWith({
        launch: false
      });
    });

    describe('When database responds with not sent messages', () => {
      beforeEach(() => {
        (db.getNotSentMessages as jest.Mock).mockResolvedValue([notSent]);
      });

      it('Should send response for every not sent message', async () => {
        (db.updateRow as jest.Mock).mockResolvedValueOnce({
          rowCount: 1
        });

        await sut.start();

        expect(OutProducer.send).toHaveBeenCalledTimes(notSentLength);
        expect(OutProducer.send).toHaveBeenCalledWith(
          [
            {
              topic: kafkaOutProducerConfig.outTopic,
              messages: JSON.stringify(notSent.message)
            }
          ],
          expect.any(Function)
        );
      });

      it('Should log error if OutProducer fails to send a message', async () => {
        (db.updateRow as jest.Mock).mockResolvedValueOnce({
          rowCount: 1
        });

        const error = new Error('Error in callback');

        await sut.start();

        const outCallback = (OutProducer.send as jest.Mock).mock.calls[0][1];
        await outCallback(error);

        expect(logger.error).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          `🗙 Error in SCHEDULER. sendResponse - producer: `,
          error
        );
      });

      describe('Adding contract timestamp', () => {
        it('Should add contract timestamp while sending a message', async () => {
          (db.updateRow as jest.Mock).mockResolvedValue({
            rowCount: 1
          });

          await sut.start();

          const outCallback = (OutProducer.send as jest.Mock).mock.calls[0][1];
          await outCallback();

          expect(db.updateRow).toHaveBeenCalled();
          expect(db.updateRow).toHaveBeenNthCalledWith(2, {
            table: dbConfig.tables.responses,
            contractId: notSent.id_doc,
            columns: {
              ts: expect.any(Number)
            }
          });
        });

        describe('When database request fails', () => {
          it('Should log error', async () => {
            (db.updateRow as jest.Mock)
              .mockResolvedValueOnce({
                rowCount: 1
              })
              .mockResolvedValueOnce({
                rowCount: 2
              });

            await sut.start();

            const outCallback = (OutProducer.send as jest.Mock).mock
              .calls[0][1];
            await outCallback();

            expect(logger.error).toHaveBeenCalled();
          });
        });

        describe('When timestamp already exists', () => {
          it('Should log error', async () => {
            (db.updateRow as jest.Mock)
              .mockResolvedValueOnce({
                rowCount: 1
              })
              .mockResolvedValueOnce({
                rowCount: 2
              });

            await sut.start();

            const outCallback = (OutProducer.send as jest.Mock).mock
              .calls[0][1];
            await outCallback();

            expect(logger.error).toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              `🗙 Error in SCHEDULER. sendResponse - producer: Can't update timestamp in responses table for id_doc ${notSent.id_doc}. Seem to be column timestamp already filled`
            );
          });
        });
      });
    });

    describe('When response is an empty array', () => {
      it('Should not iterate', async () => {
        (db.getNotSentMessages as jest.Mock).mockResolvedValue([]);

        await sut.start();

        expect(OutProducer.send).not.toHaveBeenCalled();
      });
    });

    describe('When request to database fails', () => {
      it('Should log error and not iterate', async () => {
        (db.getNotSentMessages as jest.Mock).mockImplementation(async () =>
          Promise.reject()
        );

        await sut.start();

        expect(logger.error).toHaveBeenCalled();
        expect(OutProducer.send).not.toHaveBeenCalled();
      });
    });
  });

  describe('Contracts processing', () => {
    let queueContract = (
      statusCode: TStatusCode = '3004'
    ): ITreasuryContract => ({
      id_dok:
        'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
      id_hist: 'string',
      status: statusCode,
      st_date: 'string',
      reg_nom: 'string',
      reg_date: 'string',
      descr: 'string'
    });

    beforeEach(() => {
      (db.getNotCommitteds as jest.Mock).mockResolvedValue([contract]);
      (fetchContractCommit as jest.Mock).mockResolvedValue(true);
      (db.updateRow as jest.Mock).mockResolvedValue({
        rowCount: 1
      });
      (db.getNotSentMessages as jest.Mock).mockResolvedValue([]);
    });

    describe('Fetching contracts queue', () => {
      it('Should fetch contracts for each queue', async () => {
        await sut.start();

        expect(fetchContractsQueue).toHaveBeenCalledTimes(3);
      });

      describe('When contracts queue response has contracts', () => {
        beforeEach(() => {
          (fetchContractsQueue as jest.Mock).mockResolvedValue({
            contract: [
              queueContract('3004'),
              queueContract('3005'),
              queueContract('3006')
            ]
          });
        });

        describe('When contract status is not equal to corresponding status code', () => {
          it('Should log error', async () => {
            queueContract().status = '3007' as TStatusCode;

            await sut.start();

            expect(logger.error).toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              '🗙 Error in SCHEDULER. treasuryContract.status not equal verifiable statusCode'
            );
          });
        });

        describe('Contract id validation', () => {
          describe('When contract id matches the pattern', () => {
            describe('Contract existance in database', () => {
              it('Should check contract existance in database', async () => {
                await sut.start();

                expect(db.isExist).toHaveBeenCalled();
              });

              describe('When contract does exist', () => {
                beforeEach(() => {
                  (db.isExist as jest.Mock).mockResolvedValue({
                    exists: true
                  });
                });

                it('Should insert it to treasure responses', async () => {
                  await sut.start();

                  expect(db.insertToTreasureResponses).toHaveBeenCalled();
                  expect(db.insertToTreasureResponses).toHaveBeenCalledWith({
                    id_doc: queueContract().id_dok,
                    status_code: queueContract().status,
                    message: queueContract(),
                    ts_in: expect.any(Number)
                  });
                });

                describe('Contract commission', () => {
                  it('Should fetch contract commission', async () => {
                    await sut.start();

                    expect(fetchContractCommit).toHaveBeenCalled();
                    expect(fetchContractCommit).toHaveBeenCalledWith(
                      queueContract().id_dok
                    );
                  });

                  describe('Kafka message generation and insertion to responses', () => {
                    const kafkaMessageOut: IOut = {
                      id: expect.any(String),
                      data: {
                        cpid: 'ocds-b3wdp1-MD-1540363926212',
                        ocid: 'ocds-b3wdp1-MD-1540363926212-AC-1543432597294',
                        verification: {
                          rationale: 'string'
                        },
                        dateMet: 'string'
                      },
                      version: '0.0.1'
                    } as IOut;

                    beforeEach(() => {
                      (fetchContractCommit as jest.Mock).mockResolvedValue(
                        true
                      );
                    });

                    it('Should generate proper kafka message out for status code 3004', async () => {
                      queueContract = (): ITreasuryContract =>
                        ({
                          id_dok:
                            'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
                          id_hist: 'string',
                          status: '3004',
                          st_date: 'string',
                          reg_nom: 'string',
                          reg_date: 'string',
                          descr: 'string'
                        } as ITreasuryContract);

                      (fetchContractsQueue as jest.Mock).mockResolvedValue({
                        contract: [queueContract()]
                      });

                      kafkaMessageOut.command = 'treasuryApprovingAc';
                      kafkaMessageOut.data.verification = {
                        value: '3004',
                        rationale: 'string'
                      };

                      await sut.start();

                      expect(db.insertToResponses).toHaveBeenCalled();
                      expect(db.insertToResponses).toHaveBeenCalledWith({
                        id_doc: queueContract().id_dok,
                        cmd_id: expect.any(String),
                        cmd_name: kafkaMessageOut.command,
                        message: kafkaMessageOut
                      });
                    });

                    it('Should generate proper kafka message out for status code 3005', async () => {
                      queueContract = (): ITreasuryContract =>
                        ({
                          id_dok:
                            'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
                          id_hist: 'string',
                          status: '3005',
                          st_date: 'string',
                          reg_nom: 'string',
                          reg_date: 'string',
                          descr: 'string'
                        } as ITreasuryContract);

                      (fetchContractsQueue as jest.Mock).mockResolvedValue({
                        contract: [queueContract()]
                      });

                      kafkaMessageOut.command = 'requestForAcClarification';
                      kafkaMessageOut.data.verification = {
                        value: '3005',
                        rationale: 'string'
                      };
                      kafkaMessageOut.data.regData = {
                        externalRegId: queueContract().reg_nom,
                        regDate: queueContract().reg_date
                      };

                      await sut.start();

                      expect(db.insertToResponses).toHaveBeenCalled();
                      expect(db.insertToResponses).toHaveBeenCalledWith({
                        id_doc: queueContract().id_dok,
                        cmd_id: expect.any(String),
                        cmd_name: kafkaMessageOut.command,
                        message: kafkaMessageOut
                      });
                    });

                    it('Should generate proper kafka message out for status code 3006', async () => {
                      queueContract = (): ITreasuryContract =>
                        ({
                          id_dok:
                            'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
                          id_hist: 'string',
                          status: '3006',
                          st_date: 'string',
                          reg_nom: 'string',
                          reg_date: 'string',
                          descr: 'string'
                        } as ITreasuryContract);

                      (fetchContractsQueue as jest.Mock).mockResolvedValue({
                        contract: [queueContract()]
                      });

                      kafkaMessageOut.command = 'processAcRejection';
                      kafkaMessageOut.data.regData = undefined;
                      kafkaMessageOut.data.verification = {
                        value: '3006',
                        rationale: 'string'
                      };

                      await sut.start();

                      expect(db.insertToResponses).toHaveBeenCalled();
                      expect(db.insertToResponses).toHaveBeenCalledWith({
                        id_doc: queueContract().id_dok,
                        cmd_id: expect.any(String),
                        cmd_name: kafkaMessageOut.command,
                        message: kafkaMessageOut
                      });
                    });
                  });

                  describe('When contract commission fails', () => {
                    it('Should not generate kafka message out and insert to responses', async () => {
                      (fetchContractCommit as jest.Mock).mockResolvedValue(
                        undefined
                      );

                      await sut.start();

                      expect(db.insertToResponses).not.toHaveBeenCalled();
                    });
                  });

                  describe('Commission process', () => {
                    describe('When fetch response is valid', () => {
                      beforeEach(() => {
                        (fetchContractCommit as jest.Mock).mockResolvedValue(
                          true
                        );
                      });

                      it('Should update row in database', async () => {
                        await sut.start();

                        expect(db.updateRow).toHaveBeenCalled();
                        expect(db.updateRow).toHaveBeenCalledWith({
                          table: dbConfig.tables.treasuryResponses,
                          contractId: queueContract().id_dok,
                          columns: {
                            ts_commit: expect.any(Number)
                          }
                        });
                      });

                      describe('When timestamp is already filled', () => {
                        it('Should log error', async () => {
                          (db.updateRow as jest.Mock).mockResolvedValue({
                            rowCount: 2
                          });

                          await sut.start();

                          expect(logger.error).toHaveBeenCalled();
                          expect(logger.error).toHaveBeenCalledWith(
                            `🗙 Error in SCHEDULER. commitContract: Can't update timestamp in treasuryResponses table for id_doc ${
                              queueContract().id_dok
                            }. Seem to be column timestamp already filled`
                          );
                        });
                      });

                      describe('When call to database fails', () => {
                        it('Should log error', async () => {
                          (db.updateRow as jest.Mock).mockImplementation(
                            async () => Promise.reject()
                          );

                          await sut.start();

                          expect(logger.error).toHaveBeenCalled();
                        });
                      });
                    });

                    describe('When fetch response is undefined', () => {
                      it('Should return', async () => {
                        (fetchContractCommit as jest.Mock).mockResolvedValue(
                          undefined
                        );

                        await sut.start();

                        expect(db.updateRow).not.toHaveBeenCalled();
                      });
                    });

                    describe('When fetch response fails', () => {
                      it('Should log error', async () => {
                        (fetchContractCommit as jest.Mock).mockImplementation(
                          async () => Promise.reject()
                        );

                        await sut.start();

                        expect(logger.error).toHaveBeenCalled();
                      });
                    });
                  });
                });

                describe('When status code is 3005', () => {
                  describe('When reg_nom is undefined', () => {
                    it('Should log error', async () => {
                      queueContract = (): ITreasuryContract =>
                        ({
                          id_dok:
                            'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
                          id_hist: 'string',
                          status: '3005',
                          st_date: 'string',
                          reg_date: 'string',
                          descr: 'string'
                        } as ITreasuryContract);

                      (fetchContractsQueue as jest.Mock).mockResolvedValue({
                        contract: [queueContract()]
                      });

                      await sut.start();

                      expect(logger.error).toHaveBeenCalled();
                      expect(logger.error).toHaveBeenCalledWith(
                        `🗙 Error in SCHEDULER. Contract in queue 3005 with id ${
                          queueContract().id_dok
                        } hasn't reg_nom OR reg_date fields`
                      );
                    });
                  });

                  describe('When reg_date is undefined', () => {
                    it('Should log error', async () => {
                      queueContract = (): ITreasuryContract =>
                        ({
                          id_dok:
                            'ocds-b3wdp1-MD-1540363926212-AC-1543432597294-2018-11-21T06:12:46Z',
                          id_hist: 'string',
                          status: '3005',
                          st_date: 'string',
                          reg_nom: 'string',
                          descr: 'string'
                        } as ITreasuryContract);

                      (fetchContractsQueue as jest.Mock).mockResolvedValue({
                        contract: [queueContract()]
                      });

                      await sut.start();

                      expect(logger.error).toHaveBeenCalled();
                      expect(logger.error).toHaveBeenCalledWith(
                        `🗙 Error in SCHEDULER. Contract in queue 3005 with id ${
                          queueContract().id_dok
                        } hasn't reg_nom OR reg_date fields`
                      );
                    });
                  });
                });
              });

              describe('When contract does not exist', () => {
                it('Should return', async () => {
                  (db.isExist as jest.Mock).mockResolvedValue({
                    exists: false
                  });

                  await sut.start();

                  expect(db.insertToTreasureResponses).not.toHaveBeenCalled();
                });
              });

              describe('When database does not respond', () => {
                it('Should log error', async () => {
                  const error = new Error('db does not respond');
                  (db.isExist as jest.Mock).mockImplementation(async () =>
                    Promise.reject(error)
                  );

                  await sut.start();

                  expect(logger.error).toHaveBeenCalled();
                  expect(logger.error).toHaveBeenCalledWith(
                    '🗙 Error in SCHEDULER. doContractProcessing: ',
                    error
                  );
                });
              });
            });
          });

          describe('When contract id does not match predefined pattern', () => {
            it('Should return', async () => {
              queueContract = (
                statusCode: TStatusCode = '3004'
              ): ITreasuryContract => ({
                id_dok: 'notValidId',
                id_hist: 'string',
                status: statusCode,
                st_date: 'string',
                reg_nom: 'string',
                reg_date: 'string',
                descr: 'string'
              });

              (fetchContractsQueue as jest.Mock).mockResolvedValue({
                contract: [queueContract()]
              });

              await sut.start();

              expect(db.isExist).not.toHaveBeenCalled();
              expect(logger.error).toHaveBeenCalled();
              expect(logger.error).toHaveBeenCalledWith(
                '🗙 Error in SCHEDULER. treasuryContract.status not equal verifiable statusCode'
              );
            });
          });
        });

        describe('When contracts queue fetching fails', () => {
          it('Should stop processing', async () => {
            const error = new Error('error in fetching queue');

            (fetchContractsQueue as jest.Mock).mockImplementation(async () =>
              Promise.reject(error)
            );

            await sut.start();

            expect(logger.error).toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              '🗙 Error in SCHEDULER. run: ',
              error
            );
          });
        });

        describe('When contracts queue response is undefined', () => {
          it('Should continue iteration', async () => {
            (fetchContractsQueue as jest.Mock)
              .mockResolvedValue({ contract: queueContract() })
              .mockResolvedValueOnce(undefined);

            await sut.start();

            expect(logger.error).toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              '🗙 Error in SCHEDULER. treasuryContract.status not equal verifiable statusCode'
            );
          });
        });

        describe('When contracts queue response does not have contracts', () => {
          it('Should continue iteration', async () => {
            (fetchContractsQueue as jest.Mock)
              .mockResolvedValue({ contract: undefined })
              .mockResolvedValueOnce(undefined);

            await sut.start();

            expect(logger.info).toHaveBeenCalled();
            expect(logger.info).toHaveBeenNthCalledWith(
              3,
              `✔ Last sync at - ${new Date().toUTCString().toString()}`
            );
          });
        });
      });
    });
  });

  it('Should log last sync', async () => {
    await sut.start();

    expect(logger.info).toHaveBeenLastCalledWith(
      `✔ Last sync at - ${new Date().toUTCString().toString()}`
    );
  });
});
