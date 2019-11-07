import logger from '../../lib/logger';
import db from '../../lib/dataBase';
import { OutProducer } from '../../lib/kafka';
import { fetchContractRegister } from '../../api';
import { IOut } from '../../types/messages';
import Registrator from './index';
import { dbConfig, registrationSchedulerInterval } from '../../configs';
import { ITreasuryRequestsRow } from '../../types/db';
import v4 = require('uuid/v4');

jest.mock('../../lib/logger');

jest.mock('../../lib/dataBase');

jest.mock('../../lib/kafka');

jest.mock('../../api');

describe('Registrator', () => {
  let registrator: Registrator;
  let interval: number;
  
  beforeEach(async () => {
    interval = 1000 * 60 * registrationSchedulerInterval;
    registrator = new Registrator(interval);
  });
  
  describe('Contract registration', () => {
    describe('No unregistered contracts present', () => {
      beforeEach(async () => {
        db.getNotRegistereds = jest.fn(async () => {
          return [];
        });
        await registrator.start();
      });
      
      it('Should not iterate if there are no unregistered contracts is database', async () => {
        expect(fetchContractRegister).not.toHaveBeenCalled();
      });
    });
  
    describe('Unregistered contracts present', () => {
      let notRegistereds: ITreasuryRequestsRow[] | [];
      let treasuryRequestRow: ITreasuryRequestsRow;
  
      beforeEach(async () => {
        treasuryRequestRow = {
          id_doc: v4(),
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
            benef: [{
              id_dok: 'string',
              bbic: 'string',
              biban: 'string'
            }],
            details: [{
              id_dok: 'string',
              suma: 1488,
              piban: 'string',
              byear: 228
            }]
          }
        };
        
        db.getNotRegistereds = jest.fn(async () => {
          return [treasuryRequestRow];
        });
        
        notRegistereds = await db.getNotRegistereds();
        await registrator.start();
      });
      
      describe('Contract verification', () => {
        it('Should verify each contract', () => {
          expect(fetchContractRegister).toHaveBeenCalledTimes(notRegistereds.length);
        });
  
        it('Should verify each contract with proper message', () => {
          expect(fetchContractRegister).toHaveBeenCalledWith(treasuryRequestRow.message);
        });
      });
      
      describe('Kafka message out generation', () => {
        let messageOut: IOut;
        
        beforeEach(() => {
          const ocid = treasuryRequestRow.id_doc.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/, '');
          const cpid = ocid.replace(/-AC-[0-9]{13}$/, '');
          messageOut = {
            id: expect.any(String),
            command: 'launchAcVerification',
            data: {
              cpid,
              ocid
            },
            version: '0.0.1'
          };
  
          registrator.generateKafkaMessageOut = jest.fn(() => <IOut>messageOut);
        });
        
        it('Should be generate message for each contract', () => {
          expect(registrator.generateKafkaMessageOut).toHaveBeenCalledTimes(notRegistereds.length);
        });
        
        it('Should be called with current contract\'s id', () => {
          expect(registrator.generateKafkaMessageOut).toHaveBeenCalledWith(treasuryRequestRow.id_doc);
        });
  
        it('Should generate out message with current contract\'s id', () => {
          expect(registrator.generateKafkaMessageOut).toReturnWith(messageOut);
        });
      });
      
      describe('Contract exsistance in database check', () => {
        beforeEach(() => {
          db.isExist = jest.fn(async () => {
            return { exists: false };
          });
        });
        
        it('Should check if sent contract exists in database', async () => {
          expect(db.isExist).toHaveBeenCalledTimes(notRegistereds.length);
        });
  
        it('Should insert new row to responses in database if sent contract does not exist there', () => {
          const kafkaMessageOut = registrator.generateKafkaMessageOut(treasuryRequestRow.id_doc);
  
          expect(db.insertToResponses).toHaveBeenCalled();
          expect(db.insertToResponses).toHaveBeenCalledWith({
            id_doc: treasuryRequestRow.id_doc,
            cmd_id: kafkaMessageOut.id,
            cmd_name: kafkaMessageOut.command,
            message: kafkaMessageOut
          });
        });
      });
  
      describe('Finalization', () => {
        it('Should add timestamp to registered contract', () => {
          expect(db.updateRow).toHaveBeenCalledWith({
            table: dbConfig.tables.treasuryRequests,
            contractId: treasuryRequestRow.id_doc,
            columns: {
              ts: expect.any(Date)
            }
          });
        });
  
        it('Should log successful registration messages', () => {
          expect(logger.info).toHaveBeenCalledTimes(notRegistereds.length);
        });
  
        it('Should send messages to kafka when done', () => {
          expect(OutProducer.send).toHaveBeenCalledTimes(notRegistereds.length);
        });
      })
    });
  });
});
