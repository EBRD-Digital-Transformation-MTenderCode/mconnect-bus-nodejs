import insertToRequests, { TInsertToRequests } from './requestsTable/insertToRequests';
import insertToTreasuryRequests, { TInsertToTreasuryRequests } from './treasuryRequestsTable/insertToTreasuryRequests';
import insertToTreasureResponses, {
  TInsertToTreasureResponses
} from './treasuryResponsesTable/insertToTreasureResponses';
import insertToResponses, { TInsertToResponses } from './responsesTable/insertToResponses';
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
  getNotCommitteds,
  getNotRegistereds,
  getNotSentMessages,
  updateRow,
  isExist,
  getRow
};
