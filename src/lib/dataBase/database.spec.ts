import { IRequestsRow, IResponsesRow, ITreasuryRequestsRow, ITreasuryResponsesRow } from 'types/db';
import { IIn, IOut, TCommandName } from 'types/messages';
import { tsToPgTs } from 'utils';
import db from './index';

describe('[Integration] Database', () => {
  enum Table {
    Requests = 'requests',
    Responses = 'responses',
    TreasuryRequests = 'treasury_requests',
    TreasuryResponses = 'treasury_responses'
  }

  afterEach(async () => {
    for await (const table of Object.values(Table)) {
      db.any(`
        DELETE FROM ${table}
      `);
    }
  });

  describe('Insertion to requests', () => {
    const cmd_id = 'launchAcVerification';

    const requestsRow: IRequestsRow = {
      cmd_id,
      cmd_name: 'command',
      ts: Date.now(),
      message: {} as IIn
    };

    it('Should insert request row to requests table', () => {
      db.insertToRequests(requestsRow).then(() => {
        db.one(
          `
          SELECT * FROM ${Table.Requests} WHERE "cmd_id" = '${cmd_id}'
        `
        ).then(result => {
          expect(result).toEqual({
            ...requestsRow,
            ts: expect.any(Date)
          });
        });
      });
    });

    it('Should return null after insertion', () => {
      db.insertToRequests(requestsRow).then(result => {
        expect(result).toBeNull();
      });
    });
  });

  describe('Insertion to treasury requests', () => {
    const treasuryRequestsRow = (id_doc: string): ITreasuryRequestsRow => ({
      id_doc,
      message: {
        header: {
          id_dok: id_doc,
          nr_dok: 'string',
          da_dok: 'string',

          suma: 1,
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
            id_dok: id_doc,
            bbic: 'string',
            biban: 'string'
          }
        ],
        details: [
          {
            id_dok: id_doc,
            suma: 1,
            piban: 'string',
            byear: 2020
          }
        ]
      }
    });

    it('Should insert treasury request row to treasury requests table with ts = null', () => {
      const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce01';

      db.insertToTreasuryRequests(treasuryRequestsRow(id_doc)).then(() => {
        db.one(
          `
          SELECT * FROM ${Table.TreasuryRequests} WHERE "id_doc" = '${id_doc}'
        `
        ).then(result => {
          expect(result).toEqual({
            ...treasuryRequestsRow(id_doc),
            ts: null
          });
        });
      });
    });

    it('Should return null after insertion', () => {
      const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce02';

      db.insertToTreasuryRequests(treasuryRequestsRow(id_doc)).then(result => {
        expect(result).toBeNull();
      });
    });
  });

  describe('Insertion to treasure responses', () => {
    const ts_in = Date.now();
    const responseRow = (id_doc: string): ITreasuryResponsesRow => ({
      id_doc,
      status_code: '3004',
      message: {
        id_dok: id_doc,
        id_hist: 'string',
        status: '3004',
        st_date: 'string',
        reg_nom: 'string',
        reg_date: 'string',
        descr: 'string'
      },
      ts_in
    });

    it('Should insert treasure response row to treasure responses table with ts_commit = null', () => {
      const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce11';

      db.insertToTreasureResponses(responseRow(id_doc)).then(() => {
        db.one(
          `
          SELECT * FROM ${Table.TreasuryResponses} WHERE "id_doc" = '${id_doc}'
        `
        ).then(result => {
          expect(result).toEqual({
            ...responseRow(id_doc),
            ts_in: expect.any(Date),
            ts_commit: null
          });
        });
      });
    });

    it('Should return null after insertion', () => {
      const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce12';

      db.insertToTreasureResponses(responseRow(id_doc)).then(result => {
        expect(result).toBeNull();
      });
    });
  });

  describe('Insertion to responses', () => {
    const cmd_id = 'launchAcVerification';

    const responsesRow = (id_doc: string): IResponsesRow => ({
      id_doc,
      cmd_id,
      cmd_name: 'launchAcVerification',
      message: {} as IOut
    });

    it('Should insert request row to responses table with ts = null', () => {
      const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce21';

      db.insertToResponses(responsesRow(id_doc)).then(() => {
        db.one(
          `
          SELECT * FROM ${Table.Responses} WHERE "id_doc" = '${id_doc}'
        `
        ).then(result => {
          expect(result).toEqual({
            ...responsesRow(id_doc),
            ts: null
          });
        });
      });
    });

    it('Should return null after insertion', () => {
      const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce22';

      db.insertToResponses(responsesRow(id_doc)).then(result => {
        expect(result).toBeNull();
      });
    });
  });

  describe('Getting uncommited contracts', () => {
    const ts_in = Date.now();
    const treasuryResponseRow = (id_doc: string): ITreasuryResponsesRow => ({
      id_doc,
      status_code: '3004',
      message: {
        id_dok: id_doc,
        id_hist: 'string',
        status: '3004',
        st_date: 'string',
        reg_nom: 'string',
        reg_date: 'string',
        descr: 'string'
      },
      ts_in
    });

    describe('When there are no uncommited contracts', () => {
      it('Should return empty array', () => {
        db.getNotCommitteds().then(result => {
          expect(result).toEqual([]);
        });
      });
    });

    describe('When there is one uncommited contract', () => {
      it('Should return array of one uncommited contract', () => {
        const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce31';

        db.insertToTreasureResponses(treasuryResponseRow(id_doc)).then(() => {
          db.getNotCommitteds().then(result => {
            expect(result).toEqual([treasuryResponseRow(id_doc)]);
          });
        });
      });
    });

    describe('When there are more than one contracts', () => {
      const id_doc1 = '0d20d00c-69c6-13e8-adc0-fa7ae02cce31';
      const id_doc2 = '0d20d00c-69c6-13e8-adc0-fa7ae02cce32';

      it('Should return array of two uncommited contracts', () => {
        db.insertToTreasureResponses(treasuryResponseRow(id_doc1)).then(() => {
          db.insertToTreasureResponses(treasuryResponseRow(id_doc2)).then(() => {
            db.getNotCommitteds().then(result => {
              expect(result).toEqual([treasuryResponseRow(id_doc1), treasuryResponseRow(id_doc2)]);
            });
          });
        });
      });

      it('Should not return commited contracts (ts_commit != null)', () => {
        db.insertToTreasureResponses(treasuryResponseRow(id_doc1)).then(() => {
          db.insertToTreasureResponses({
            ...treasuryResponseRow(id_doc2),
            ts_commit: Date.now()
          }).then(() => {
            db.getNotCommitteds().then(result => {
              expect(result).toEqual([treasuryResponseRow(id_doc1)]);
            });
          });
        });
      });
    });
  });

  describe('Getting unregistered contracts', () => {
    const treasuryRequestsRow = (id_doc: string): ITreasuryRequestsRow => ({
      id_doc,
      message: {
        header: {
          id_dok: id_doc,
          nr_dok: 'string',
          da_dok: 'string',

          suma: 1,
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
            id_dok: id_doc,
            bbic: 'string',
            biban: 'string'
          }
        ],
        details: [
          {
            id_dok: id_doc,
            suma: 1,
            piban: 'string',
            byear: 2020
          }
        ]
      }
    });

    describe('When there are no unregistered contracts', () => {
      it('Should return empty array', () => {
        db.getNotRegistereds().then(result => {
          expect(result).toEqual([]);
        });
      });
    });

    describe('When there is one unregistered contract', () => {
      it('Should return array of one unregistered contract', () => {
        const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce41';

        db.insertToTreasuryRequests(treasuryRequestsRow(id_doc)).then(() => {
          db.getNotRegistereds().then(result => {
            expect(result).toEqual([treasuryRequestsRow(id_doc)]);
          });
        });
      });
    });

    describe('When there are more than one contracts', () => {
      const id_doc1 = '0d20d00c-69c6-13e8-adc0-fa7ae02cce41';
      const id_doc2 = '0d20d00c-69c6-13e8-adc0-fa7ae02cce42';

      it('Should return array of two unregistered contracts', () => {
        db.insertToTreasuryRequests(treasuryRequestsRow(id_doc1)).then(() => {
          db.insertToTreasuryRequests(treasuryRequestsRow(id_doc2)).then(() => {
            db.getNotRegistereds().then(result => {
              expect(result).toEqual([treasuryRequestsRow(id_doc1), treasuryRequestsRow(id_doc2)]);
            });
          });
        });
      });

      it('Should not return registered contracts (ts != null)', () => {
        db.insertToTreasuryRequests(treasuryRequestsRow(id_doc1)).then(() => {
          db.insertToTreasuryRequests({
            ...treasuryRequestsRow(id_doc2),
            ts: Date.now()
          }).then(() => {
            db.getNotRegistereds().then(result => {
              expect(result).toEqual([treasuryRequestsRow(id_doc1)]);
            });
          });
        });
      });
    });
  });

  describe('Getting unsent messages', () => {
    const responsesRow = (id_doc: string, cmd_id: TCommandName): IResponsesRow => ({
      id_doc,
      cmd_id,
      cmd_name: 'launchAcVerification',
      message: {} as IOut
    });

    describe('Command id is launchAcVerification', () => {
      const cmd_id = 'launchAcVerification';

      describe('When there are no unsent messages', () => {
        it('Should return empty array', () => {
          db.getNotSentMessages({ launch: true }).then(result => {
            expect(result).toEqual([]);
          });
        });
      });

      describe('When there is one unsent message', () => {
        it('Should return array of one unsent message', () => {
          const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce41';

          db.insertToResponses(responsesRow(id_doc, cmd_id)).then(() => {
            db.getNotSentMessages({ launch: true }).then(result => {
              expect(result).toEqual([responsesRow(id_doc, cmd_id)]);
            });
          });
        });
      });

      describe('When there are more than one unsent messages', () => {
        const id_doc1 = '0d20d00c-69c6-13e8-adc0-fa7ae02cce41';
        const id_doc2 = '0d20d00c-69c6-13e8-adc0-fa7ae02cce42';

        it('Should return array of two unsent messages', () => {
          db.insertToResponses(responsesRow(id_doc1, cmd_id)).then(() => {
            db.insertToResponses(responsesRow(id_doc2, cmd_id)).then(() => {
              db.getNotSentMessages({ launch: true }).then(result => {
                expect(result).toEqual([responsesRow(id_doc1, cmd_id), responsesRow(id_doc2, cmd_id)]);
              });
            });
          });
        });

        it('Should not return sent messages (ts != null)', () => {
          db.insertToResponses(responsesRow(id_doc1, cmd_id)).then(() => {
            db.insertToResponses({
              ...responsesRow(id_doc2, cmd_id),
              ts: Date.now()
            }).then(() => {
              db.getNotSentMessages({ launch: true }).then(result => {
                expect(result).toEqual([responsesRow(id_doc1, cmd_id)]);
              });
            });
          });
        });

        it('Should return only messages with proper command id', () => {
          db.insertToResponses(responsesRow(id_doc1, cmd_id)).then(() => {
            db.insertToResponses(responsesRow(id_doc2, 'treasuryApprovingAc')).then(() => {
              db.getNotSentMessages({ launch: true }).then(result => {
                expect(result).toEqual([responsesRow(id_doc1, cmd_id)]);
              });
            });
          });
        });
      });
    });

    describe('Command id is not launchAcVerification', () => {
      const cmd_id = 'treasuryApprovingAc';

      describe('When there are no unsent messages', () => {
        it('Should return empty array', () => {
          db.getNotSentMessages({ launch: false }).then(result => {
            expect(result).toEqual([]);
          });
        });
      });

      describe('When there is one unsent message', () => {
        it('Should return array of one unsent message', () => {
          const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce41';

          db.insertToResponses(responsesRow(id_doc, cmd_id)).then(() => {
            db.getNotSentMessages({ launch: false }).then(result => {
              expect(result).toEqual([responsesRow(id_doc, cmd_id)]);
            });
          });
        });
      });

      describe('When there are two unsent messages', () => {
        const id_doc1 = '0d20d00c-69c6-13e8-adc0-fa7ae02cce41';
        const id_doc2 = '0d20d00c-69c6-13e8-adc0-fa7ae02cce42';

        it('Should return array of two unsent messages', () => {
          db.insertToResponses(responsesRow(id_doc1, cmd_id)).then(() => {
            db.insertToResponses(responsesRow(id_doc2, cmd_id)).then(() => {
              db.getNotSentMessages({ launch: false }).then(result => {
                expect(result).toEqual([responsesRow(id_doc1, cmd_id), responsesRow(id_doc2, cmd_id)]);
              });
            });
          });
        });

        it('Should not return sent messages (ts != null)', () => {
          db.insertToResponses(responsesRow(id_doc1, cmd_id)).then(() => {
            db.insertToResponses({
              ...responsesRow(id_doc2, cmd_id),
              ts: Date.now()
            }).then(() => {
              db.getNotSentMessages({ launch: false }).then(result => {
                expect(result).toEqual([responsesRow(id_doc1, cmd_id)]);
              });
            });
          });
        });

        it('Should return only messages with proper command id', () => {
          db.insertToResponses(responsesRow(id_doc1, cmd_id)).then(() => {
            db.insertToResponses(responsesRow(id_doc2, 'launchAcVerification')).then(() => {
              db.getNotSentMessages({ launch: false }).then(result => {
                expect(result).toEqual([responsesRow(id_doc1, cmd_id)]);
              });
            });
          });
        });
      });
    });
  });

  describe('Updating row', () => {
    const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce21';
    const cmd_id = 'launchAcVerification';
    const responsesRow: IResponsesRow = {
      id_doc,
      cmd_id,
      cmd_name: 'launchAcVerification',
      message: {} as IOut
    };

    it('Should update given column in a given row', () => {
      db.insertToResponses(responsesRow).then(() => {
        db.updateRow({
          table: Table.Responses,
          contractId: id_doc,
          columns: {
            cmd_name: 'treasuryApprovingAc'
          }
        }).then(result => {
          expect(result).toEqual({
            ...responsesRow,
            cmd_name: 'treasuryApprovingAc'
          });
        });
      });
    });

    it('Should add new column to a given row', () => {
      db.insertToResponses(responsesRow).then(() => {
        db.updateRow({
          table: Table.Responses,
          contractId: id_doc,
          columns: {
            ts: tsToPgTs(Date.now())
          }
        }).then(result => {
          expect(result).toEqual({
            ...responsesRow,
            ts: expect.any(Date)
          });
        });
      });
    });

    it('Should return null if row does not exist', () => {
      db.updateRow({
        table: Table.Responses,
        contractId: '0d20d00c-69c6-13e8-adc0-fa7ae02cce22',
        columns: {
          ts: tsToPgTs(Date.now())
        }
      }).then(result => {
        expect(result).toBeNull();
      });
    });
  });

  describe('Row existance check', () => {
    const cmd_id = 'launchAcVerification';

    const requestsRow: IRequestsRow = {
      cmd_id,
      cmd_name: 'command',
      ts: Date.now(),
      message: {} as IIn
    };

    describe('When row exists', () => {
      it('Should return { exists: true }', () => {
        db.insertToRequests(requestsRow).then(() => {
          db.isExist(Table.Requests, { field: 'cmd_id', value: cmd_id }).then(result => {
            expect(result).toEqual({ exists: true });
          });
        });
      });
    });

    describe('When row does not exist', () => {
      it('Should return { exists: false }', () => {
        db.isExist(Table.Requests, { field: 'cmd_id', value: cmd_id }).then(result => {
          expect(result).toEqual({ exists: true });
        });
      });
    });
  });

  describe('Getting row', () => {
    const id_doc = '0d20d00c-69c6-13e8-adc0-fa7ae02cce21';
    const cmd_id = 'launchAcVerification';
    const responsesRow: IResponsesRow = {
      id_doc,
      cmd_id,
      cmd_name: 'launchAcVerification',
      message: {} as IOut
    };

    describe('When row exists in the table', () => {
      it('Should return response row', () => {
        db.insertToResponses(responsesRow).then(() => {
          db.getRow(Table.Responses, id_doc).then(result => {
            expect(result).toEqual(responsesRow);
          });
        });
      });
    });

    describe('When row does not exist in the table', () => {
      it('Should return null', () => {
        db.getRow(Table.Responses, id_doc).then(result => {
          expect(result).toBeNull();
        });
      });
    });
  });
});
