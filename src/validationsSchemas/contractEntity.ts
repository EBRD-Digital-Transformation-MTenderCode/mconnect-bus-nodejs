import * as yup from 'yup';

import { patterns } from '../utils';

export const contractEntitySchema = yup
  .object()
  .shape({
    releases: yup
      .array()
      .of(
        yup.object().shape({
          contracts: yup
            .array()
            .of(
              yup.object().shape({
                id: yup
                  .string()
                  .matches(patterns.ocidContract)
                  .required(),
                date: yup
                  .string()
                  .matches(patterns.date)
                  .required(),
                description: yup.string().required(),
                value: yup
                  .object()
                  .shape({
                    amount: yup.number().required(),
                    currency: yup.string().required(),
                  })
                  .required(),
                period: yup
                  .object()
                  .shape({
                    endDate: yup
                      .string()
                      .matches(patterns.date)
                      .required(),
                  })
                  .required(),
                documents: yup
                  .array()
                  .of(
                    yup.object().shape({
                      documentType: yup.string().required(),
                      datePublished: yup
                        .string()
                        .matches(patterns.date)
                        .required(),
                      url: yup
                        .string()
                        .url()
                        .required(),
                    })
                  )
                  .min(1)
                  .required(),
              })
            )
            .min(1)
            .max(1)
            .required(),
          parties: yup
            .array()
            .of(
              yup.object().shape({
                roles: yup
                  .array()
                  .of(yup.string().required())
                  .min(1)
                  .required(),
                additionalIdentifiers: yup.array().of(
                  yup.object().shape({
                    scheme: yup.string().required(),
                    id: yup.string().required(),
                  })
                ),
                details: yup.mixed().when('roles', {
                  is: value => value.includes('supplier'),
                  then: yup
                    .object()
                    .shape({
                      bankAccounts: yup
                        .array()
                        .of(
                          yup.object().shape({
                            identifier: yup
                              .object()
                              .shape({
                                id: yup.string().required(),
                              })
                              .required(),
                            accountIdentification: yup
                              .object()
                              .shape({
                                id: yup.string().required(),
                              })
                              .required(),
                          })
                        )
                        .min(1)
                        .required(),
                    })
                    .required(),
                }),
              })
            )
            .min(1)
            .required(),
          planning: yup
            .object()
            .shape({
              budget: yup
                .object()
                .shape({
                  budgetAllocation: yup
                    .array()
                    .of(
                      yup
                        .object()
                        .shape({
                          budgetBreakdownID: yup.string().required(),
                          period: yup
                            .object()
                            .shape({
                              startDate: yup
                                .string()
                                .matches(patterns.date)
                                .required(),
                            })
                            .required(),
                        })
                        .required()
                    )
                    .min(1)
                    .required(),
                })
                .required(),
              implementation: yup
                .object()
                .shape({
                  transactions: yup
                    .array()
                    .of(
                      yup.object().shape({
                        type: yup.string().required(),
                        value: yup
                          .object()
                          .shape({
                            amount: yup.number().required(),
                          })
                          .required(),
                      })
                    )
                    .min(1)
                    .required(),
                })
                .required(),
            })
            .required(),
          relatedProcesses: yup
            .array()
            .of(
              yup.object().shape({
                relationship: yup.string().required(),
                identifier: yup
                  .string()
                  .matches(patterns.ocidTender)
                  .required(),
              })
            )
            .min(1)
            .required(),
        })
      )
      .min(1)
      .max(1)
      .required(),
  })
  .required();
