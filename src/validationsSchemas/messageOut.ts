import * as yup from 'yup';

import { patterns } from '../utils';

export const messageOutSchema = yup.object().shape({
  id: yup.string().required(),
  command: yup
    .string()
    .when('data.verification.value', {
      is: val => val === '3004',
      then: yup.string().matches(/treasuryApprovingAc/),
    })
    .when('data.verification.value', {
      is: val => val === '3005',
      then: yup.string().matches(/requestForAcClarification/),
    })
    .when('data.verification.value', {
      is: val => val === '3006',
      then: yup.string().matches(/processAcRejection/),
    })
    .required(),
  data: yup.object().shape({
    cpid: yup
      .string()
      .matches(patterns.cpid)
      .required(),
    ocid: yup
      .string()
      .matches(patterns.ocidContract)
      .required(),
    verification: yup.object().shape({
      value: yup
        .string()
        .oneOf(['3004', '3005', '3006'])
        .required(),
      rationale: yup.string().required(),
    }),
    dateMet: yup
      .string()
      .matches(patterns.date)
      .required(),
    regData: yup.mixed().when('verification.value', {
      is: val => val === '3004',
      then: yup
        .object()
        .shape({
          externalRegId: yup
            .mixed()
            .test({
              test: value => typeof value === 'string',
              message: 'Field "reg_nom" must be a string',
            })
            .required(),
          regDate: yup
            .mixed()
            .test({
              test: value => typeof value === 'string',
              message: 'Field "reg_date" must be a string',
            })
            .required(),
        })
        .required(),
      otherwise: yup.mixed().test({
        test: value => value === undefined,
        message: 'Field "regData" must present only for 3004 status code',
      }),
    }),
  }),
  version: yup.string().required(),
});
