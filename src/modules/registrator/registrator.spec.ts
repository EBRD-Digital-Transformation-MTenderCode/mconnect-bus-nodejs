import logger from '../../lib/logger';
import db from '../../lib/dataBase';
import { OutProducer } from '../../lib/kafka';
import { fetchContractRegister } from '../../api';
import Registrator from './index';
import { registrationSchedulerInterval } from '../../configs';
import { ITreasuryRequestsRow } from '../../types/db';

jest.mock('../../lib/logger');

jest.mock('../../lib/dataBase');

jest.mock('../../lib/kafka');

jest.mock('../../api');

describe('Registrator', () => {
  const interval = 1000 * 60 * registrationSchedulerInterval;
  const registrator = new Registrator(interval);
  
  beforeEach(async () => {
    await registrator.start();
  });
  
  it('Should set provided interval', () => {
    expect(registrator.interval).toEqual(interval);
  });
  
  it('Should log info on start', async () => {
    expect(logger.info).toHaveBeenCalledTimes(1);
  });
  
  describe('registerContracts', () => {
    let notRegistereds: ITreasuryRequestsRow[] | [];
  
    beforeEach(async () => {
      notRegistereds = await db.getNotRegistereds();
    });
    
    it('Should get not registered contracts from db', () => {
      expect(db.getNotRegistereds).toHaveBeenCalled();
    });
    
    describe('getNotRegistereds', () => {
      it('Should not return undefined', async () => {
        expect(notRegistereds).toBeTruthy();
      });
    });
    
    it('Should not iterate if there are no unregistered contracts is database', async () => {
      if (!notRegistereds.length) {
        expect(fetchContractRegister).not.toHaveBeenCalled();
      }
    });
  
    describe('Contract registration flow', () => {
      it('Should verify each contract', async () => {
        expect(fetchContractRegister).toHaveBeenCalledTimes(notRegistereds.length);
      });
  
      it('Should generate out message to kafka with current contract\'s id', () => {
        expect(registrator.generateKafkaMessageOut).toHaveBeenCalledTimes(notRegistereds.length);
        expect(registrator.generateKafkaMessageOut).toReturnWith({
          id: expect.any(String),
          command: 'launchAcVerification',
          data: {
            cpid: expect.any(String),
            ocid: expect.any(String)
          },
          version: '0.0.1'
        });
      });
      
      describe('Contract exsistance in database', () => {
        it('Should check if sent contract exists in database', async () => {
          expect(db.isExist).toHaveBeenCalledTimes(notRegistereds.length);
        });
  
        it('Should insert new row to responses in database if sent contract does not exist there', () => {
          if ((db.isExist as jest.Mock).mockReturnValue({ exists: false })) {
            expect(db.insertToResponses).toHaveBeenCalled();
          }
        });
      });
  
      it('Should add timestamp to registered contract', () => {
        expect(db.updateRow).toHaveBeenCalledWith({
          table: expect.any(String),
          contractId: expect.any(String),
          columns: {
            ts: Date.now()
          }
        });
      });
      
      it('Should log successful registration messages', () => {
        expect(logger.info).toHaveBeenCalledTimes(notRegistereds.length);
      });
      
      it('Should send messages to kafka when done', () => {
        expect(OutProducer.send).toHaveBeenCalledTimes(notRegistereds.length);
      })
    });
  });
});
