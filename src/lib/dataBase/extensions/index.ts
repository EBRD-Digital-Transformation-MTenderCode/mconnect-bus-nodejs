import insertToRequests, { TInsertToRequests } from './requestsTable/insertToRequests';
import insertToTreasuryRequests, { TInsertToTreasuryRequests } from './treasuryRequestsTable/insertToTreasuryRequests';
import insertToTreasureResponses, {
  TInsertToTreasureResponses
} from './treasuryResponsesTable/insertToTreasureResponses';
import insertToErrors, { TInsertToErrors } from './errorsTable/insertToErrors';
import setTsSend, { TSetTsSend } from './errorsTable/setTsSend';
import getNotSentErrors, { TGetNotSentErrors } from './errorsTable/getNotSentErrors';
import insertToResponses, { TInsertToResponses } from './responsesTable/insertToResponses';
import deleteFromTreasureResponses, {
  TDeleteFromTreasureResponses
} from './treasuryResponsesTable/deleteFromTreasureResponeses';
import getNotCommitteds, { TGetNotCommitteds } from './treasuryResponsesTable/getNotCommitteds';
import getNotRegistereds, { TGetNotRegistereds } from './treasuryRequestsTable/getNotRegistereds';
import getNotSentMessages, { TGtNotSentMessages } from './responsesTable/getNotSentMessages';
import updateRow, { TUpdateRow } from './updateRow';
import isExist, { TIsExist } from './isExist';
import getRow, { TGetRow } from './getRow';

export interface IExtensions {
  insertToRequests: TInsertToRequests;
  insertToTreasuryRequests: TInsertToTreasuryRequests;
  insertToTreasureResponses: TInsertToTreasureResponses;
  insertToResponses: TInsertToResponses;
  insertToErrors: TInsertToErrors;
  getNotSentErrors: TGetNotSentErrors;
  deleteFromTreasureResponses: TDeleteFromTreasureResponses;
  setTsSend: TSetTsSend;
  getNotCommitteds: TGetNotCommitteds;
  getNotRegistereds: TGetNotRegistereds;
  getNotSentMessages: TGtNotSentMessages;
  updateRow: TUpdateRow;
  isExist: TIsExist;
  getRow: TGetRow;
}

export const extentions = {
  insertToRequests,
  insertToTreasuryRequests,
  insertToTreasureResponses,
  insertToResponses,
  insertToErrors,
  getNotSentErrors,
  deleteFromTreasureResponses,
  setTsSend,
  getNotCommitteds,
  getNotRegistereds,
  getNotSentMessages,
  updateRow,
  isExist,
  getRow
};
